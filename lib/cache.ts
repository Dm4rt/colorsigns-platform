// lib/cache.ts
type Entry<T> = { value: T; expiresAt: number };

export class TTLCache<T = unknown> {
  private store = new Map<string, Entry<T>>();
  constructor(private ttlMs: number = 10 * 60 * 1000) {} // default 10 min

  get(key: string): T | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string) {
    return this.get(key) !== null;
  }
}
