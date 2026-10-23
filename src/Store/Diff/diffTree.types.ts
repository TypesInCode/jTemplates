import type { JsonDiffResult } from "../../Utils/json";

/**
 * `type` of the message a `DiffTreeWriter` posts on `Commit()`: the diff since the last commit,
 * which a `PushStore` applies.
 */
export const DIFF_TREE_EVENT = "DIFF_TREE_EVENT";
/**
 * `type` of the message a `DiffTreeWriter` posts on `Commit()` when a change in the batch
 * failed, after the `DIFF_TREE_EVENT` carrying the changes that were applied.
 */
export const DIFF_TREE_ERROR = "DIFF_TREE_ERROR";

/**
 * A message a `DiffTreeWriter` posts to its `PushStore`. Both arrive as ordinary
 * `"message"` events, so the channel can carry other traffic too; listeners tell them apart
 * by `type`.
 */
export type IDiffPushEvent = {
  type: typeof DIFF_TREE_EVENT,
  data: JsonDiffResult
} | {
  type: typeof DIFF_TREE_ERROR,
  data: any
};

/** A `DiffTree` method call sent to a worker connected with `ConnectWorkerToDiffTree` */
export interface IDiffMethod {
  /** The method to call */
  method: "writepath" | "patchpath" | "pushpath" | "splicepath";
  /** Arguments for the method call */
  arguments: Array<any>;
}

export type IDiffMethodBatch = IDiffMethod[];
