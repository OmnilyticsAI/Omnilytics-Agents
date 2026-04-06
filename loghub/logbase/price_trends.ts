export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  duration: number
  points: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5,
  tolerancePct: number = 0,
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    const atEnd = i === points.length - 1
    const nextDir =
      !atEnd && points[i + 1].priceUsd > curr
        ? 1
        : !atEnd && points[i + 1].priceUsd < curr
        ? -1
        : 0

    if (i - segStart >= minSegmentLength && (atEnd || direction !== nextDir)) {
      const start = points[segStart]
      const end = points[i]
      const rawChange = end.priceUsd - start.priceUsd
      const changePct = (rawChange / start.priceUsd) * 100

      let trend: TrendResult["trend"]
      if (Math.abs(changePct) <= tolerancePct) {
        trend = "neutral"
      } else {
        trend = changePct > 0 ? "upward" : "downward"
      }

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend,
        changePct: Math.round(changePct * 100) / 100,
        duration: end.timestamp - start.timestamp,
        points: i - segStart + 1,
      })
      segStart = i
    }
  }
  return results
}

/**
 * Calculate a moving average line for smoothing analysis.
 */
export function movingAverage(points: PricePoint[], windowSize: number): number[] {
  if (windowSize <= 0) throw new Error("windowSize must be positive")
  const averages: number[] = []
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const slice = points.slice(start, i + 1)
    const sum = slice.reduce((acc, p) => acc + p.priceUsd, 0)
    averages.push(sum / slice.length)
  }
  return averages
}
