export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

export const SOLANA_KNOWLEDGE_AGENT_LABEL = "Solana Knowledge Agent"
export const SOLANA_KNOWLEDGE_AGENT_VERSION = "1.0.0"

export interface SolanaKnowledgeAgentMeta {
  id: typeof SOLANA_KNOWLEDGE_AGENT_ID
  label: string
  version: string
  description: string
}

export const SOLANA_KNOWLEDGE_AGENT_META: SolanaKnowledgeAgentMeta = {
  id: SOLANA_KNOWLEDGE_AGENT_ID,
  label: SOLANA_KNOWLEDGE_AGENT_LABEL,
  version: SOLANA_KNOWLEDGE_AGENT_VERSION,
  description:
    "An agent that provides authoritative insights and answers about Solana protocols, tokens, tooling, and ecosystem updates.",
}
