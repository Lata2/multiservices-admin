/**
 * In-memory mock database. Service modules read & mutate these collections;
 * when `VITE_MOCK_PERSIST` is on, every write is saved to localStorage so demo
 * changes survive a reload. Screens never import this file — only services do.
 */
import { env } from '@/config/env';
import { storage } from '@/lib/storage';
import { createSeed, type SeedData } from './seed';

const KEY = 'servio-console-db-v1';

function load(): SeedData {
  if (env.mockPersist && typeof localStorage !== 'undefined') {
    const saved = storage.get<SeedData | null>(KEY, null);
    if (saved && saved.version === 1) return saved;
  }
  return createSeed();
}

export const db: SeedData = load();

let timer: ReturnType<typeof setTimeout> | undefined;
/** Debounced save after writes. */
export function persistDb() {
  if (!env.mockPersist || typeof localStorage === 'undefined') return;
  clearTimeout(timer);
  timer = setTimeout(() => storage.set(KEY, db), 250);
}

/** Restore the original demo dataset (used by System → Reset demo data). */
export function resetDb() {
  Object.assign(db, createSeed());
  storage.remove(KEY);
}

export type MockDb = SeedData;
