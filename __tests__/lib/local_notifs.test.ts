jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as Notifications from 'expo-notifications';
import {
  ensureNotifPermission,
  scheduleDailyNudge,
  cancelDailyNudge,
  fireBudgetAlert,
} from '@/lib/local_notifs';

const mockGet = Notifications.getPermissionsAsync as jest.Mock;
const mockRequest = Notifications.requestPermissionsAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCancel.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('daily-nudge');
});

describe('ensureNotifPermission', () => {
  it('returns true if already granted', async () => {
    mockGet.mockResolvedValue({ granted: true });
    const result = await ensureNotifPermission();
    expect(result).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('requests permission if not granted and returns true on grant', async () => {
    mockGet.mockResolvedValue({ granted: false });
    mockRequest.mockResolvedValue({ granted: true });
    const result = await ensureNotifPermission();
    expect(result).toBe(true);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('returns false if permission is denied', async () => {
    mockGet.mockResolvedValue({ granted: false });
    mockRequest.mockResolvedValue({ granted: false });
    const result = await ensureNotifPermission();
    expect(result).toBe(false);
  });
});

describe('scheduleDailyNudge', () => {
  it('throws if permission denied', async () => {
    mockGet.mockResolvedValue({ granted: false });
    mockRequest.mockResolvedValue({ granted: false });
    await expect(scheduleDailyNudge()).rejects.toThrow('notification permission denied');
  });

  it('cancels prior daily-nudge before scheduling', async () => {
    mockGet.mockResolvedValue({ granted: true });
    await scheduleDailyNudge();
    expect(mockCancel).toHaveBeenCalledWith('daily-nudge');
  });

  it('schedules with default hour=20 minute=0 repeating trigger', async () => {
    mockGet.mockResolvedValue({ granted: true });
    await scheduleDailyNudge();
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'daily-nudge',
        trigger: expect.objectContaining({ hour: 20, minute: 0, repeats: true }),
      }),
    );
  });

  it('respects custom hour and minute', async () => {
    mockGet.mockResolvedValue({ granted: true });
    await scheduleDailyNudge(8, 30);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ hour: 8, minute: 30, repeats: true }),
      }),
    );
  });

  it('returns the notification identifier', async () => {
    mockGet.mockResolvedValue({ granted: true });
    mockSchedule.mockResolvedValue('daily-nudge');
    const id = await scheduleDailyNudge();
    expect(id).toBe('daily-nudge');
  });
});

describe('cancelDailyNudge', () => {
  it('cancels the daily-nudge notification', async () => {
    await cancelDailyNudge();
    expect(mockCancel).toHaveBeenCalledWith('daily-nudge');
  });

  it('does not throw if cancel fails', async () => {
    mockCancel.mockRejectedValue(new Error('not found'));
    await expect(cancelDailyNudge()).resolves.toBeUndefined();
  });
});

describe('fireBudgetAlert', () => {
  it('does nothing if permission denied', async () => {
    mockGet.mockResolvedValue({ granted: false });
    mockRequest.mockResolvedValue({ granted: false });
    await fireBudgetAlert({ category_name: 'Food', threshold: 80, spend: '80 LAK', limit: '100 LAK' });
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('fires immediate notification for 80% threshold', async () => {
    mockGet.mockResolvedValue({ granted: true });
    await fireBudgetAlert({ category_name: 'Food', threshold: 80, spend: '80 LAK', limit: '100 LAK' });
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Food 80%', body: '80 LAK of 100 LAK' }),
        trigger: null,
      }),
    );
  });

  it('fires "budget exceeded" notification for 100% threshold', async () => {
    mockGet.mockResolvedValue({ granted: true });
    await fireBudgetAlert({ category_name: 'Food', threshold: 100, spend: '120 LAK', limit: '100 LAK' });
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Food budget exceeded' }),
      }),
    );
  });
});
