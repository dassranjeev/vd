export type PatchValue = string | number | boolean;

const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Writes `value` at a dotted path (e.g. "closing", "lines.0.emphasis").
 *
 * Two deliberate restrictions, because the path comes from the browser:
 *   - Segments that could reach Object.prototype are rejected outright.
 *   - The leaf must already exist. Callers merge schema defaults in first, so
 *     every legitimate field is present — this permits edits while refusing to
 *     invent new keys or grow arrays from client input.
 *
 * Mutates `target`; pass a clone if you need the original.
 */
export function setPath(target: Record<string, unknown>, path: string, value: PatchValue) {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) throw new Error("A field path is required.");
  if (parts.some((part) => UNSAFE_SEGMENTS.has(part))) {
    throw new Error("Illegal field path.");
  }

  let cursor: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    if (!Object.prototype.hasOwnProperty.call(cursor, part)) {
      throw new Error(`Unknown field "${path}".`);
    }
    const next = cursor[part];
    if (next === null || typeof next !== "object") {
      throw new Error(`Cannot descend into "${part}".`);
    }
    cursor = next as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  if (!Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    throw new Error(`Unknown field "${path}".`);
  }
  cursor[leaf] = value;
}
