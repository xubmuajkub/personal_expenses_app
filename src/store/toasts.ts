import { create } from 'zustand';

export interface ToastEntry {
  id: string;
  title: string;
  actionLabel: string;
  ttlMs: number;
  onAction: () => void | Promise<void>;
}

interface ToastState {
  queue: ToastEntry[];
  push: (entry: ToastEntry) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  queue: [],
  push: (entry) => set((s) => ({ queue: [...s.queue, entry] })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
}));
