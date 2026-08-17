export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  /** Field-level validation errors, keyed by input name. */
  fieldErrors?: Record<string, string>;
};

export const idleState: ActionState = { ok: false };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function succeed(message: string): ActionState {
  return { ok: true, message };
}

/** Wraps an action body so an unexpected throw becomes a readable form error. */
export async function attempt(run: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    // Next.js signals redirect/notFound by throwing; let those propagate.
    if (typeof (error as { digest?: string })?.digest === "string") throw error;
    return fail(message);
  }
}

/** Read a checkbox from FormData. Unchecked boxes are simply absent. */
export function readBoolean(form: FormData, name: string) {
  const value = form.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function readString(form: FormData, name: string, fallback = "") {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : fallback;
}

export function readNumber(form: FormData, name: string, fallback = 0) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : fallback;
}
