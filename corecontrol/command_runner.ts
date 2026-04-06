import { exec } from "child_process"
import { promisify } from "util"
import { existsSync } from "fs"

const execAsync = promisify(exec)

/**
 * Execute a shell command and return stdout or throw on error.
 * Supports optional timeout, working directory, and input validation.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds (default: 30s)
 * @param cwd Optional working directory for the command
 */
export async function execCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string,
): Promise<string> {
  if (!command || typeof command !== "string") {
    throw new Error("Invalid command string")
  }
  if (cwd && !existsSync(cwd)) {
    throw new Error(`Working directory not found: ${cwd}`)
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: timeoutMs, cwd })
    if (stderr && stderr.trim()) {
      // stderr can be warnings; include for visibility
      return `${stdout.trim()}\n[stderr]: ${stderr.trim()}`
    }
    return stdout.trim()
  } catch (error: any) {
    throw new Error(`Command failed (${command}): ${error.message}`)
  }
}

/**
 * Try executing a command and capture the result instead of throwing.
 */
export async function safeExecCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const output = await execCommand(command, timeoutMs, cwd)
    return { success: true, output }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
