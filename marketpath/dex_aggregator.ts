export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  lastUpdated?: number
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
  retries?: number
}

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  private async fetchFromApi<T>(
    api: { name: string; baseUrl: string; apiKey?: string },
    path: string,
  ): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10000)
    try {
      const res = await fetch(`${api.baseUrl}${path}`, {
        headers: api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {},
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} ${res.status}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  private async safeFetch<T>(api: { name: string; baseUrl: string; apiKey?: string }, path: string): Promise<T | null> {
    const retries = this.config.retries ?? 1
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.fetchFromApi<T>(api, path)
      } catch {
        if (attempt === retries) return null
      }
    }
    return null
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const results: PairInfo[] = []
    const tasks = this.config.apis.map(async api => {
      const data = await this.safeFetch<any>(api, `/pair/${pairAddress}`)
      if (data) {
        results.push({
          exchange: api.name,
          pairAddress,
          baseSymbol: data.token0?.symbol ?? "UNKNOWN",
          quoteSymbol: data.token1?.symbol ?? "UNKNOWN",
          liquidityUsd: Number(data.liquidityUsd ?? 0),
          volume24hUsd: Number(data.volume24hUsd ?? 0),
          priceUsd: Number(data.priceUsd ?? 0),
          lastUpdated: Date.now(),
        })
      }
    })
    await Promise.all(tasks)
    return results
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   */
  async comparePairs(
    pairs: string[],
  ): Promise<Record<string, { bestVolume: PairInfo | null; bestLiquidity: PairInfo | null }>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        if (infos.length === 0) return [addr, { bestVolume: null, bestLiquidity: null }] as const
        const bestVolume = infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a), infos[0])
        const bestLiquidity = infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a), infos[0])
        return [addr, { bestVolume, bestLiquidity }] as const
      }),
    )
    return Object.fromEntries(entries)
  }

  /**
   * Get the best price for a pair across all APIs
   */
  async getBestPrice(pairAddress: string): Promise<PairInfo | null> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length === 0) return null
    return infos.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a), infos[0])
  }

  /**
   * Summarize all data for a pair into a compact object
   */
  async summarizePair(pairAddress: string): Promise<{
    address: string
    bestVolume?: PairInfo
    bestLiquidity?: PairInfo
    bestPrice?: PairInfo
  }> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length === 0) return { address: pairAddress }
    return {
      address: pairAddress,
      bestVolume: infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a), infos[0]),
      bestLiquidity: infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a), infos[0]),
      bestPrice: infos.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a), infos[0]),
    }
  }
}
