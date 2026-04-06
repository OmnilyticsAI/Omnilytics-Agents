import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: `${signal.message}\n\nTimestamp: ${new Date(
        signal.timestamp ?? Date.now(),
      ).toISOString()}`,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const time = new Date(signal.timestamp ?? Date.now()).toISOString()
    console.log(
      `[AlertService][${signal.level.toUpperCase()}] ${signal.title} @ ${time}\n${signal.message}`,
    )
  }

  private validateSignal(signal: AlertSignal): boolean {
    return Boolean(signal.title && signal.message && signal.level)
  }

  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      if (!this.validateSignal(sig)) {
        console.warn("Skipped invalid alert signal:", sig)
        continue
      }
      await this.sendEmail(sig)
      this.logConsole(sig)
    }
  }

  async notify(title: string, message: string, level: AlertSignal["level"] = "info") {
    const signal: AlertSignal = { title, message, level, timestamp: Date.now() }
    await this.dispatch([signal])
  }
}
