import { ArraysEqual } from "../../Utils/array";
import type { JsonDiffResult } from "../../Utils/json";
import { Snapshot } from "../Tree/snapshot";
import {
  DiffTreeProjectionDefinition,
  DiffTreeProjectionMap,
  IDiffTreeProjectionHost,
  IDiffTreeProjector,
  PROJECTION_PREFIX,
} from "./diffTree.types";

/**
 * A projection's declaration together with its id, as held in the sorted, sequentially run
 * order `BuildProjectionOrder` produces.
 */
type DiffTreeProjectionEntry = DiffTreeProjectionDefinition & { id: string };

/**
 * Topologically sorts projections by their declared `reads` into a single array, run
 * sequentially: a read of another projection's `$projection_<id>` output is a dependency
 * edge, so that projection is sorted earlier. Runs once, at construction, so a cycle (or a
 * read of an id that isn't registered) is rejected immediately instead of on first write.
 * Also validates each projection's wildcard reads here, at construction: a wildcard must be
 * the final read, must not have dot nesting, and can't target a projection's
 * `$projection_<id>` key.
 */
function BuildProjectionOrder(
  projections: DiffTreeProjectionMap,
): DiffTreeProjectionEntry[] {
  const order: DiffTreeProjectionEntry[] = [];
  const state = new Map<string, "visiting" | "done">();

  function Visit(id: string, stack: string[]) {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting")
      throw new Error(
        `DiffTree projection cycle detected: ${stack.concat(id).join(" -> ")}`,
      );

    const def = projections[id];
    if (!def) throw new Error(`DiffTree projection "${id}" is not defined`);

    state.set(id, "visiting");
    for (let x = 0; x < def.reads.length; x++) {
      const read = def.reads[x];
      const root = read.split(".", 1)[0];
      if (root.endsWith("*") && x !== def.reads.length - 1)
        throw `Wildcard reads only supported as the final read: ${root}`;
      if (root.endsWith("*") && root.includes("."))
        throw `Wildcard reads do not support dot nesting: ${root}`;
      if (root.startsWith(PROJECTION_PREFIX) && read.endsWith("*"))
        throw `Projection keys do not support wildcard reads: ${root}`
      if (root.startsWith(PROJECTION_PREFIX))
        Visit(root.slice(PROJECTION_PREFIX.length), stack.concat(id));
    }

    state.set(id, "done");
    order.push({ id, ...def });
  }

  const ids = Object.keys(projections);
  for (let x = 0; x < ids.length; x++) Visit(ids[x], []);

  return order;
}

/**
 * Runs every registered projection, sequentially in the dependency order
 * `BuildProjectionOrder` computed, skipping ones whose declared `reads` all still resolve
 * to the same cached snapshot as last time (so nothing they read has changed), and returns
 * the diff of every projection whose result changed. A projection's result is stored at
 * `$projection_<id>` the same way a `DiffPath` write is: diffed against what was there
 * before and applied path by path, so a change to one field of a projection's result
 * produces one small diff entry rather than replacing the whole thing.
 *
 * Because `order` runs dependencies before dependents, a projection that reads another's
 * `$projection_<id>` output (chaining) always sees that projection's up-to-date result
 * within the same pass.
 *
 * A projection whose `reads` names a root key that doesn't exist yet (a plain path never
 * written, an entity never seen, or another projection that hasn't produced a result) is
 * not run at all, so a projection's author never has to guard every parameter against
 * missing data. It's tried again on every later write until every read exists. This also
 * makes a blocked dependency propagate for free: a projection that never runs never writes
 * `$projection_<id>`, so anything chaining off it stays blocked in turn.
 *
 * A trailing wildcard read is expanded against the current root keys before the projection
 * runs: every root key matching the prefix is read and appended as its own key/value pair,
 * so the projection is called with `(keys, ...values)` where `keys` is every resolved read
 * path (fixed reads first, then each matched wildcard key) positional with `values`.
 *
 * @param host - Access to the tree's state
 * @param projections - Dependency-sorted projection entries, from `BuildProjectionOrder`
 * @param memo - Cross-call memo of each projection's last-read values, by id, positional
 *   with its `reads`
 * @returns Diff entries for every projection whose result changed
 */
function RunProjections(
  host: IDiffTreeProjectionHost,
  projections: DiffTreeProjectionEntry[],
  memo: Map<string, any[]>,
): JsonDiffResult {
  let diffResult: JsonDiffResult = [];

  for (let x = 0; x < projections.length; x++) {
    const { id, reads, projection } = projections[x];
    const values: any[] = [];
    const keys: string[] = [];
    let allPathsExist = true;
    let y = 0;
    for (; allPathsExist && y < reads.length && !reads[y].endsWith("*"); y++) {
      const read = reads[y];
      const [value, found] = host.Read(read);
      allPathsExist = found;
      keys.push(read);
      values.push((found && Snapshot.Get(host.snapshotState, value)) || value);
    }

    if (y < reads.length && reads[y].endsWith("*")) {
      const prefix = reads[y].slice(0, reads[y].length - 1);
      const matchedKeys = host.RootKeys().filter(key => key.startsWith(prefix));
      for (let z = 0; z < matchedKeys.length; z++) {
        // Read as-is because dot paths are not supported for wildcard paths
        const [value, found] = host.ReadRoot(matchedKeys[z]);
        allPathsExist = allPathsExist && found;
        keys.push(matchedKeys[z]);
        values.push((found && Snapshot.Get(host.snapshotState, value)) || value);
      }
    }

    if (allPathsExist) {
      const priorValues = memo.get(id);
      if (!ArraysEqual(priorValues, values)) {
        const result = projection(keys, ...values);
        memo.set(id, values);

        // The same diff-and-apply any other write uses, so a keyed entity embedded in a
        // projection's result is flattened to its own root like any other write, and the
        // diff reported here is unfiltered, the same as DiffPath returns.
        const diff = host.Write(PROJECTION_PREFIX + id, result);
        diffResult = diffResult.concat(diff);
      }
    }
  }

  return diffResult;
}

/**
 * The default projection implementation. Runs every projection on each `Run`, in
 * dependency order, skipping any whose reads haven't changed since its last run.
 * Keeps a per-tree memo, so each `DiffTree` needs its own instance.
 *
 * @example
 * const tree = new DiffTree(keyFunc, new SequentialProjector({
 *   total: { reads: ["items"], projection: (_keys, items) => items.length },
 * }));
 */
export class SequentialProjector implements IDiffTreeProjector {
  private order: DiffTreeProjectionEntry[];
  private memo = new Map<string, any[]>();

  /**
   * Creates a SequentialProjector.
   * @param projections - Map of derived-value projections, keyed by id. Cycles, reads of an
   *   unregistered projection id, and invalid wildcard reads are rejected here.
   */
  constructor(projections: DiffTreeProjectionMap) {
    this.order = BuildProjectionOrder(projections);
  }

  public Run(host: IDiffTreeProjectionHost): JsonDiffResult {
    return RunProjections(host, this.order, this.memo);
  }
}
