/**
 * Checks if a function is an async function.
 * @param func - The function to check
 * @returns true if the function is async, false otherwise
 */
export function IsAsync(func: Function) {
  return (func as any)[Symbol.toStringTag] === "AsyncFunction"
}
