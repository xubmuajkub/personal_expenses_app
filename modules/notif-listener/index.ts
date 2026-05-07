import { requireNativeModule } from 'expo-modules-core';
import { Platform, NativeEventEmitter } from 'react-native';

interface NotifPayload {
  package: string;
  title: string;
  text: string;
  postedAt: number;
  key: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const native: any = Platform.OS === 'android' ? requireNativeModule('NotifListener') : null;
const emitter = native ? new NativeEventEmitter(native) : null;

export function isPermissionGranted(): boolean {
  return Platform.OS === 'android' ? !!(native?.isPermissionGranted() as boolean) : false;
}

export function openSettings(): void {
  if (Platform.OS === 'android') native?.openSettings();
}

export function addNotifListener(fn: (p: NotifPayload) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('onNotification', (e: { payload: string }) => {
    try { fn(JSON.parse(e.payload) as NotifPayload); } catch { /* ignore malformed */ }
  });
  return () => sub.remove();
}

export function addStateListener(fn: (active: boolean) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('onState', (e: { active: boolean }) => fn(e.active));
  return () => sub.remove();
}
