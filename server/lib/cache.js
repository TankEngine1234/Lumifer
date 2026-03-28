/**
 * Simple in-memory TTL cache.
 * GEE analysis calls take 3-15s — this avoids redundant computation.
 */
export class Cache {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, ts: Date.now() });
  }

  has(key) {
    return this.get(key) !== undefined;
  }
}
