import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_v1';

interface State {
  completed: boolean;
  loading: boolean;
  load: () => Promise<void>;
  finish: () => Promise<void>;
}

export const useOnboarding = create<State>((set) => ({
  completed: false,
  loading: true,
  async load() {
    const v = await AsyncStorage.getItem(KEY);
    set({ completed: v === '1', loading: false });
  },
  async finish() {
    await AsyncStorage.setItem(KEY, '1');
    set({ completed: true });
  },
}));
