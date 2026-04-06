export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number
  retries?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  status?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  private async requestWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs: number = 15_000,
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, timeoutMs, retries } = this.config
    const maxRetries = retries ?? 1

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.requestWithTimeout(
          deployEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({ contractName, parameters }),
          },
          timeoutMs ?? 15_000,
        )

        if (!res.ok) {
          const text = await res.text()
          if (attempt === maxRetries) {
            return { success: false, error: `HTTP ${res.status}: ${text}`, status: res.status }
          }
          continue
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          status: res.status,
        }
      } catch (err: any) {
        if (attempt === maxRetries) {
          return { success: false, error: err.message }
        }
      }
    }

    return { success: false, error: "Deployment failed after retries" }
  }

  async dryRun(): Promise<LaunchResult> {
    try {
      return {
        success: true,
        address: "0x0000000000000000000000000000000000000000",
        transactionHash: "0xDRYRUN",
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
