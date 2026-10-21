import { ArraysEqual } from "../../Utils/array";
import { JsonType, type JsonDiffResult } from "../../Utils/json";
import {
  IDiffTreeProjectionHost,
  IDiffTreeProjector,
  PROJECTION_PREFIX,
  TrackedProjectionDefinition,
  TrackedProjectionMap,
  TrackedProjectionRead,
  TrackedProjectionReadAny,
} from "./diffTree.types";

/**
 * Thrown by a tracked projection's `read`/`readAny` when the path doesn't exist. A projection
 * can catch it to handle the missing value; uncaught, the projector skips the projection,
 * leaving its last result in place, and retries once the missing value appears.
 */
export class ProjectionMissingReadError extends Error {
  constructor(public readonly id: string, public readonly path: string) {
    super(`Projection "${id}" read a missing value at "${path}"`);
    this.name = "ProjectionMissingReadError";
  }
}

/** Marks a tracked read whose path didn't exist. */
const MISSING = Symbol("MISSING");

/**
 * A read made during a projection's last run, re-resolved on the next `Run` to decide
 * whether the projection needs to run again.
 * - `read`: the snapshot of a path's value (or `MISSING`).
 * - `keys`: the sorted keys of `parentPath` starting with `keyPrefix` (or `MISSING`), made by
 *   `readAny`. The matched children are tracked as their own `read` entries.
 */
type TrackedRead =
  | { type: "read"; path: string; value: any }
  | { type: "keys"; parentPath: string; keyPrefix: string; keys: string[] | typeof MISSING };

/** A tracked projection's declaration together with its id, in dependency order. */
type TrackedProjectionEntry = TrackedProjectionDefinition & { id: string };

/**
 * Whether a declared read prefix can read projection `id`'s result: either the prefix
 * covers `$projection_<id>` (e.g. `"$projection_"`), or it reads into it (e.g.
 * `"$projection_<id>.total"`).
 */
function PrefixReadsProjection(prefix: string, id: string) {
  const key = PROJECTION_PREFIX + id;
  return key.startsWith(prefix) || prefix.startsWith(key + ".");
}

/**
 * Topologically sorts tracked projections by their declared read prefixes into a single
 * array, run sequentially: a prefix that can read another projection's `$projection_<id>`
 * output is a dependency edge, so that projection is sorted earlier. Runs once, at
 * construction, so a cycle (including a prefix that can read the projection's own result)
 * or a `$projection_` prefix matching no registered projection is rejected immediately.
 */
function BuildProjectionOrder(projections: TrackedProjectionMap): TrackedProjectionEntry[] {
  const order: TrackedProjectionEntry[] = [];
  const state = new Map<string, "visiting" | "done">();
  const ids = Object.keys(projections);

  function Visit(id: string, stack: string[]) {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting")
      throw new Error(
        `DiffTree projection cycle detected: ${stack.concat(id).join(" -> ")}`,
      );

    const def = projections[id];
    state.set(id, "visiting");
    for (let x = 0; x < def.reads.length; x++) {
      const prefix = def.reads[x];
      const dependencies = ids.filter((dep) => PrefixReadsProjection(prefix, dep));
      if (prefix.startsWith(PROJECTION_PREFIX) && dependencies.length === 0)
        throw new Error(`DiffTree projection read "${prefix}" matches no projection`);

      for (let y = 0; y < dependencies.length; y++)
        Visit(dependencies[y], stack.concat(id));
    }

    state.set(id, "done");
    order.push({ id, ...def });
  }

  for (let x = 0; x < ids.length; x++) Visit(ids[x], []);

  return order;
}

/** The snapshot of the value at `path`, or `MISSING`. */
function ResolveRead(host: IDiffTreeProjectionHost, path: string) {
  const [value, found] = host.Read(path);
  return found ? host.Snapshot(value) : MISSING;
}

/** The sorted keys of the value at `parentPath` starting with `keyPrefix`, or `MISSING`. */
function ResolveKeys(host: IDiffTreeProjectionHost, parentPath: string, keyPrefix: string) {
  const [parent, found] = host.Read(parentPath);
  if (!found || JsonType(parent) === "value") return MISSING;

  return Object.keys(parent).filter((key) => key.startsWith(keyPrefix)).sort();
}

/**
 * Whether any read from a projection's last run resolves differently now. A projection is
 * pure, so if every value it read is unchanged it would make the same reads and return the
 * same result; it only needs to run again when this returns true.
 */
function ReadsChanged(host: IDiffTreeProjectionHost, reads: TrackedRead[]) {
  for (let x = 0; x < reads.length; x++) {
    const read = reads[x];
    if (read.type === "read") {
      if (ResolveRead(host, read.path) !== read.value) return true;
      continue;
    }

    const keys = ResolveKeys(host, read.parentPath, read.keyPrefix);
    if (keys === MISSING || read.keys === MISSING) {
      if (keys !== read.keys) return true;
    } else if (!ArraysEqual(keys, read.keys)) return true;
  }

  return false;
}

function AssertReadDeclared(entry: TrackedProjectionEntry, path: string) {
  for (let x = 0; x < entry.reads.length; x++)
    if (path.startsWith(entry.reads[x])) return;

  throw new Error(
    `Projection "${entry.id}" read "${path}" outside its declared reads: ${entry.reads.join(", ")}`,
  );
}

/**
 * Runs one projection, tracking every read it makes into `reads`. Throws
 * `ProjectionMissingReadError` when an uncaught read was missing; `reads` holds every read
 * made up to and including the missing one.
 */
function RunProjection(
  host: IDiffTreeProjectionHost,
  entry: TrackedProjectionEntry,
  reads: Map<string, TrackedRead>,
) {
  const read: TrackedProjectionRead = function (path) {
    AssertReadDeclared(entry, path);
    const value = ResolveRead(host, path);
    reads.set("read:" + path, { type: "read", path, value });
    if (value === MISSING) throw new ProjectionMissingReadError(entry.id, path);

    return value;
  };

  const readAny: TrackedProjectionReadAny = function (path) {
    if (!path.endsWith("*"))
      throw new Error(`Projection "${entry.id}" readAny path must end with a wildcard: "${path}"`);

    const base = path.slice(0, -1);
    AssertReadDeclared(entry, base);

    const dot = base.lastIndexOf(".");
    const parentPath = dot < 0 ? "" : base.slice(0, dot);
    const keyPrefix = base.slice(dot + 1);
    const keys = ResolveKeys(host, parentPath, keyPrefix);
    reads.set("keys:" + path, { type: "keys", parentPath, keyPrefix, keys });
    if (keys === MISSING) throw new ProjectionMissingReadError(entry.id, path);

    const values: { [key: string]: any } = {};
    for (let x = 0; x < keys.length; x++)
      values[keys[x]] = read(parentPath ? `${parentPath}.${keys[x]}` : keys[x]);

    return values;
  };

  return entry.projection(read, readAny);
}

/**
 * Runs every tracked projection, sequentially in dependency order. A projection that has
 * run before is first checked against the reads it made last time, and skipped if none of
 * them changed. Otherwise it runs, its reads are recorded for next time, and its result is
 * written to `$projection_<id>` through the tree's normal diff-and-apply.
 *
 * A projection whose uncaught read was missing isn't written: its last result (if any)
 * stays in place, so a projection chaining off one that never produced a result stays
 * blocked in turn. Its reads, including the missing one, are still recorded, so it's
 * retried once the missing value appears. Any other error propagates.
 */
function RunProjections(
  host: IDiffTreeProjectionHost,
  projections: TrackedProjectionEntry[],
  memo: Map<string, TrackedRead[]>,
): JsonDiffResult {
  let diffResult: JsonDiffResult = [];

  for (let x = 0; x < projections.length; x++) {
    const entry = projections[x];
    const priorReads = memo.get(entry.id);
    if (priorReads !== undefined && !ReadsChanged(host, priorReads)) continue;

    const reads = new Map<string, TrackedRead>();
    let result: any;
    try {
      result = RunProjection(host, entry, reads);
    } catch (err) {
      if (!(err instanceof ProjectionMissingReadError)) throw err;

      memo.set(entry.id, Array.from(reads.values()));
      continue;
    }

    memo.set(entry.id, Array.from(reads.values()));
    diffResult = diffResult.concat(host.Write(PROJECTION_PREFIX + entry.id, result));
  }

  return diffResult;
}

/**
 * A projection implementation that tracks the reads each projection makes. A projection
 * reads values on demand through `read(path)` and `readAny(path)`, rather than receiving a
 * fixed list of values, so it can read exactly what its result depends on: for example,
 * only the entities whose ids a list holds. It's re-run only when one of those reads
 * changes, which makes many small, targeted projections cheap to keep up to date.
 *
 * Keeps a per-tree memo of each projection's reads, so each `DiffTree` needs its own
 * instance.
 *
 * @example
 * const tree = new DiffTree(keyFunc, new TrackedProjector({
 *   selectedNames: {
 *     reads: ["selectedIds", "user_"],
 *     projection: (read) => read<string[]>("selectedIds").map((id) => read(`${id}.name`)),
 *   },
 * }));
 */
export class TrackedProjector implements IDiffTreeProjector {
  private order: TrackedProjectionEntry[];
  private memo = new Map<string, TrackedRead[]>();

  /**
   * Creates a TrackedProjector.
   * @param projections - Map of tracked projections, keyed by id. Cycles, including a read
   *   prefix that can read the projection's own result, and `$projection_` prefixes matching
   *   no projection are rejected here.
   */
  constructor(projections: TrackedProjectionMap) {
    this.order = BuildProjectionOrder(projections);
  }

  public Run(host: IDiffTreeProjectionHost): JsonDiffResult {
    return RunProjections(host, this.order, this.memo);
  }
}
