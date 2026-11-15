/**
 * Key patterns: an exact key, or a pattern ending in `*` that matches every key starting with the
 * text before it (`task_*` matches `task_1`, and `task_` itself). A lone `*` matches every key.
 * Store roots, subscriptions' key filters and route segments all match this way. The text is
 * compared as it is: no character but a final `*` is special.
 */

/** A pattern's wildcard, its last character */
export const WILDCARD = "*";

/** Whether `pattern` is a pattern rather than an exact key: it ends in `*` */
export function IsPattern(pattern: string): boolean {
  return pattern.endsWith(WILDCARD);
}

/** The text a pattern's keys start with: the pattern without its `*` */
export function PatternPrefix(pattern: string): string {
  return pattern.slice(0, -WILDCARD.length);
}

/** Whether `key` matches `pattern`: it is the exact key, or starts with the pattern's prefix */
export function PatternMatches(pattern: string, key: string): boolean {
  return IsPattern(pattern) ? key.startsWith(PatternPrefix(pattern)) : pattern === key;
}
