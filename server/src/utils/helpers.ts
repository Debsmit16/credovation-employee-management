/**
 * Safely extract a single string from Express query parameters.
 * Express types query values as `string | string[] | undefined`.
 * This helper normalises them to `string | undefined`.
 */
export function qstr(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}
