import { JsonDiffIdentityFunc, JsonDiffInto, JsonDiffResult, JsonDiffStrategyFunc, JsonMerge, JsonType } from '../../Utils/json';
import { Snapshot } from '../Tree/snapshot';
import { IKeyFunc, IRouteDefinitions } from './utils/diffTree.types';
import { ApplyValueToPath, SpliceValueAtPath, WriteContext } from './utils/homes';
import { JoinPaths, PROJECTION_PREFIX, ROOT_ROUTE, SplitRouteAndPath } from './utils/paths';
import { Projections } from './utils/projections';
import { RouteInstances } from './utils/routes';
import { DeleteRouteState, KeyUnchanged, ReadPath, ReadSnapshot } from './utils/state';

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
    AssertWritable(SplitRouteAndPath(path)[1]);
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

  // Shared by PushPath and SplicePath, which a DiffTreeWriter guards separately
  private Splice(path: string, start: number, deleteCount: number, items: readonly unknown[]) {
    AssertWritable(SplitRouteAndPath(path)[1]);
    SpliceValueAtPath(this.writeContext, path, start, deleteCount, items);
  }

  /**
   * Deletes a route: its state, its child routes and projection outputs, and its route
   * instances. The projection order is rebuilt on the next `RunProjections`, so deleting
   * several routes in a row sorts once.
   * @param routePath The route to delete, e.g. `/channel/1/`
   * @throws When the path is the root route or has a property path, e.g. `/channel/1/name`
   */
  DeleteRoute(routePath: string) {
    const [route, propertyPath] = SplitRouteAndPath(routePath);
    const fullRoute = JoinPaths("", route);
    if (propertyPath || fullRoute === ROOT_ROUTE)
      throw new Error(`Unable to delete ${routePath}: only a non-root route path, e.g. /channel/1/, can be deleted.`);

    DeleteRouteState(this.snapshot, this.rootState, fullRoute);
    this.routes.Delete(fullRoute);
  }

  /**
   * Reads the raw value at a path, root (`value.prop`) or routed (`/channel/1/value.prop`).
   * @returns The value, or undefined when any segment of the path doesn't exist
   */
  ReadPath(path: string) {
    return ReadPath(this.rootState, path);
  }

  /** Runs every projection of every route instance; see `Projections.Run` */
  RunProjections() {
    this.projections.Run();
  }

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
    const strategy = CommitStrategy(rootKeyFunc);
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
