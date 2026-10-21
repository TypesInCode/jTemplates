import type { JsonDiffResult } from "../../Utils/json";

/**
 * `type` of the message a `DiffTreeWriter` posts on `Commit()`: the batch's diff results,
 * which a `PushStore` applies.
 */
export const DIFF_TREE_EVENT = "DIFF_TREE_EVENT";
/**
 * `type` of the message a `DiffTreeWriter` posts on `Commit()` when a change in the batch
 * failed, after the `DIFF_TREE_EVENT` carrying the changes that were applied.
 */
export const DIFF_TREE_ERROR = "DIFF_TREE_ERROR";

/**
 * Interface for diff tree operations.
 */
export interface IDiffTree {
  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  DiffPath(path: string, value: any): JsonDiffResult;

  PatchPath(path: string, patch: any): JsonDiffResult;

  SplicePath(path: string, start: number, deleteCount: number | undefined, items: any[]): DiffSpliceResult;

  PushPath(path: string, items: any[]): JsonDiffResult;
}

/**
 * Constructor interface for IDiffTree.
 */
export interface IDiffTreeConstructor {
  /**
   * Creates a new IDiffTree instance.
   * @param keyFunc - Optional function to extract a key from a value
   * @param projector - Optional projection implementation
   * @param routes - Optional route patterns, each with the definition of its instances
   */
  new (keyFunc?: { (val: any): string }, projector?: IDiffTreeProjector, routes?: DiffTreeRoutes): IDiffTree;
}

/**
 * The params a route path matched, by name: `{ color: "red", size: "large" }` for the pattern
 * `/channel/{color}/{size}` and the path `/channel/red/large/...`.
 */
export type DiffTreeRouteConfig = { [param: string]: string };

/**
 * How a route's instances are defined. Each instance is a standard `DiffTree` created by the
 * parent on the first write to a path matching the route, sharing the parent's `keyFunc` and
 * root state.
 */
export interface IDiffTreeRouteDefinition {
  /**
   * Creates the projector for one instance. Called once per distinct config; a projector
   * keeps per-tree state, so return a new one each call. Its `ROUTE_SUMMARY` projection, if
   * any, is the instance's summary; without one, nothing reaches the parent.
   */
  projector?: (config: DiffTreeRouteConfig) => IDiffTreeProjector;
  /** The instances' own routes, resolved relative to the instance */
  routes?: DiffTreeRoutes;
}

/**
 * Route patterns, each with the definition of its instances. A pattern starts with a fixed
 * segment, which is its output key: the root key the instances' summaries are written to.
 * Params are written `{name}`, e.g. `"/channel/{channelId}"`.
 */
export type DiffTreeRoutes = { [pattern: string]: IDiffTreeRouteDefinition };

/**
 * A pure function computing a derived value from the current values at `reads`. Called with
 * the resolved read paths (`keys`) first, then each value positionally in the same order as
 * `reads`, so each value parameter can be typed at the call site instead of cast out of a
 * generic read. A trailing wildcard read expands to one key/value pair per matched root key,
 * so `keys` lets the function tell which root each trailing value came from.
 */
export type DiffTreeProjectionFunc = (keys: string[], ...values: any[]) => any;

/**
 * A projection's declaration: the dot-separated paths it reads (a plain tree path, an
 * entity's key, or another projection's `$projection_<id>` key for chaining) and the
 * function computing its result from their current values, positionally. Declaring `reads`
 * up front lets the tree topologically sort projections and reject a dependency cycle at
 * construction instead of on first write.
 *
 * The final entry in `reads` may instead be a wildcard root key (e.g. `"user_*"`, no dot
 * nesting) matching every root key with that prefix; each match is read and passed to the
 * projection as its own trailing key/value pair. A wildcard read can't be chained off a
 * projection's `$projection_<id>` key and can't appear anywhere but last.
 */
export type DiffTreeProjectionDefinition = {
  reads: string[];
  projection: DiffTreeProjectionFunc;
};

/** A map of projection id to its declaration, keyed by the id used in `$projection_<id>`. */
export type DiffTreeProjectionMap = { [id: string]: DiffTreeProjectionDefinition };

/**
 * Reads a dot-separated path from the tree, returning its immutable snapshot (keyed values
 * are read through their root entity). The read is tracked: the projection is re-run only
 * when a value it read changes. Throws `ProjectionMissingReadError` when the path doesn't
 * exist.
 */
export type TrackedProjectionRead = <T = any>(path: string) => T;

/**
 * Reads every child of a parent whose key matches a trailing wildcard, e.g. `"user_*"` (root
 * keys starting with `user_`) or `"team.members.*"` (every member). Returns the matched
 * children's snapshots, by key. The matched key set and each matched child are tracked, so
 * adding or removing a matching key, or changing a matched child, re-runs the projection.
 * Throws `ProjectionMissingReadError` when the parent doesn't exist.
 */
export type TrackedProjectionReadAny = <T = any>(path: string) => { [key: string]: T };

/**
 * A pure function computing a derived value from the values it reads. Reads are made on
 * demand through `read`/`readAny`, so a projection reads exactly the values its result
 * depends on, e.g. only the entities whose ids a list holds.
 */
export type TrackedProjectionFunc = (
  read: TrackedProjectionRead,
  readAny: TrackedProjectionReadAny,
) => any;

/**
 * A tracked projection's declaration: the path prefixes it may read and the function
 * computing its result. `reads` isn't a list of exact reads; it bounds what the projection
 * can read so the tree can topologically sort projections and reject a dependency cycle at
 * construction. A read outside every declared prefix throws.
 */
export type TrackedProjectionDefinition = {
  reads: string[];
  projection: TrackedProjectionFunc;
};

/** A map of tracked projection id to its declaration, keyed by the id used in `$projection_<id>`. */
export type TrackedProjectionMap = { [id: string]: TrackedProjectionDefinition };

/** Reserved key prefix a projection's result is stored under: `$projection_<id>`. */
export const PROJECTION_PREFIX = "$projection_";

/**
 * Reserved projection id for a route instance's summary. In a route instance, this
 * projection's result isn't stored in the instance: it's written to the instance's slot under
 * the route's output key in the parent (`channel.0001`), so it can't be read from within the
 * instance. Its reads, and the projector's memoization, decide when the summary re-runs. In a
 * tree that isn't a route instance, it's an ordinary id.
 */
export const ROUTE_SUMMARY = "$summary";

/**
 * The access a `DiffTree` gives its projector to the tree's state. Reads and snapshots go
 * through the tree's snapshot cache, and writes go through the tree's normal
 * diff-and-apply, so a projection result is stored exactly like any other write (except that
 * route-keyed entities in it aren't routed: they stay embedded).
 */
export interface IDiffTreeProjectionHost {
  /**
   * An immutable, cached snapshot of a raw value read from the tree, with keyed children read
   * through their root (in this tree or a route instance).
   */
  Snapshot<T>(value: T): T;
  /**
   * Reads a dot-separated path, resolving keyed values through their root entity.
   * @returns The value and whether every segment of the path exists
   */
  Read(path: string): readonly [any, boolean];
  /**
   * Reads a root key as-is, without resolving it through a keyed entity.
   * @returns The value and whether the key exists
   */
  ReadRoot(key: string): readonly [any, boolean];
  /** Every root key currently in the tree */
  RootKeys(): string[];
  /**
   * Diffs a value against the tree at a path and applies it.
   * @returns The diff entries for the write
   */
  Write(path: string, value: unknown): JsonDiffResult;
}

/**
 * A projection implementation: computes derived values from a tree's state and writes them
 * to `$projection_<id>`. A projector keeps per-tree state, so each `DiffTree` needs its own
 * instance.
 */
export interface IDiffTreeProjector {
  /**
   * Brings every projection up to date with the tree.
   * @param host Access to the tree's state
   * @returns Diff entries for every projection whose result changed
   */
  Run(host: IDiffTreeProjectionHost): JsonDiffResult;
}

export type DiffSpliceResult<T = unknown> = {
  /** Array path segments (strings for object keys, numbers for array indices) */
  path: (string | number)[];
  /** Required by the splice operation **/
  start: number,
  deleteCount: number,
  items: T[],
  spliceResult: T[],
  diffResult: JsonDiffResult
};

export type IDiffMethodBatch = IDiffMethod[];
export type IDiffMethodBatchResult = ({
  type: "diff";
  result: JsonDiffResult;
} | {
  type: "splice";
  result: DiffSpliceResult
})[];

/**
 * A message a `DiffTreeWriter` posts to its `PushStore`. Both arrive as ordinary
 * `"message"` events, so the channel can carry other traffic too; listeners tell them apart
 * by `type`.
 */
export type IDiffPushEvent = {
  type: typeof DIFF_TREE_EVENT,
  data: IDiffMethodBatchResult
} | {
  type: typeof DIFF_TREE_ERROR,
  data: any
};

export interface IDiffMethod {
  /** The method to call */
  method: "diffpath" | "splicepath" | "pushpath" | "patchpath" | "deleteroute";
  /** Arguments for the method call */
  arguments: Array<any>;
}
