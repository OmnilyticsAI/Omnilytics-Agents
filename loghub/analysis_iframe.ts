import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  targetOrigin?: string
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private refreshTimer?: number
  private initialized = false

  constructor(private config: IframeConfig) {}

  init(): void {
    if (this.initialized) return
    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "none"
    iframe.referrerPolicy = "no-referrer"
    iframe.onload = () => this.postMetrics()
    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs && this.config.refreshIntervalMs > 0) {
      this.refreshTimer = window.setInterval(
        () => this.postMetrics(),
        this.config.refreshIntervalMs,
      )
    }

    this.initialized = true
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    if (this.iframeEl?.parentNode) {
      this.iframeEl.parentNode.removeChild(this.iframeEl)
    }
    this.iframeEl = null
    this.initialized = false
  }

  updateMetrics(metrics: TokenMetrics): void {
    this.config.metrics = metrics
    this.postMetrics()
  }

  private getTargetOrigin(): string {
    if (this.config.targetOrigin) return this.config.targetOrigin
    try {
      const u = new URL(this.config.srcUrl)
      return u.origin
    } catch {
      return "*"
    }
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    this.iframeEl.contentWindow.postMessage(
      { type: "TOKEN_ANALYSIS_METRICS", payload: this.config.metrics, ts: Date.now() },
      this.getTargetOrigin(),
    )
  }
}
ы