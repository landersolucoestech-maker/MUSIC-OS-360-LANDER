/**
 * shared/lib/local-store.ts
 *
 * Typed, namespaced wrapper around localStorage.
 * All app code must use this instead of raw localStorage calls.
 *
 * Key namespacing (`musicos360:`) prevents collisions with third-party scripts.
 * All reads are try/catch guarded — a corrupted entry is silently dropped.
 *
 * IMPORTANT: Never store JWT tokens, session data, or auth secrets here.
 * Supabase sessions are managed by the SDK (its own key with secure rotation).
 * Use this only for UI state, feature preferences, and draft data.
 */

const NS = 'musicos360:';

function key(name: string): string {
  return name.startsWith(NS) ? name : `${NS}${name}`;
}

export const localStore = {
  get<T>(name: string): T | null {
    try {
      const raw = localStorage.getItem(key(name));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set<T>(name: string, value: T): void {
    try {
      localStorage.setItem(key(name), JSON.stringify(value));
    } catch {
      // Quota exceeded or private-mode restriction — fail silently
    }
  },

  remove(name: string): void {
    try {
      localStorage.removeItem(key(name));
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(NS)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};
