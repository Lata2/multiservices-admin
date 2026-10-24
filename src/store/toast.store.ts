import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let next = 1;
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = next++;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.tone === 'error' ? 6000 : 3800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ tone: 'success', title, description }),
  error: (title: string, description?: string) => useToastStore.getState().push({ tone: 'error', title, description }),
  info: (title: string, description?: string) => useToastStore.getState().push({ tone: 'info', title, description }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ tone: 'warning', title, description }),
};
