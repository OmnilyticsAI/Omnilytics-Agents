import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  token: string
  refreshMs?: number
  /**
   * Optional API base for fetching token data
   * Defaults to iframeUrl if not provided
   */
  apiBase?: string
  /**
   * Optional explicit postMessage target origin
   * Defaults to origin derived from iframeUrl
   */
  targetOrigin?: string
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private refreshTimer?: number
  private initialized = false

  constructor(private cfg: DataIframeConfig) {}

  async init(): Promise<void> {
    if (this.initialized) return
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    const iframe = document.createElement("iframe")
    iframe.src = this.cfg.iframeUrl
    iframe.style.border = "none"
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.referrerPolicy = "no-referrer"
    iframe.onload = () => this.postTokenData().catch(console.error)
    container.appendChild(iframe)
    this.iframe = iframe

    if (this.cfg.refreshMs && this.cfg.refreshMs > 0) {
      // store timer id for cleanup
      this.refreshTimer = window.setInterval(
        () => this.postTokenData().catch(console.error),
        this.cfg.refreshMs,
      )
    }

    this.initialized = true
  }

  async destroy(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = undefined
    this.initialized = false
  }

  private getTargetOrigin(): string {
    if (this.cfg.targetOrigin) return this.cfg.targetOrigin
    try {
      const u = new URL(this.cfg.iframeUrl)
      return u.origin
    } catch {
      return "*" // fallback if URL cannot be parsed
    }
  }

  private async postTokenData(): Promise<void> {
    if (!this.iframe?.contentWindow) return

    const base = this.cfg.apiBase ?? this.cfg.iframeUrl
    const { TokenDataFetcher } = await import("./tokenDataFetcher")
    const fetcher = new TokenDataFetcher(base)

    const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)

    this.iframe.contentWindow.postMessage(
      {
        type: "TOKEN_DATA_UPDATE",
        token: this.cfg.token,
        data,
        ts: Date.now(),
      },
      this.getTargetOrigin(),
    )
  }
}
