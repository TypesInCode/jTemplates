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
   * @param projections - Optional map of derived-value projections, keyed by id
   */
  new (keyFunc?: { (val: any): string }, projections?: DiffTreeProjectionMap): IDiffTree;
}

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

/** Reserved key prefix a projection's result is stored under: `$projection_<id>`. */
export const PROJECTION_PREFIX = "$projection_";

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
  method: "diffpath" | "splicepath" | "pushpath" | "patchpath";
  /** Arguments for the method call */
  arguments: Array<any>;
}
