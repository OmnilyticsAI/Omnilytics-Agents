import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/**
 * Processes a Typeform webhook payload to schedule a new task.
 * - Validates payload with TaskFormSchema
 * - Sanitizes task name
 * - Performs minimal CRON validation
 * - Returns a deterministic task id (no randomness)
 */

export interface HandleResult {
  success: boolean
  message: string
  taskId?: string
  payload?: {
    name: string
    type: string
    parameters: Record<string, unknown>
    scheduleCron: string
  }
}

/** Collect Zod error messages into a single string */
function formatZodErrors(err: unknown): string {
  try {
    // @ts-expect-error zod error shape
    const issues = err?.issues as Array<{ message: string }>
    return issues?.map(i => i.message).join("; ") || "Invalid payload"
  } catch {
    return "Invalid payload"
  }
}

/** Deterministic, stable id based on task fields (no randomness) */
function computeDeterministicId(input: string): string {
  // djb2 hash
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + char
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }
  return `task_${Math.abs(hash)}`
}

/** Minimal cron sanity check: five fields separated by spaces */
function isValidCron(expr: string): boolean {
  if (typeof expr !== "string") return false
  const parts = expr.trim().split(/\s+/)
  return parts.length === 5 && parts.every(p => p.length > 0)
}

/** Normalize task name for IDs and logs */
function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 120)
}

export async function handleTypeformSubmission(raw: unknown): Promise<HandleResult> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: `Validation error: ${formatZodErrors(parsed.error)}` }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  const normalizedName = sanitizeName(taskName)
  if (!isValidCron(scheduleCron)) {
    return { success: false, message: `Invalid CRON expression: "${scheduleCron}"` }
  }

  // Build deterministic ID from core fields
  const idBase = JSON.stringify({
    name: normalizedName,
    type: taskType,
    params: parameters ?? {},
    cron: scheduleCron,
  })
  const taskId = computeDeterministicId(idBase)

  // Here you would actually schedule the task with your scheduler service
  // For example:
  // await scheduler.create({ id: taskId, name: normalizedName, type: taskType, parameters, cron: scheduleCron })

  return {
    success: true,
    message: `Task "${normalizedName}" scheduled with ID ${taskId}`,
    taskId,
    payload: {
      name: normalizedName,
      type: taskType,
      parameters: parameters ?? {},
      scheduleCron,
    },
  }
}
