import type { Signal } from "./SignalApiClient"

/**
 * Processes raw signals into actionable events.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(s => s.type === type && s.timestamp > sinceTimestamp)
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    return `[${time}] ${signal.type.toUpperCase()}: ${JSON.stringify(signal.payload)}`
  }

  /**
   * Group signals by type and return as a dictionary.
   */
  groupByType(signals: Signal[]): Record<string, Signal[]> {
    return signals.reduce((acc, s) => {
      if (!acc[s.type]) acc[s.type] = []
      acc[s.type].push(s)
      return acc
    }, {} as Record<string, Signal[]>)
  }

  /**
   * Find the most recent signal of a given type.
   */
  latestOfType(signals: Signal[], type: string): Signal | null {
    const filtered = signals.filter(s => s.type === type)
    if (filtered.length === 0) return null
    return filtered.reduce((latest, s) =>
      s.timestamp > latest.timestamp ? s : latest,
    )
  }

  /**
   * Compute average timestamp delay for signals.
   */
  averageDelay(signals: Signal[]): number {
    if (signals.length < 2) return 0
    const sorted = [...signals].sort((a, b) => a.timestamp - b.timestamp)
    let total = 0
    for (let i = 1; i < sorted.length; i++) {
      total += sorted[i].timestamp - sorted[i - 1].timestamp
    }
    return total / (sorted.length - 1)
  }

  /**
   * Normalize payload values for logging or analytics.
   */
  flattenPayload(signal: Signal): Record<string, string> {
    const flat: Record<string, string> = {}
    for (const [key, value] of Object.entries(signal.payload)) {
      flat[key] = typeof value === "object" ? JSON.stringify(value) : String(value)
    }
    return flat
  }
}
