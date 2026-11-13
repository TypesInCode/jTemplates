import { JsonDiffIdentityFunc, JsonDiffInto, JsonDiffResult, JsonDiffStrategyFunc, JsonMerge, JsonType } from '../../Utils/json';
import { Snapshot } from '../Tree/snapshot';
import { IKeyFunc, IRouteDefinitions } from './utils/diffTree.types';
import { ApplyRecords, ApplyValueToPath, SpliceValueAtPath, WriteContext } from './utils/homes';
import { JoinPaths, PROJECTION_PREFIX, ROOT_ROUTE, SplitRouteAndPath } from './utils/paths';
import { Projections } from './utils/projections';
import { RouteInstances } from './utils/routes';
import { DeleteRouteState, KeyUnchanged, ReadPath, ReadSnapshot, Remove } from './utils/state';

/**
 * A tree of JSON state in routes, with projections, that tracks its changes as diffs. The work is
 * split across `utils/`:
 * - `homes`: writes, which keep every keyed value at its home
 * - `state`: reading and writing route state, and snapshots of it
 * - `routes`: route instances, created from the route definitions
 * - `projections`: running each route instance's projections
 * - `paths`: path strings
 */
export class DiffTree {
  private rootState = {};
  private snapshot = Snapshot.Create();
  private routes: RouteInstances;
  private projections: Projections;
  /** Each root key's snapshot as of the last commit */
  private commitedSnapshot = new Map<string, any>();
  private opaque = new Set<string>();
  private writeContext: WriteContext;

  constructor(keyFunc?: IKeyFunc, routeDefinitions: IRouteDefinitions = {}) {
    this.routes = new RouteInstances(keyFunc, routeDefinitions);
    this.projections = new Projections(this.snapshot, this.rootState, this.routes);
    this.writeContext = {
      snapshot: this.snapshot,
      root: this.rootState,
      routeKeyFunc: (routePath) => this.routes.Get(routePath).keyFunc
    };
  }

  WritePath(path: string, value: any) {
    this.BeforeChange();
    AssertWritable(SplitRouteAndPath(path)[1]);
    this.AssertLocal(path);
    // Keyed entities are local to the route written to; a key starting with "/" is a route path from the root
    ApplyValueToPath(this.writeContext, path, value);
  }

  public PatchPath(path: string, patch: any) {
    const value = this.Snapshot(path);
    const merged = JsonMerge(value, patch);
    this.WritePath(path, merged);
  }

  public PushPath(path: string, items: unknown[]) {
    // A start past the end appends
    this.Splice(path, Infinity, 0, items);
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[]
  ) {
    this.Splice(path, start, deleteCount, items);
  }

  // Shared by PushPath and SplicePath
  private Splice(path: string, start: number, deleteCount: number, items: readonly unknown[]) {
    this.BeforeChange();
    AssertWritable(SplitRouteAndPath(path)[1]);
    this.AssertLocal(path);
    SpliceValueAtPath(this.writeContext, path, start, deleteCount, items);
  }

  /**
   * Applies another tree's diff records, a delivery of its commit, as writes to this tree, in
   * order: each `write` as `WritePath`, each `splice` as `SplicePath` (moves included), each
   * `delete` as removing the property, or the root key. The next `Commit` diffs them as it does any
   * write, and the projections that read them rerun on `RunProjections`.
   *
   * Into the root route, the records' root keys are this tree's root keys, and a projection output
   * (`$projection_<key>`) can't be written. Into a follow route (`FollowRoutes`), which only this
   * writes, they're held under the source's own keys, projection outputs included, and a route is
   * never posted: the source's data stays in this tree, and only what its projections derive from it
   * reaches this tree's subscribers.
   *
   * Give the route the source's keyFunc, or one that gives its entities the same keys: the source's
   * commit carries a change to an entity once, as its own root's records, and skips it wherever
   * else it appears. Here, as there, each of those places is a slot holding the entity's home, so
   * it reads the change too. Without the keyFunc, the copy of an entity inside another root would
   * keep its first value.
   * @param records A diff, e.g. an `IDiffPost`'s, from a subscription in the `"diff"` form
   * @param route The route to apply them to: the root route (`/`, the default) or a follow route,
   *   e.g. `/engine/`
   * @throws When a record writes a projection output in the root route, the route isn't the root
   *   or a follow route, or a record's parent doesn't exist
   */
  ApplyDiff(records: JsonDiffResult, route: string = ROOT_ROUTE) {
    this.BeforeChange();
    const fullRoute = JoinPaths("", route);
    if (fullRoute === ROOT_ROUTE) {
      for (let x = 0; x < records.length; x++) {
        const key = String(records[x].path[0]);
        AssertWritable(key);
        if (key.startsWith(ROOT_ROUTE))
          throw new Error(`Unable to apply a record at ${key}: a diff's records are in the root route`);
      }
    }
    else if (!this.routes.Get(fullRoute).follow || this.routes.Get(fullRoute).path !== fullRoute)
      throw new Error(`Unable to apply a diff at ${fullRoute}: only the root route or a follow route (FollowRoutes) takes one.`);

    ApplyRecords(this.writeContext, records, fullRoute);
  }

  /** A write's route isn't a follow route, which only `ApplyDiff` writes */
  private AssertLocal(path: string) {
    const route = SplitRouteAndPath(path)[0];
    if (route !== "" && this.routes.Get(JoinPaths("", route)).follow)
      throw new Error(`Unable to write ${path}: a follow route is written only by ApplyDiff, from its subscription.`);
  }

  /**
   * Deletes a route: its state, its child routes and projection outputs, and its route
   * instances. The projection order is rebuilt on the next `RunProjections`, so deleting
   * several routes in a row sorts once.
   * @param routePath The route to delete, e.g. `/channel/1/`
   * @throws When the path is the root route or has a property path, e.g. `/channel/1/name`
   */
  DeleteRoute(routePath: string) {
    this.BeforeChange();
    const [route, propertyPath] = SplitRouteAndPath(routePath);
    const fullRoute = JoinPaths("", route);
    if (propertyPath || fullRoute === ROOT_ROUTE)
      throw new Error(`Unable to delete ${routePath}: only a non-root route path, e.g. /channel/1/, can be deleted.`);

    DeleteRouteState(this.snapshot, this.rootState, fullRoute);
    this.routes.Delete(fullRoute);
  }

  /**
   * Deletes a root key, a written root that isn't a projection output. The next `Commit` carries
   * a `delete` at `[key]`. Deleting a key that doesn't exist does nothing.
   * @param key The root key, e.g. `whatif_14`
   * @throws When the key is a path (it has a `.` or `/`) or a projection output
   */
  DeleteRoot(key: string) {
    this.BeforeChange();
    if (key.includes(".") || key.includes("/"))
      throw new Error(`Unable to delete ${key}: only a root key, e.g. whatif_14, can be deleted.`);

    AssertWritable(key);
    if (Object.hasOwn(this.rootState, key))
      Remove(this.snapshot, this.rootState, key);
  }

  /**
   * A root key's value as of the last `Commit`: its snapshot then, shared and never changed. A
   * key written since and not yet committed reads as it was.
   * @param key The root key.
   * @returns The value, or undefined when the key wasn't in the last commit
   */
  Committed(key: string): unknown {
    return this.commitedSnapshot.get(key);
  }

  /** The root keys as of the last `Commit`, in the order they were first committed */
  CommittedKeys(): string[] {
    return Array.from(this.commitedSnapshot.keys());
  }

  /**
   * Reads the raw value at a path, root (`value.prop`) or routed (`/channel/1/value.prop`).
   * @returns The value, or undefined when any segment of the path doesn't exist
   */
  ReadPath(path: string) {
    return ReadPath(this.rootState, path);
  }

  /**
   * Marks root keys, a written root or a root route projection's `$projection_<key>`, as opaque:
   * `Commit` writes an opaque key's value whole when it changes, never a diff inside it. A Store
   * with the same keys in its `opaque` option holds each of them whole.
   * @param keys The root keys.
   */
  MarkOpaque(keys: readonly string[]) {
    for (let x = 0; x < keys.length; x++)
      this.opaque.add(keys[x]);
  }

  /** Runs every projection of every route instance; see `Projections.Run` */
  RunProjections() {
    this.BeforeChange();
    this.projections.Run();
  }

  /**
   * Runs before every change to the tree's state: each write, splice, applied diff, deleted route
   * or root, and projection run. A subclass that refuses changes at times (`ObservableDiffTree`,
   * during a delivery) throws here.
   */
  protected BeforeChange() { }

  /**
   * The changes since the last commit. The root is a flat record of keys, so each key's snapshot
   * is taken and compared on its own, without building a snapshot of the whole root: a key no
   * write touched has the same cached snapshot as the last commit, and is skipped.
   */
  Commit() {
    const committed = this.commitedSnapshot;
    const keys = Object.keys(this.rootState);
    // Diffed key by key into one result
    const diff: JsonDiffResult = [];
    const rootKeyFunc = this.routes.root.keyFunc;
    const strategy = OpaqueStrategy(this.opaque, CommitStrategy(rootKeyFunc));
    const identity = CommitIdentity(rootKeyFunc);
    // How many of the committed keys are still in the root, to tell whether any are gone
    let kept = 0;
    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      const had = committed.has(key);
      had && kept++;
      const last = committed.get(key);
      if (had && KeyUnchanged(this.snapshot, this.rootState, key, last))
        continue;

      const next = Snapshot.Child(this.snapshot, this.rootState, key);
      if (had && next === last)
        continue;

      JsonDiffInto(next, last, [key], diff, strategy, identity);
      committed.set(key, next);
    }

    if (kept < committed.size)
      for (const key of committed.keys())
        if (!Object.hasOwn(this.rootState, key)) {
          committed.delete(key);
          diff.push({
            type: "delete",
            path: [key]
          });
        }

    return diff;
  }

  /**
   * The snapshot of the value at a path. Only the path's first property is snapshotted, not
   * its whole route.
   * @returns The snapshot, or undefined when any segment of the path doesn't exist
   */
  public Snapshot(path: string) {
    return ReadSnapshot(this.snapshot, this.rootState, path)[0];
  }
}

/**
 * A root key marked opaque is written whole; anything else is left to `strategy`.
 */
function OpaqueStrategy(opaque: ReadonlySet<string>, strategy: JsonDiffStrategyFunc | undefined): JsonDiffStrategyFunc | undefined {
  if (opaque.size === 0)
    return strategy;

  return function (newValue, oldValue, path) {
    if (path.length === 1 && opaque.has(path[0] as string))
      return "write";

    return strategy?.(newValue, oldValue, path);
  };
}

/**
 * How `Commit` diffs the root's snapshots for a Store with the same keyFunc:
 * - An array whose first element is keyed is spliced, its elements matched by CommitIdentity.
 * - A keyed value below a root key, with the same key as before, is skipped when the Store reads it
 *   through its root key (any key not starting with `/`): that root key's own diff carries the
 *   change. The Store doesn't read a route key through its key, so that one is diffed.
 * - A keyed value with a different key is written.
 * Each root key's own value is diffed, keyed or not: it's the entity's home.
 */
function CommitStrategy(keyFunc: IKeyFunc | undefined): JsonDiffStrategyFunc | undefined {
  return keyFunc && function (newValue, oldValue, path) {
    if (Array.isArray(newValue))
      return newValue.length > 0 && JsonType(newValue[0]) !== "value" && keyFunc(newValue[0]) !== undefined ? "splice" : undefined;

    if (path.length <= 1)
      return undefined;

    const key = keyFunc(newValue);
    if (key === undefined)
      return undefined;

    if (key !== (JsonType(oldValue) === "value" ? undefined : keyFunc(oldValue)))
      return "write";

    return key.startsWith(ROOT_ROUTE) ? undefined : "skip";
  };
}

/**
 * What `Commit` matches a spliced array's elements by:
 * - An entity the Store reads by its root key (any key not starting with `/`) is matched by that
 *   key. Editing it leaves the array unchanged, and its root key's own diff carries the change. An
 *   entity whose key changed doesn't match, so it's deleted and the new one inserted.
 * - Anything else, route-key entities included, is matched by ===: the Store doesn't read a route
 *   key through its key, so a changed one must be replaced.
 */
function CommitIdentity(keyFunc: IKeyFunc | undefined): JsonDiffIdentityFunc | undefined {
  return keyFunc && function (value) {
    if (JsonType(value) === "value")
      return value;

    const key = keyFunc(value);
    return key === undefined || key.startsWith(ROOT_ROUTE) ? value : key;
  };
}

/** Projection outputs are written only by RunProjections */
function AssertWritable(propertyPath: string) {
  if (propertyPath.startsWith(PROJECTION_PREFIX))
    throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);
}
