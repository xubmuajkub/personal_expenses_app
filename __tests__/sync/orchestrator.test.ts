/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@/sync/network', () => ({
  startNetworkWatcher: jest.fn(),
  onNetworkChange: jest.fn(),
  isOnline: () => true,
}));
jest.mock('@/sync/realtime', () => ({
  startRealtime: jest.fn(),
  stopRealtime: jest.fn(),
}));
jest.mock('@/domain/budgets', () => ({
  monthBudgetStatuses: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/local_notifs', () => ({
  setNotificationHandler: jest.fn(),
  fireBudgetAlert: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/domain/money', () => ({
  format: jest.fn((micro: number, c: string) => `${micro} ${c}`),
}));

const mockFlushSpy = jest.fn().mockResolvedValue({ flushed: 0, deferred: 0, dropped: 0 });
const mockPullAllSpy = jest.fn().mockResolvedValue(0);

jest.mock('@/sync/outbox', () => ({ flushOutbox: (...a: any[]) => mockFlushSpy(...a) }));
jest.mock('@/sync/pull', () => ({
  pullAll: (...a: any[]) => mockPullAllSpy(...a),
  SYNCED_TABLES: [],
  pullTable: jest.fn(),
}));

import { cycle } from '@/sync/index';

describe('sync orchestrator', () => {
  it('flushes then pulls', async () => {
    const deps = { db: {} as any, sb: {} as any, userId: 'u1' };
    await cycle(deps);
    expect(mockFlushSpy).toHaveBeenCalledTimes(1);
    expect(mockPullAllSpy).toHaveBeenCalledTimes(1);
  });

  it('pulls + reflushes on deferred', async () => {
    mockFlushSpy.mockClear(); mockPullAllSpy.mockClear();
    mockFlushSpy
      .mockResolvedValueOnce({ flushed: 0, deferred: 1, dropped: 0 })
      .mockResolvedValueOnce({ flushed: 1, deferred: 0, dropped: 0 });
    const deps = { db: {} as any, sb: {} as any, userId: 'u1' };
    await cycle(deps);
    expect(mockFlushSpy).toHaveBeenCalledTimes(2);
    expect(mockPullAllSpy).toHaveBeenCalledTimes(2);
  });
});
