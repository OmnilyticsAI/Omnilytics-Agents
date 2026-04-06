export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canAnalyzeWallets: boolean
  canTrackWhales: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  allowAsyncExecution: boolean
  strictSchemaValidation: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canAnalyzeWallets: true,
  canTrackWhales: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  allowAsyncExecution: true,
  strictSchemaValidation: true,
}

/**
 * Utility: validate that a given object conforms to AgentCapabilities
 */
export function validateCapabilities(obj: Partial<AgentCapabilities>): boolean {
  return (
    typeof obj.canAnswerProtocolQuestions === "boolean" &&
    typeof obj.canAnswerTokenQuestions === "boolean" &&
    typeof obj.canDescribeTooling === "boolean" &&
    typeof obj.canReportEcosystemNews === "boolean"
  )
}

/**
 * List supported agent features for documentation or UI display
 */
export function listAgentCapabilities(): string[] {
  return [
    "Protocol Q&A",
    "Token Q&A",
    "Tooling descriptions",
    "Ecosystem news",
    "Wallet analysis",
    "Whale tracking",
  ]
}

/**
 * Check if strict execution mode is enabled
 */
export function isStrictExecution(flags: AgentFlags): boolean {
  return flags.requiresExactInvocation && flags.strictSchemaValidation
}
