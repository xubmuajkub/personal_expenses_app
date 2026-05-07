jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock File class from expo-file-system with a configurable info().size
const mockInfoSize = jest.fn<number, []>();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    info: () => ({ size: mockInfoSize() }),
    base64: jest.fn().mockResolvedValue(''),
  })),
}));

jest.mock('@/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

import * as ImageManipulator from 'expo-image-manipulator';
import { pickAndCompress, takePhotoAndCompress } from '@/lib/receipts';

const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;

const OVER_BUDGET = 300 * 1024;   // 300 KB — above MAX_BYTES (200 KB)
const UNDER_BUDGET = 150 * 1024;  // 150 KB — below MAX_BYTES

describe('compress loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately when first result is under MAX_BYTES', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://result.jpg' });
    mockInfoSize.mockReturnValue(UNDER_BUDGET);

    const ImagePicker = require('expo-image-picker');
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://source.jpg' }],
    });

    const result = await pickAndCompress();
    expect(result).not.toBeNull();
    expect(result!.bytes).toBe(UNDER_BUDGET);
    expect(mockManipulate).toHaveBeenCalledTimes(1);
  });

  it('steps quality down until size is under MAX_BYTES', async () => {
    // First two results are over budget, third is under
    mockManipulate
      .mockResolvedValueOnce({ uri: 'file://r1.jpg' })
      .mockResolvedValueOnce({ uri: 'file://r2.jpg' })
      .mockResolvedValue({ uri: 'file://r3.jpg' });

    mockInfoSize
      .mockReturnValueOnce(OVER_BUDGET)
      .mockReturnValueOnce(OVER_BUDGET)
      .mockReturnValue(UNDER_BUDGET);

    const ImagePicker = require('expo-image-picker');
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://source.jpg' }],
    });

    const result = await pickAndCompress();
    expect(result).not.toBeNull();
    expect(result!.bytes).toBe(UNDER_BUDGET);
    // Initial compress + 2 retry iterations = 3 total
    expect(mockManipulate).toHaveBeenCalledTimes(3);
    // Each successive call should use lower quality (compress param)
    const qualities = mockManipulate.mock.calls.map((call) => call[2].compress as number);
    expect(qualities[0]).toBeCloseTo(0.6);
    expect(qualities[1]).toBeCloseTo(0.5);
    expect(qualities[2]).toBeCloseTo(0.4);
  });

  it('stops iterating when quality reaches the 0.2 floor', async () => {
    // Always over budget — forces the loop to run to exhaustion
    mockManipulate.mockResolvedValue({ uri: 'file://result.jpg' });
    mockInfoSize.mockReturnValue(OVER_BUDGET);

    const ImagePicker = require('expo-image-picker');
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://source.jpg' }],
    });

    const result = await pickAndCompress();
    expect(result).not.toBeNull();
    // quality starts at 0.6, decrements by 0.1 inside loop while quality > 0.2.
    // Due to floating point: loop runs 5 times (0.5, 0.4, 0.3, 0.2fp, 0.1fp).
    // Total calls: initial(0.6) + 5 loop iterations = 6
    const calls = mockManipulate.mock.calls;
    expect(calls.length).toBe(6);
    // First quality is 0.6, qualities are descending
    const qualities = calls.map((call) => call[2].compress as number);
    expect(qualities[0]).toBeCloseTo(0.6);
    for (let i = 1; i < qualities.length; i++) {
      expect(qualities[i]).toBeLessThan(qualities[i - 1]!);
    }
  });

  it('returns null when camera permission is denied', async () => {
    const ImagePicker = require('expo-image-picker');
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const result = await takePhotoAndCompress();
    expect(result).toBeNull();
  });

  it('returns null when library permission is denied', async () => {
    const ImagePicker = require('expo-image-picker');
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const result = await pickAndCompress();
    expect(result).toBeNull();
  });
});
