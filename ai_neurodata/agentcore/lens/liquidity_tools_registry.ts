import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended liquidity tools:
 * - fetch pool data
 * - analyze pool health
 * - provide additional utility functions
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Verify registered liquidity tools and return invalid entries if any
 */
export function verifyLiquidityTools(tools: Record<string, Toolkit>): string[] {
  return Object.keys(tools).filter(key => typeof tools[key] !== "function")
}

/**
 * Return metadata for all liquidity tools
 */
export function getLiquidityToolMetadata(): { id: string; description: string }[] {
  return [
    {
      id: `liquidityscan-${FETCH_POOL_DATA_KEY}`,
      description: "Fetch detailed pool reserves, token balances, and liquidity parameters",
    },
    {
      id: `poolhealth-${ANALYZE_POOL_HEALTH_KEY}`,
      description: "Evaluate risk levels and health metrics for a given liquidity pool",
    },
  ]
}

/**
 * Dynamically execute a tool by its key
 */
export async function runLiquidityTool(toolKey: string, ...args: any[]): Promise<any> {
  const tool = EXTENDED_LIQUIDITY_TOOLS[toolKey]
  if (!tool) {
    throw new Error(`Unknown liquidity tool: ${toolKey}`)
  }
  return tool(...args)
}
