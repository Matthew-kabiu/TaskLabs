import { create } from 'zustand';

type State = {
  // Counter bumped whenever an SSE notification.new arrives — drives the
  // useNotifications query's automatic refetch.
  invalidationKey: number;
  bumpInvalidation: () => void;
};

export const useNotificationStore = create<State>((set) => ({
  invalidationKey: 0,
  bumpInvalidation: () => set((s) => ({ invalidationKey: s.invalidationKey + 1 })),
}));
