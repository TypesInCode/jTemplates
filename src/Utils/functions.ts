export function IsAsync(func: Function) {
  return (func as any)[Symbol.toStringTag] === "AsyncFunction"
}
