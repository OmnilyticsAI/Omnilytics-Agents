import { z } from "zod"

/**
 * Base types for any action contract
 */
export type CoreActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  notice: string
  data?: T
}

export interface ActionError {
  notice: string
  error: string
  code?: string
}

export type AsyncResult<T> = Promise<ActionResponse<T>>
export type AsyncResultOrError<T> = Promise<ActionResponse<T> | ActionError>

export interface ActionExecuteArgs<S extends CoreActionSchema, Ctx = unknown> {
  payload: z.infer<S>
  context: Ctx
}

export interface BaseAction<S extends CoreActionSchema, R, Ctx = unknown> {
  id: string
  summary: string
  input: S
  execute(args: ActionExecuteArgs<S, Ctx>): Promise<ActionResponse<R>>
}

/* ---------------------------------------------------
 * Helpers to build consistent responses and validation
 * --------------------------------------------------*/

/** Create a success response with optional data */
export function ok<T>(notice: string, data?: T): ActionResponse<T> {
  return { notice, data }
}

/** Create a typed error payload */
export function fail(notice: string, error: string, code?: string): ActionError {
  return { notice, error, code }
}

/**
 * Validate an unknown payload against a Zod schema.
 * Returns parsed data on success or an ActionError on failure.
 */
export function validatePayload<S extends CoreActionSchema>(
  schema: S,
  payload: unknown,
  idForError = "validation_error",
): ActionResponse<z.infer<S>> | ActionError {
  const parsed = schema.safeParse(payload)
  if (parsed.success) {
    return ok<z.infer<S>>("payload_valid", parsed.data)
  }
  return fail(
    "payload_invalid",
    parsed.error.flatten().formErrors.join("; ") || "Invalid payload",
    idForError,
  )
}

/**
 * Utility to narrow a BaseAction at compile time.
 * Helps when composing registries of heterogeneous actions.
 */
export function defineAction<S extends CoreActionSchema, R, Ctx = unknown>(
  action: BaseAction<S, R, Ctx>,
): BaseAction<S, R, Ctx> {
  return action
}
