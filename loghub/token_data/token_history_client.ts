export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export interface TokenMeta {
  symbol: string
  name?: string
  decimals?: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}: ${res.status}`)
    const raw = (await res.json()) as any[]
    return raw.map(r => ({
      timestamp: Number(r.time) * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
    }))
  }

  /**
   * Fetch latest data point for a given symbol
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    if (history.length === 0) return null
    return history[history.length - 1]
  }

  /**
   * Fetch token metadata (symbol, name, decimals)
   * Expects endpoint: `${apiBase}/tokens/${symbol}/meta`
   */
  async fetchMeta(symbol: string): Promise<TokenMeta | null> {
    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/meta`
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as TokenMeta
  }

  /**
   * Calculate average price over a given time window
   */
  async fetchAveragePrice(symbol: string, since: number): Promise<number> {
    const history = await this.fetchHistory(symbol)
    const filtered = history.filter(p => p.timestamp >= since)
    if (filtered.length === 0) return 0
    const sum = filtered.reduce((acc, p) => acc + p.priceUsd, 0)
    return sum / filtered.length
  }

  /**
   * Fetch volume trend (growth or decline) over a given period
   */
  async fetchVolumeTrend(symbol: string, since: number): Promise<"up" | "down" | "flat"> {
    const history = await this.fetchHistory(symbol)
    const filtered = history.filter(p => p.timestamp >= since)
    if (filtered.length < 2) return "flat"
    const first = filtered[0].volumeUsd
    const last = filtered[filtered.length - 1].volumeUsd
    if (last > first) return "up"
    if (last < first) return "down"
    return "flat"
  }
}
