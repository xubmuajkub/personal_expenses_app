import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_v1';

interface State {
  completed: boolean;
  load: () => Promise<void>;
  finish: () => Promise<void>;
}

export const useOnboarding = create<State>((set) => ({
  completed: false,
  async load() {
    const v = await AsyncStorage.getItem(KEY);
    set({ completed: v === '1' });
  },
  async finish() {
    await AsyncStorage.setItem(KEY, '1');
    set({ completed: true });
  },
}));
