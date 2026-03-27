import { create } from 'zustand';

/** Key format: "churchId::dayOfWeek" (e.g. "debug-notre-dame::0") */
type SubscriptionKey = string;

export function makeSubKey(churchId: string, dayOfWeek: number): SubscriptionKey {
  return `${churchId}::${dayOfWeek}`;
}

interface NotificationStore {
  subscriptions: Set<SubscriptionKey>;
  isSubscribed: (key: SubscriptionKey) => boolean;
  toggle: (key: SubscriptionKey) => void;
}

function loadFromStorage(): Set<SubscriptionKey> {
  try {
    const raw = localStorage.getItem('godsplan:mass-notifications');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveToStorage(subs: Set<SubscriptionKey>) {
  localStorage.setItem('godsplan:mass-notifications', JSON.stringify([...subs]));
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  subscriptions: loadFromStorage(),

  isSubscribed: (key) => get().subscriptions.has(key),

  toggle: (key) => {
    const next = new Set(get().subscriptions);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    saveToStorage(next);
    set({ subscriptions: next });
  },
}));
