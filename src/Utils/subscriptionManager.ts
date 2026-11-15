import { IsPattern, PatternMatches, PatternPrefix } from "./pattern";

/**
 * A key filter: exact keys, and patterns ending in `*` that match every key starting with the text
 * before it (`task_*` matches `task_1`). Undefined matches every key; an empty array matches none.
 */
export type KeyFilter = readonly string[] | undefined;

/** A subscription that matched some changed keys, and the keys it matched */
export interface ISubscriptionMatch<S> {
  id: number;
  subscription: S;
  keys: string[];
}

interface IEntry<S> {
  subscription: S;
  /** Every key matches */
  all: boolean;
  exact: Set<string>;
  prefixes: string[];
  group: unknown;
}

/**
 * Subscriptions to keys, for any use: it matches keys to subscriptions and counts who holds a
 * key, and knows nothing about what a key's value is or how it's delivered.
 *
 * - **Exact keys hold a key; patterns don't.** `SubscriberCount(key)` counts the subscriptions
 *   naming the key exactly, and `OnReleased` reports when the last of them ends. A pattern
 *   subscription matches keys without holding them, or a `whatif_*` subscriber would keep every key.
 * - **Groups end together.** A subscription can name a group (to a host, a channel), and
 *   `Disconnect(group)` ends every subscription in it.
 * - Callbacks run synchronously, inside the call that caused them.
 *
 * @template S What a subscription carries, e.g. its callback and form.
 */
export class SubscriptionManager<S> {
  private entries = new Map<number, IEntry<S>>();
  private nextId = 1;
  /** Exact key -> the subscriptions naming it */
  private counts = new Map<string, number>();
  private groups = new Map<unknown, Set<number>>();
  private released: Array<{ pattern: string, callback: (key: string) => void }> = [];

  /**
   * Adds a subscription.
   * @param keys The keys it matches, see `KeyFilter`.
   * @param subscription What the subscription carries.
   * @param options `group`: the group `Disconnect` ends it with.
   * @returns Its id.
   */
  Subscribe(keys: KeyFilter, subscription: S, options: { group?: unknown } = {}): number {
    const id = this.nextId++;
    const entry: IEntry<S> = { subscription, all: keys === undefined, exact: new Set(), prefixes: [], group: options.group };
    if (keys)
      for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        if (IsPattern(key))
          entry.prefixes.push(PatternPrefix(key));
        else
          entry.exact.add(key);
      }

    this.entries.set(id, entry);
    for (const key of entry.exact)
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);

    if (options.group !== undefined) {
      let ids = this.groups.get(options.group);
      ids || this.groups.set(options.group, ids = new Set());
      ids.add(id);
    }

    return id;
  }

  /**
   * Ends a subscription. Each exact key it was the last to name is released.
   * @returns Whether it existed.
   */
  Unsubscribe(id: number): boolean {
    const entry = this.entries.get(id);
    if (!entry)
      return false;

    this.entries.delete(id);
    if (entry.group !== undefined) {
      const ids = this.groups.get(entry.group)!;
      ids.delete(id);
      ids.size === 0 && this.groups.delete(entry.group);
    }

    const releasedKeys: string[] = [];
    for (const key of entry.exact) {
      const count = this.counts.get(key)! - 1;
      if (count > 0)
        this.counts.set(key, count);
      else {
        this.counts.delete(key);
        releasedKeys.push(key);
      }
    }

    for (const key of releasedKeys)
      this.Release(key);

    return true;
  }

  /** Ends every subscription in a group */
  Disconnect(group: unknown) {
    const ids = this.groups.get(group);
    if (ids)
      for (const id of Array.from(ids))
        this.Unsubscribe(id);
  }

  /** Whether a subscription exists */
  Has(id: number) {
    return this.entries.has(id);
  }

  /** What a subscription carries, or undefined when it doesn't exist */
  Get(id: number): S | undefined {
    return this.entries.get(id)?.subscription;
  }

  /**
   * The keys a subscription matches, in the order given.
   * @returns The keys, or an empty array when the subscription doesn't exist.
   */
  MatchingKeys(id: number, keys: Iterable<string>): string[] {
    const entry = this.entries.get(id);
    const matched: string[] = [];
    if (entry)
      for (const key of keys)
        Matches(entry, key) && matched.push(key);

    return matched;
  }

  /**
   * Each subscription that matches any of the keys, with the keys it matches, in subscription
   * order. Subscriptions that match none are left out.
   */
  Matching(keys: Iterable<string>): ISubscriptionMatch<S>[] {
    const list = Array.isArray(keys) ? keys as string[] : Array.from(keys);
    const matches: ISubscriptionMatch<S>[] = [];
    for (const [id, entry] of this.entries) {
      const matched = entry.all ? list : list.filter(key => Matches(entry, key));
      matched.length > 0 && matches.push({ id, subscription: entry.subscription, keys: matched });
    }

    return matches;
  }

  /**
   * Whether a subscription matches every key, with no filter, so a caller can hand it the whole
   * of something without filtering it.
   */
  MatchesAll(id: number) {
    return this.entries.get(id)?.all === true;
  }

  /**
   * Calls back when a key matching a pattern loses its last exact subscription, inside the
   * `Unsubscribe` or `Disconnect` that ended it. A key never named exactly is never released.
   * @param pattern An exact key or a pattern ending in `*`.
   * @returns A function that removes the callback.
   */
  OnReleased(pattern: string, callback: (key: string) => void): () => void {
    const entry = { pattern, callback };
    this.released.push(entry);
    return () => Remove(this.released, entry);
  }

  /** How many subscriptions name a key exactly now; patterns don't count */
  SubscriberCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  private Release(key: string) {
    for (const { pattern, callback } of this.released.slice())
      if (PatternMatches(pattern, key))
        callback(key);
  }
}

function Matches(entry: IEntry<unknown>, key: string) {
  if (entry.all || entry.exact.has(key))
    return true;

  for (let x = 0; x < entry.prefixes.length; x++)
    if (key.startsWith(entry.prefixes[x]))
      return true;

  return false;
}

function Remove<T>(list: T[], item: T) {
  const index = list.indexOf(item);
  index >= 0 && list.splice(index, 1);
}
