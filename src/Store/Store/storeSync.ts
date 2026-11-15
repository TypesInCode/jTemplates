import { EmitterEvent } from "../../Utils/emitter";
import type { JsonDiffResult } from "../../Utils/json";
import type { ILocalLease } from "../Diff/diffTree.types";
import { ObservableDiffTree } from "../Diff/observableDiffTree";
import { IStoreOptions, Store } from "./store";

/** Options for a `StoreSync` */
export interface IStoreSyncOptions extends IStoreOptions {
  /**
   * The tree's root keys the store holds: exact keys and patterns ending in `*`. Omitted, every
   * root. With a `keyFunc`, include the entity roots the held roots refer to.
   */
  roots?: readonly string[];
}

/**
 * StoreSync class extends the base Store class to provide synchronous data management operations.
 * This class handles writing, patching, pushing, and splicing data in a synchronous manner.
 *
 * StoreSync is designed to work with observable data structures, allowing for efficient updates
 * and notifications when data changes. It is particularly useful for scenarios where synchronous
 * operations are preferred or required.
 *
 * @example
 * // Creating a StoreSync instance
 * const store = new StoreSync();
 *
 * // Writing data to the store
 * store.Write({ name: "John", age: 30 }, "user");
 *
 * // Patching existing data
 * store.Patch("user", { age: 31 });
 *
 * // Pushing data into an array
 * store.Push("user.array", { id: 1 }, { id: 2 });
 *
 * // Splicing an array
 * store.Splice("user.array", 0, 1, { id: 3 });
 *
 * The store subscribes to an `ObservableDiffTree` and applies every commit the tree delivers, so
 * anything else on the thread can subscribe to the same tree (`Tree`), and a commit made on the
 * tree directly reaches the store too. A change runs the tree's projections and commits
 * before it returns.
 *
 * - **Its own tree** (`new StoreSync()`, `new StoreSync(undefined, { keyFunc })`): the store creates an
 *   empty tree, and it lives as long as the store.
 * - **A tree it's given** (`new StoreSync(new ObservableDiffTree({ keyFunc, routes }))`): for a tree
 *   with routes and projections, whose keyFunc the store takes. Anything else on the thread may hold it too.
 * - **A hub's tree** (`new StoreSync(hub.OpenLocal(name))`): a tree on this thread a `DiffTreeHub` runs
 *   for an endpoint, shared by every store opened on it and followed into by the hub. A change from
 *   any of them reaches all of them, and the trees that follow it, before it returns. The store
 *   owns the lease and releases it when it's destroyed. When the hub restarts the tree, the store
 *   moves to the new one, as when it first subscribed.
 *
 * @example
 * // A store on a hub's tree: it lives as long as the component that holds it
 * @Inject(DiffTreeHub) hub!: DiffTreeHub;
 * @Destroy() budget = new StoreSync(this.hub.OpenLocal("budget"));
 *
 * @see Store
 * @see StoreAsync
 * @see ObservableDiffTree
 */
export class StoreSync extends Store {
  /**
   * The tree each change is applied to. The store applies every commit it delivers.
   * @private
   */
  private diff!: ObservableDiffTree;
  private unsubscribe?: () => void;
  /** The lease the store owns, when it was given one */
  private lease?: ILocalLease;
  private stopLease?: () => void;
  private roots?: readonly string[];
  /** Over a lease: the roots delivered and not deleted, to delete the ones a restarted tree doesn't hold */
  private delivered = new Set<string>();

  /**
   * Creates a store and subscribes it to its tree: the tree's state is the store's when this returns.
   * @param tree The tree:
   *   - A lease from `DiffTreeHub.OpenLocal`, on a hub's tree on this thread. The store owns the
   *     lease from then on, and releases it when it's destroyed, and follows the tree across
   *     restarts. A lease on a worker's tree (`DiffTreeHub.Open`) is for a `StoreAsync`, and doesn't
   *     compile here.
   *   - An `ObservableDiffTree`, for a tree with routes (`new ObservableDiffTree({ keyFunc, routes })`).
   *     A projection in the root route (`"/"`) is readable through `Get` at `$projection_<key>`. The
   *     store doesn't own it: `Destroy` stops listening.
   *   - Left out, the store creates an empty tree of its own, with the store's `keyFunc` and `opaque`.
   * @param options `keyFunc`, `roots` and `opaque` (`IStoreSyncOptions`). `keyFunc` is for the tree the
   *   store creates: a leased tree's is the endpoint's, and a given tree's its own. A tree given or
   *   leased must write the `opaque` keys whole already (`IObservableDiffTreeConfig.opaque`): share
   *   them from one file.
   * @throws When `keyFunc` is given with a tree or a lease, which has its own.
   */
  constructor(tree?: ObservableDiffTree | ILocalLease, options: IStoreSyncOptions = {}, watch: readonly string[] = [], watchCallback?: (rootKey: string, event: EmitterEvent) => void) {
    const lease = tree && !(tree instanceof ObservableDiffTree) ? tree : undefined;
    if (tree && options.keyFunc)
      throw new Error(lease
        ? `StoreSync: the endpoint ${lease.name} gives the store its keyFunc; leave it out of the options.`
        : "StoreSync: the tree has its keyFunc, which the store takes; leave it out of the options.");

    super(lease ? lease.endpoint.keyFunc : tree ? (tree as ObservableDiffTree).KeyFunc : options.keyFunc, options.opaque, watch, watchCallback);
    this.roots = options.roots;

    if (lease) {
      this.lease = lease;
      this.Attach(lease.tree, false);
      this.stopLease = lease.OnTree(tree => this.Attach(tree, true));
      return;
    }

    this.diff = tree as ObservableDiffTree | undefined ?? new ObservableDiffTree({ keyFunc: options.keyFunc, opaque: options.opaque });
    this.unsubscribe = this.diff.Subscribe({ roots: this.roots }, post => this.UpdateRootMap(post.diff));
  }

  /**
   * The store's tree: its own, or the hub's. Subscribe to it to receive the
   * same commits the store applies; a commit made on it reaches the store too. A subscriber can't
   * write to the store during a delivery.
   */
  get Tree() {
    return this.diff;
  }

  /**
   * Writes data to the store synchronously.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @throws Will throw an error if no key is provided for the data.
   */
  Write(data: unknown, key?: string) {
    key = key || this.keyFunc?.(data);
    if (!key) throw "No key provided for data";

    this.diff.WritePath(key, data);
    this.Sync();
  }

  /**
   * Patches an existing value in the store with new data synchronously.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @throws Will throw an error if the value to be patched is undefined.
   */
  Patch(key: string, patch: unknown) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.PatchPath(key, patch);
    this.Sync();
  }

  /**
   * Pushes data into an array stored at the specified key synchronously.
   * @param key The key of the array where data will be pushed.
   * @param data The data items to be pushed into the array.
   */
  Push(key: string, ...data: unknown[]) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.PushPath(key, data);
    this.Sync();
  }

  /**
   * Splices an array stored at the specified key with new data synchronously.
   * This method modifies the array by deleting elements and inserting new ones at the specified position.
   * @param key The key of the array to be spliced.
   * @param start The position at which to start changing the array.
   * @param deleteCount Optional number of elements to delete. If not provided, all elements from start to end will be deleted.
   * @param items Optional elements to insert into the array.
   */
  Splice(
    key: string,
    start: number,
    deleteCount?: number,
    ...items: unknown[]
  ) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.SplicePath(key, start, deleteCount ?? Infinity, items);
    this.Sync();
  }

  /**
   * Stops applying the tree's commits. Over a lease, the store then releases it: the last lease on
   * a hub's tree ends it. The store's values stay readable, and stop changing.
   */
  Destroy() {
    this.stopLease?.();
    this.stopLease = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.lease?.Release();
  }

  /**
   * Subscribes to a hub's tree in place of the last. A restarted tree's state is applied in place, so
   * readers keep their objects, with a delete for each root the last tree had and this one hasn't, in
   * one update. The first delivery arrives during `Subscribe`.
   */
  private Attach(tree: ObservableDiffTree, again: boolean) {
    this.unsubscribe?.();
    this.diff = tree;
    const previous = this.delivered;
    this.delivered = new Set();
    let subscribing = true;
    let first: JsonDiffResult = [];
    this.unsubscribe = tree.Subscribe({ roots: this.roots }, post => {
      this.Track(post.diff);
      subscribing ? (first = post.diff) : this.UpdateRootMap(post.diff);
    });
    subscribing = false;

    const diff: JsonDiffResult = [...first];
    for (const key of previous)
      this.delivered.has(key) || diff.push({ type: "delete", path: [key] });

    diff.length > 0 && (again ? this.UpdateRootMapInPlace(diff) : this.UpdateRootMap(diff));
  }

  private Track(diff: JsonDiffResult) {
    for (const record of diff) {
      const key = String(record.path[0]);
      record.type === "delete" && record.path.length === 1 ? this.delivered.delete(key) : this.delivered.add(key);
    }
  }

  /**
   * Runs projections and commits: the commit's delivery applies everything changed since the
   * last commit to the store.
   * @private
   */
  private Sync() {
    this.diff.RunProjections();
    this.diff.Commit();
  }
}
