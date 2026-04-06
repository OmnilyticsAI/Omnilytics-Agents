import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * - fetch raw pool data
 * - run health / risk analysis on a liquidity pool
 * - check liquidity stability and imbalance
 * - perform extended insights for trading signals
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Validate that all tools are properly registered
 */
export function validateLiquidityTools(tools: Record<string, Toolkit>): string[] {
  return Object.keys(tools).filter(key => typeof tools[key] !== "function")
}

/**
 * List all available liquidity tools with descriptions
 */
export function listLiquidityTools(): { key: string; description: string }[] {
  return [
    {
      key: `liquidityscan-${FETCH_POOL_DATA_KEY}`,
      description: "Retrieve raw liquidity pool data including reserves and token info",
    },
    {
      key: `poolhealth-${ANALYZE_POOL_HEALTH_KEY}`,
      description: "Run a health and risk analysis on liquidity pool structure",
    },
  ]
}

/**
 * Utility to execute a liquidity tool by key
 */
export async function executeLiquidityTool(toolKey: string, ...args: any[]): Promise<any> {
  const tool = LIQUIDITY_ANALYSIS_TOOLS[toolKey]
  if (!tool) {
    throw new Error(`Liquidity tool not found: ${toolKey}`)
  }
  return tool(...args)
}
