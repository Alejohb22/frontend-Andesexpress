export interface RecentOrder {
  id: string;
  savedAt: string;
  route: string;
}

const STORAGE_KEY = 'andesexpress.recent-orders';
const MAX_ENTRIES = 8;

function isRecentOrder(value: unknown): value is RecentOrder {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string' && typeof entry.savedAt === 'string' && typeof entry.route === 'string';
}

/** Browser-only convenience: storage can be missing or blocked, so it never throws. */
export function readRecentOrders(): RecentOrder[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecentOrder).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(entry: RecentOrder): void {
  try {
    const next = [entry, ...readRecentOrders().filter((r) => r.id !== entry.id)].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Nothing to do: the list is only a shortcut.
  }
}
