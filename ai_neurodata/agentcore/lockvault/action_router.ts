import type { BaseAction, ActionResponse, ActionError } from "./action_base_types"
import { z } from "zod"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
  timeoutMs?: number
  retries?: number
}

/**
 * Core Agent: routes calls to registered actions and provides
 * validation, error handling, and introspection.
 */
export class Agent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`)
    }
    this.actions.set(action.id, action)
  }

  unregister(actionId: string): boolean {
    return this.actions.delete(actionId)
  }

  listActions(): { id: string; summary: string }[] {
    return Array.from(this.actions.values()).map(a => ({
      id: a.id,
      summary: a.summary,
    }))
  }

  hasAction(actionId: string): boolean {
    return this.actions.has(actionId)
  }

  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext,
  ): Promise<ActionResponse<R> | ActionError> {
    const action = this.actions.get(actionId)
    if (!action) {
      return { notice: "not_found", error: `Unknown action "${actionId}"`, code: "NOT_FOUND" }
    }

    const parsed = action.input.safeParse(payload)
    if (!parsed.success) {
      return {
        notice: "invalid_payload",
        error: parsed.error.flatten().formErrors.join("; ") || "Payload validation failed",
        code: "VALIDATION_ERROR",
      }
    }

    try {
      return await action.execute({ payload: parsed.data, context: ctx })
    } catch (err) {
      return {
        notice: "execution_failed",
        error: err instanceof Error ? err.message : "Unknown execution error",
        code: "EXECUTION_ERROR",
      }
    }
  }
}
