jest.mock('@react-native-community/netinfo', () => {
  let cb: ((s: any) => void) | null = null;
  return {
    fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
    addEventListener: jest.fn((handler: any) => {
      cb = handler;
      return () => { cb = null; };
    }),
    __setState: (s: any) => cb && cb(s),
  };
});

import * as NetInfo from '@react-native-community/netinfo';
import { startNetworkWatcher, onNetworkChange, stopNetworkWatcher } from '@/sync/network';

describe('network', () => {
  it('fires when transitioning offline → online', async () => {
    const seen: boolean[] = [];
    const off = onNetworkChange((o) => seen.push(o));
    startNetworkWatcher();
    await Promise.resolve();
    (NetInfo as any).__setState({ isConnected: true, isInternetReachable: true });
    expect(seen).toContain(true);
    off();
    stopNetworkWatcher();
  });
});
