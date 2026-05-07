import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkListener = (online: boolean) => void;

let lastOnline = false;
const listeners = new Set<NetworkListener>();
let unsub: (() => void) | null = null;

function update(state: NetInfoState) {
  const online = !!(state.isConnected && state.isInternetReachable !== false);
  if (online !== lastOnline) {
    lastOnline = online;
    for (const l of listeners) l(online);
  }
}

export function startNetworkWatcher(): void {
  if (unsub) return;
  NetInfo.fetch().then(update);
  unsub = NetInfo.addEventListener(update);
}

export function stopNetworkWatcher(): void {
  if (unsub) { unsub(); unsub = null; }
}

export function isOnline(): boolean {
  return lastOnline;
}

export function onNetworkChange(l: NetworkListener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
