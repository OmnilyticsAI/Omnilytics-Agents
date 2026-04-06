export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  zScore?: number
  baselineAvg?: number
  baselineStd?: number
}

/**
 * Compute rolling mean and std using a fixed-size window
 */
function rollingStats(values: number[], windowSize: number): Array<{ avg: number; std: number }> {
  const out: Array<{ avg: number; std: number }> = []
  if (windowSize <= 1) return out

  let sum = 0
  let sumSq = 0

  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    sum += v
    sumSq += v * v

    if (i >= windowSize) {
      const old = values[i - windowSize]
      sum -= old
      sumSq -= old * old
    }

    if (i >= windowSize) {
      const n = windowSize
      const avg = sum / n
      const variance = Math.max(sumSq / n - avg * avg, 0)
      const std = Math.sqrt(variance)
      out.push({ avg, std })
    }
  }
  return out
}

/**
 * Detects spikes in trading volume compared to a rolling average window
 * Returns events where the current volume exceeds (avg * spikeThreshold)
 * Also includes z-score metadata for additional downstream filtering
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0,
): SpikeEvent[] {
  if (!Array.isArray(points) || points.length === 0) return []
  if (windowSize < 2 || windowSize >= points.length) return []

  const volumes = points.map(p => p.volumeUsd)
  const stats = rollingStats(volumes, windowSize)
  const events: SpikeEvent[] = []

  // stats[i - windowSize] corresponds to window ending at index i - 1 and sized windowSize
  for (let i = windowSize; i < volumes.length; i++) {
    const curr = volumes[i]
    const { avg, std } = stats[i - windowSize]
    const ratio = avg > 0 ? curr / avg : Infinity
    const z = std > 0 ? (curr - avg) / std : Infinity

    if (ratio >= spikeThreshold) {
      events.push({
        timestamp: points[i].timestamp,
        volume: curr,
        spikeRatio: Math.round(ratio * 100) / 100,
        zScore: Number.isFinite(z) ? Math.round(z * 100) / 100 : undefined,
        baselineAvg: Math.round(avg * 100) / 100,
        baselineStd: Number.isFinite(std) ? Math.round(std * 100) / 100 : undefined,
      })
    }
  }

  return events
}

/**
 * Convenience: filter spikes by a minimum z-score (keeps original ratio logic)
 */
export function filterSpikesByZScore(events: SpikeEvent[], minZScore: number): SpikeEvent[] {
  if (!Number.isFinite(minZScore)) return events
  return events.filter(e => (e.zScore ?? -Infinity) >= minZScore)
}
