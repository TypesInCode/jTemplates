import { JsonDiffResult } from "../../Utils/json";
import { SubscriptionManager } from "../../Utils/subscriptionManager";
import { DiffTree } from "./diffTree";
import { DeliveryForm, IDiffPost, ISnapshotUpdate, ISubscribeOptions } from "./diffTree.types";

interface ISubscription {
  form: DeliveryForm;
  callback: (delivery: any) => void;
}

/**
 * A `DiffTree` that delivers every `Commit()` to its subscribers: the tree, observable.
 *
 * - **`Commit()` diffs and delivers; it doesn't run projections.** Call `RunProjections()` first
 *   when the change needs them. A commit without it delivers the changed roots with the projection
 *   outputs as they were, which is how to send a small change (a flag) ahead of a long write.
 * - **Each subscription names its roots and form** (`ISubscribeOptions`). The diff is computed
 *   once per commit and shaped for each: diff records, or whole changed roots. A commit with no
 *   changes delivers nothing.
 * - **A new subscription gets the committed state first**, inside `Subscribe`, then every commit.
 *   Uncommitted writes arrive with the next commit, like everyone else's.
 * - **Delivery is synchronous**, inside `Commit()`. A subscriber may write to another tree, but
 *   a change to this one, or a commit, during its delivery throws. Values are shared with the
 *   tree, never cloned: treat them as read-only.
 * - When a subscriber throws, the others still get the commit, and `Commit()` throws the first error.
 *
 * @example
 * const tree = new ObservableDiffTree(keyFunc, routes);
 * const stop = tree.Subscribe({ roots: ["loading", "$projection_*"] }, post => store.Apply(post.diff));
 * tree.WritePath("loading", true);
 * tree.Commit();
 */
export class ObservableDiffTree extends DiffTree {
  private subscriptions = new SubscriptionManager<ISubscription>();
  private seq = 0;
  /** How many deliveries are running: changes and commits throw while it isn't 0 */
  private delivering = 0;

  /** The number of the last commit that changed something; 0 before the first */
  get Seq() {
    return this.seq;
  }

  /**
   * Diffs the tree since the last commit and delivers the changes to every subscription whose
   * roots they touch.
   * @returns The diff.
   * @throws During a delivery from this tree, or the first error a subscriber threw.
   */
  Commit(): JsonDiffResult {
    this.BeforeChange();
    const diff = super.Commit();
    if (diff.length === 0)
      return diff;

    const seq = ++this.seq;
    const changed = new Set<string>();
    const deleted = new Set<string>();
    for (let x = 0; x < diff.length; x++) {
      const record = diff[x];
      const key = record.path[0] as string;
      changed.add(key);
      record.type === "delete" && record.path.length === 1 && deleted.add(key);
    }

    const errors: unknown[] = [];
    for (const { id, subscription, keys } of this.subscriptions.Matching(changed)) {
      // An earlier subscriber's delivery may have ended this one
      if (!this.subscriptions.Has(id))
        continue;

      let delivery: IDiffPost | ISnapshotUpdate;
      if (subscription.form === "diff") {
        const matched = this.subscriptions.MatchesAll(id) ? diff : FilterDiff(diff, new Set(keys));
        delivery = { seq, diff: matched };
      }
      else {
        const roots: { [key: string]: unknown } = {};
        const gone: string[] = [];
        for (const key of keys)
          deleted.has(key) ? gone.push(key) : roots[key] = this.Committed(key);

        delivery = { seq, roots, deleted: gone };
      }

      try {
        this.Deliver(subscription, delivery);
      }
      catch (err) {
        errors.push(err);
      }
    }

    if (errors.length > 0)
      throw errors[0];

    return diff;
  }

  /**
   * Subscribes to the tree's commits. The committed state of the matching roots is delivered
   * first, before this returns, in the subscription's form: a `write` record per root, or every
   * root; nothing when no root matches. Every later commit that touches them follows. A
   * subscriber that held roots from an earlier subscription clears them before subscribing again.
   * @returns A function that ends the subscription.
   * @throws The first delivery's error, after ending the subscription.
   */
  Subscribe(options: ISubscribeOptions & { form: "snapshot" }, callback: (update: ISnapshotUpdate) => void): () => void;
  Subscribe(options: ISubscribeOptions & { form?: "diff" }, callback: (post: IDiffPost) => void): () => void;
  Subscribe(options: ISubscribeOptions, callback: (delivery: any) => void): () => void {
    const subscription: ISubscription = { form: options.form ?? "diff", callback };
    const id = this.subscriptions.Subscribe(options.roots, subscription, { group: options.group });
    const keys = this.subscriptions.MatchingKeys(id, this.CommittedKeys());
    const delivery: IDiffPost | ISnapshotUpdate = subscription.form === "diff"
      ? { seq: this.seq, diff: keys.map(key => ({ type: "write" as const, path: [key], value: this.Committed(key) })) }
      : { seq: this.seq, roots: Object.fromEntries(keys.map(key => [key, this.Committed(key)])), deleted: [] };

    try {
      keys.length > 0 && this.Deliver(subscription, delivery);
    }
    catch (err) {
      this.subscriptions.Unsubscribe(id);
      throw err;
    }

    return () => { this.subscriptions.Unsubscribe(id); };
  }

  /**
   * Waits for the first delivery in which every key has a committed value: at once when they all
   * have one, otherwise the commit that adds the last. The values come from one commit.
   * @param keys Exact root keys; no patterns.
   * @param options `signal` cancels the wait, rejecting with its reason.
   * @returns Each key's committed value.
   */
  Once(keys: readonly string[], options: { signal?: AbortSignal } = {}): Promise<{ [key: string]: unknown }> {
    const { signal } = options;
    return new Promise((resolve, reject) => {
      if (keys.some(key => key.endsWith("*")))
        return reject(new Error(`Once takes exact keys, not patterns: ${keys.join(", ")}`));

      if (signal?.aborted)
        return reject(signal.reason);

      let done = false;
      let stop: (() => void) | undefined;
      const onAbort = () => {
        finish();
        reject(signal!.reason);
      };
      const finish = () => {
        done = true;
        stop?.();
        signal?.removeEventListener("abort", onAbort);
      };

      stop = this.Subscribe({ roots: keys, form: "snapshot" }, () => {
        if (done)
          return;

        const values: { [key: string]: unknown } = {};
        for (const key of keys) {
          const value = this.Committed(key);
          if (value === undefined)
            return;

          values[key] = value;
        }

        finish();
        resolve(values);
      });

      // Resolved by the first delivery, before `stop` was set
      if (done)
        stop();
      else
        signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  /** Ends every subscription made with this `group`; see `ISubscribeOptions.group` */
  Disconnect(group: unknown) {
    this.subscriptions.Disconnect(group);
  }

  /** How many subscriptions name a root key exactly now; see `SubscriptionManager.SubscriberCount` */
  SubscriberCount(key: string) {
    return this.subscriptions.SubscriberCount(key);
  }

  /**
   * Calls back when a root key matching a pattern loses its last exact subscription. It only
   * reports: whether and when to delete the key is the caller's. It runs inside the unsubscribe,
   * which may be inside a delivery, so a callback that deletes the key does it later (a timer).
   * @param pattern An exact key or a pattern ending in `*`.
   * @returns A function that removes the callback.
   */
  OnReleased(pattern: string, callback: (key: string) => void) {
    return this.subscriptions.OnReleased(pattern, callback);
  }

  private Deliver(subscription: ISubscription, delivery: IDiffPost | ISnapshotUpdate) {
    this.delivering++;
    try {
      subscription.callback(delivery);
    }
    finally {
      this.delivering--;
    }
  }

  /** A subscriber can't change or commit the tree delivering to it */
  protected BeforeChange() {
    if (this.delivering > 0)
      throw new Error("ObservableDiffTree: a subscriber can't write to or commit the tree delivering to it.");
  }
}

/** The records whose root is one of `keys` */
function FilterDiff(diff: JsonDiffResult, keys: ReadonlySet<string>): JsonDiffResult {
  return diff.filter(record => keys.has(record.path[0] as string));
}
