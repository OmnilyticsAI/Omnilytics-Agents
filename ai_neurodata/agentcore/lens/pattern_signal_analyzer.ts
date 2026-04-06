import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Options & Errors
 *----------------------------------------------------*/

export interface DetectorOptions {
  timeoutMs?: number
  retries?: number
  minConfidence?: number
  dedupeWindowMs?: number
}

export class FetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "FetchError"
  }
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly minConfidence: number
  private readonly dedupeWindowMs: number

  constructor(private readonly apiUrl: string, options: DetectorOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.retries = options.retries ?? 2
    this.minConfidence = options.minConfidence ?? 0
    this.dedupeWindowMs = options.dedupeWindowMs ?? 0
  }

  /* Fetch recent OHLC candles with retry and proper timeout */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const url = `${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`
    let attempt = 0
    let lastErr: unknown = null

    while (attempt <= this.retries) {
      const controller = new AbortController()
      const to = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(to)
        if (!res.ok) {
          throw new FetchError(`Failed to fetch candles ${res.status}: ${res.statusText}`, res.status)
        }
        const data = (await res.json()) as Candle[]
        const cleaned = this.normalizeCandles(data)
        if (!cleaned.length) throw new Error("Empty or invalid candles response")
        return cleaned
      } catch (err) {
        clearTimeout(to)
        lastErr = err
        attempt += 1
        if (attempt > this.retries) break
        // fixed backoff without randomness
        await this.delay(250 * attempt)
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Unknown error while fetching candles")
  }

  /* Public API: analyze latest candles and return pattern signals */
  analyzeSeries(candles: Candle[]): PatternSignal[] {
    const series = this.normalizeCandles(candles)
    if (series.length === 0) return []

    const signals: PatternSignal[] = []
    for (let i = 0; i < series.length; i++) {
      const c = series[i]
      // single-candle patterns
      this.pushIfAboveThreshold(signals, c.timestamp, "Hammer", this.isHammer(c))
      this.pushIfAboveThreshold(signals, c.timestamp, "ShootingStar", this.isShootingStar(c))
      this.pushIfAboveThreshold(signals, c.timestamp, "Doji", this.isDoji(c))

      // two-candle patterns
      if (i > 0) {
        const prev = series[i - 1]
        this.pushIfAboveThreshold(
          signals,
          c.timestamp,
          "BullishEngulfing",
          this.isBullishEngulfing(prev, c),
        )
        this.pushIfAboveThreshold(
          signals,
          c.timestamp,
          "BearishEngulfing",
          this.isBearishEngulfing(prev, c),
        )
      }
    }

    const deduped = this.dedupeWindowMs > 0 ? this.dedupeSignals(signals, this.dedupeWindowMs) : signals
    return deduped.sort((a, b) => a.timestamp - b.timestamp)
  }

  /* Convenience: fetch + analyze for a symbol */
  async analyzeSymbol(symbol: string, limit = 100): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    return this.analyzeSeries(candles)
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const total = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    if (total <= 0) return 0
    const bodyShare = body / total
    const ratio = body > 0 ? lowerWick / body : 0
    if (ratio > 2 && bodyShare < 0.3) {
      // weight higher when body is small relative to range
      const scale = this.clamp(1 - bodyShare / 0.3, 0.6, 1)
      return this.clamp((ratio / 3) * scale, 0, 1)
    }
    return 0
  }

  private isShootingStar(c: Candle): number {
    const total = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    if (total <= 0) return 0
    const bodyShare = body / total
    const ratio = body > 0 ? upperWick / body : 0
    if (ratio > 2 && bodyShare < 0.3) {
      const scale = this.clamp(1 - bodyShare / 0.3, 0.6, 1)
      return this.clamp((ratio / 3) * scale, 0, 1)
    }
    return 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const sizeRatio = bodyPrev > 0 ? bodyCurr / bodyPrev : 2
    // bonus if current close is near the high
    const closeStrength = this.safeDivide(curr.close - curr.open, curr.high - curr.low)
    const blend = 0.8 * this.clamp(sizeRatio, 0, 1) + 0.2 * this.clamp(closeStrength, 0, 1)
    return this.clamp(blend, 0, 1)
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const sizeRatio = bodyPrev > 0 ? bodyCurr / bodyPrev : 2
    const closeStrength = this.safeDivide(curr.open - curr.close, curr.high - curr.low)
    const blend = 0.8 * this.clamp(sizeRatio, 0, 1) + 0.2 * this.clamp(closeStrength, 0, 1)
    return this.clamp(blend, 0, 1)
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    if (range <= 0) return 0
    const ratio = body / range
    return ratio < 0.1 ? this.clamp(1 - ratio * 10, 0, 1) : 0
  }

  /* ------------------------- Utilities ---------------------------- */

  private pushIfAboveThreshold(
    acc: PatternSignal[],
    timestamp: number,
    pattern: CandlestickPattern,
    confidence: number,
  ) {
    if (confidence >= this.minConfidence) {
      acc.push({ timestamp, pattern, confidence: this.clamp(confidence, 0, 1) })
    }
  }

  private normalizeCandles(candles: Candle[]): Candle[] {
    const valid = candles.filter(this.isValidCandle)
    return valid.sort((a, b) => a.timestamp - b.timestamp)
  }

  private isValidCandle(c: Candle): boolean {
    if (
      typeof c.timestamp !== "number" ||
      typeof c.open !== "number" ||
      typeof c.high !== "number" ||
      typeof c.low !== "number" ||
      typeof c.close !== "number"
    ) {
      return false
    }
    if (!(c.low <= c.open && c.low <= c.close && c.high >= c.open && c.high >= c.close)) {
      // basic range validation
      return false
    }
    return Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close)
  }

  private dedupeSignals(signals: PatternSignal[], windowMs: number): PatternSignal[] {
    const byPattern = new Map<CandlestickPattern, PatternSignal[]>()
    for (const s of signals) {
      if (!byPattern.has(s.pattern)) byPattern.set(s.pattern, [])
      byPattern.get(s.pattern)!.push(s)
    }

    const result: PatternSignal[] = []
    for (const [pattern, list] of byPattern) {
      const sorted = list.sort((a, b) => a.timestamp - b.timestamp)
      let lastKept: PatternSignal | null = null
      for (const s of sorted) {
        if (!lastKept || s.timestamp - lastKept.timestamp > windowMs) {
          result.push(s)
          lastKept = s
        } else if (s.confidence > lastKept.confidence) {
          // replace weaker within window
          result[result.length - 1] = s
          lastKept = s
        }
      }
    }
    return result.sort((a, b) => a.timestamp - b.timestamp)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x))
  }

  private safeDivide(num: number, den: number): number {
    return den === 0 ? 0 : num / den
  }
}
