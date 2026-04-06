export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number): void {
    this.cache.set(key, { key, value, updatedAt: Date.now() })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }

  getOrDefault(key: string, defaultValue = 0): number {
    return this.cache.get(key)?.value ?? defaultValue
  }

  pruneOlderThan(maxAgeMs: number): void {
    const now = Date.now()
    for (const [k, entry] of this.cache.entries()) {
      if (now - entry.updatedAt > maxAgeMs) {
        this.cache.delete(k)
      }
    }
  }

  updateIfNewer(key: string, value: number, timestamp: number): void {
    const existing = this.cache.get(key)
    if (!existing || timestamp > existing.updatedAt) {
      this.cache.set(key, { key, value, updatedAt: timestamp })
    }
  }
}
