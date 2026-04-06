import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * - Validates task name length
 * - Ensures parameters are provided
 * - Restricts task type to supported values
 * - Performs strict CRON validation (five fields)
 */
export const TaskFormSchema = z.object({
  taskName: z.string()
    .min(3, "Task name must be at least 3 characters long")
    .max(100, "Task name cannot exceed 100 characters"),
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor"], {
    required_error: "Task type is required",
    invalid_type_error: "Invalid task type",
  }),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .refine(obj => Object.keys(obj).length > 0, "Parameters must include at least one key"),
  scheduleCron: z.string().regex(
    /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/,
    "Invalid cron expression: expected 5 fields (min hour day month weekday)",
  ),
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/**
 * Utility: safely validate input against TaskFormSchema
 */
export function validateTaskForm(input: unknown): { success: boolean; data?: TaskFormInput; error?: string } {
  const parsed = TaskFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map(i => i.message).join("; "),
    }
  }
  return { success: true, data: parsed.data }
}
