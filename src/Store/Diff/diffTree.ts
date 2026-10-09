import { ArraysEqual } from "../../Utils/array";
import { JsonDeepClone, JsonDiff, JsonType, type JsonDiffResult } from "../../Utils/json";

/**
 * Interface for diff tree operations.
 */
export interface IDiffTree {
  /**
   * Computes diffs for a batch of path/value pairs.
   * @param data - Array of objects with path and value properties
   * @returns Combined diff results
   */
  DiffBatch(data: Array<{ path: string; value: any }>): JsonDiffResult;
  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  DiffPath(path: string, value: any, flatten?: boolean): JsonDiffResult;

  SplicePath(path: string, start: number, deleteCount: number | undefined, items: any[], flatten?: boolean): DiffSpliceResult;
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
  spliceResult: any[],
  diffResult: JsonDiffResult
};

/**
 * Flattens nested objects/arrays, extracting keyed objects to root.
 * @param root - Root object to store flattened values
 * @param value - Value to flatten
 * @param keyFunc - Function to extract key from objects
 * @returns The root object with flattened values
 */
function FlattenValue(
  root: { [key: string]: unknown },
  value: unknown,
  keyFunc: (val: any) => string,
) {
  const type = JsonType(value);
  switch (type) {
    case "array":
      const typedArray = value as unknown[];
      for (let x = 0; x < typedArray.length; x++)
        FlattenValue(root, typedArray[x], keyFunc);
      break;
    case "object":
      const typedObject = value as { [key: string]: unknown };
      const key = keyFunc(typedObject);
      if (key) root[key] = typedObject;

      const keys = Object.keys(typedObject);
      for (let x = 0; x < keys.length; x++)
        FlattenValue(root, typedObject[keys[x]], keyFunc);
  }

  return root;
}

/**
 * Retrieves a value from a source object using a dot-separated path.
 * @param source - The source object
 * @param path - Dot-separated path to the value (empty string returns source)
 * @returns The value at the specified path
 */
function GetPathValue(source: any, path: string, keyFunc?: (value: any) => string | undefined): readonly [any, boolean] {
  if (path === "") return [source, true] as const;

  const parts = path.split(".");
  let curr = source;
  let x = 0;
  for (; curr && x < parts.length - 1; x++) curr = ResolveKeyed(source, curr[parts[x]], keyFunc);

  if (curr && Object.hasOwn(curr, parts[x])) {
    curr = ResolveKeyed(source, curr[parts[x]], keyFunc);
    x++;
  } else curr = undefined;

  return [curr, x === parts.length] as const;
}

/**
 * Sets a value in a source object at the specified path.
 * @param source - The source object
 * @param path - Array of path segments (strings for keys, numbers for indices)
 * @param value - The value to set
 */
function SetPathValue(source: any, path: (string | number)[], value: unknown) {
  if (path.length === 0) return;

  let curr = source;
  let x = 0;
  for (; x < path.length - 1; x++) curr = curr[path[x]];

  curr[path[x]] = value;
  InvalidateSnapshotForValue(curr);
}

const valueSnapshotCache = new WeakMap<any, any>();
const valueSnapshotHierarchy = new WeakMap<any, Set<any>>();

function CreateSnapshotLink(child: object, parent: object) {
  let parents = valueSnapshotHierarchy.get(child);
  if (!parents) valueSnapshotHierarchy.set(child, (parents = new Set()));
  parents.add(parent);
}

/**
 * Clears the cached snapshot for a raw value that was just written to, and climbs to
 * every parent whose own cached snapshot embedded it, so a write to a deeply nested value
 * invalidates every cached ancestor that still holds a snapshot. Mirrors ObservableNode's
 * `InvalidateSnapshotForValue`.
 */
function InvalidateSnapshotForValue(value: object) {
  valueSnapshotCache.delete(value);
  const parents = valueSnapshotHierarchy.get(value);
  if (parents === undefined) return;
  valueSnapshotHierarchy.delete(value);
  for (const parent of parents)
    if (valueSnapshotCache.has(parent)) InvalidateSnapshotForValue(parent);
}

/**
 * An immutable snapshot of a raw tree value (arrays and plain objects; other values are
 * returned as-is), cached per raw value and reused until a write invalidates it. Mirrors
 * ObservableNode's `CreateSnapshot`: a rebuild makes new containers but reuses the cached
 * snapshots of unchanged children. A keyed child is read through the root entity `keyFunc`
 * resolves it to, the parallel of ObservableNode's `alias`, so every reference to the same
 * entity shares one snapshot and a write to the entity invalidates every holder.
 */
function CreateSnapshot(
  source: any,
  keyFunc: ((val: any) => string) | undefined,
  value: any,
): any {
  if (JsonType(value) === "value") return value;

  const cached = valueSnapshotCache.get(value);
  if (cached !== undefined) return cached;

  let snapshot: any;
  if (Array.isArray(value)) {
    snapshot = new Array(value.length);
    for (let x = 0; x < value.length; x++)
      snapshot[x] = ChildSnapshot(source, keyFunc, value, value[x]);
  } else {
    snapshot = {};
    const keys = Object.keys(value);
    for (let x = 0; x < keys.length; x++)
      snapshot[keys[x]] = ChildSnapshot(source, keyFunc, value, value[keys[x]]);
  }

  valueSnapshotCache.set(value, snapshot);
  return snapshot;
}

/**
 * A child's snapshot, linking the child to its parent so a write to the child invalidates
 * the parent. A keyed child's snapshot comes from its root entity (`source[key]`), so the
 * root is linked too; the parent's own embedded copy stays linked because a positional
 * write (one that changes which entity a slot holds) mutates that copy in place.
 */
function ChildSnapshot(
  source: any,
  keyFunc: ((val: any) => string) | undefined,
  parent: object,
  child: unknown,
) {
  if (JsonType(child) === "value") return child;

  CreateSnapshotLink(child as object, parent);

  if (keyFunc) {
    const key = keyFunc(child);
    if (key) {
      const root = source[key];
      if (root !== undefined && root !== child) {
        CreateSnapshotLink(root, parent);
        return CreateSnapshot(source, keyFunc, root);
      }
    }
  }

  return CreateSnapshot(source, keyFunc, child);
}

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
 * @param source - The root tree object
 * @param keyFunc - Optional function to extract a key from objects, for reading through roots
 * @param projections - Dependency-sorted projection entries, from `BuildProjectionOrder`
 * @param memo - Per-tree, cross-call memo of each projection's last-read values, by id,
 *   positional with its `reads`
 * @returns Diff entries for every projection whose result changed
 */
function RunProjections(
  source: any,
  keyFunc: ((val: any) => string) | undefined,
  projections: DiffTreeProjectionEntry[],
  memo: Map<string, any[]>,
): JsonDiffResult {
  const diffResult: JsonDiffResult = [];

  for (let x = 0; x < projections.length; x++) {
    const { id, reads, projection } = projections[x];
    const values: any[] = [];
    const keys: string[] = [];
    let allPathsExist = true;
    let y = 0;
    for (; allPathsExist && y < reads.length && !reads[y].endsWith("*"); y++) {
      const read = reads[y];
      const [value, found] = GetPathValue(source, read, keyFunc);
      allPathsExist = found;
      keys.push(read);
      values.push((found && CreateSnapshot(source, keyFunc, value)) || value);
    }

    if (y < reads.length && reads[y].endsWith("*")) {
      const prefix = reads[y].slice(0, reads[y].length - 1);
      const matchedKeys = Object.keys(source).filter(key => key.startsWith(prefix));
      for (let z = 0; z < matchedKeys.length; z++) {
        // No keyFunc passed because dot paths are not supported for wildcard paths
        const [value, found] = GetPathValue(source, matchedKeys[z]);
        allPathsExist = allPathsExist && found;
        keys.push(matchedKeys[z]);
        values.push((found && CreateSnapshot(source, keyFunc, value)) || value);
      }
    }

    if (allPathsExist) {
      const priorValues = memo.get(id);
      if (!ArraysEqual(priorValues, values)) {
        const result = projection(keys, ...values);
        memo.set(id, values);

        // The same diff-and-apply UpdateSource uses for any other write, so a keyed entity
        // embedded in a projection's result is flattened to its own root like any other write,
        // and the diff reported here is unfiltered, the same as DiffPath/DiffBatch return.
        diffResult.push(
          ...UpdateSource(
            source,
            PROJECTION_PREFIX + id,
            result,
            true,
            keyFunc,
          ),
        );
      }
    }
  }

  return diffResult;
}

function ResolveKeyed(source: any, value: any, keyFunc?: (val: any) => string | undefined) {
  if (keyFunc === undefined || JsonType(value) === 'value')
    return value;

  const key = keyFunc(value);
  return (key && source[key]) ?? value;
}

/**
 * Resolves a path to its keyed root object if applicable.
 * Searches up the path to find an object with a key from keyFunc.
 * @param source - The source object
 * @param path - Dot-separated path
 * @param keyFunc - Function to extract key from objects
 * @returns The resolved path (possibly shortened to root key)
 */
function ResolveKeyPath(
  source: any,
  path: string,
  keyFunc: (val: any) => string,
) {
  const parts = path.split(".");
  const pathValues = new Array(parts.length - 1);

  let curr = source;
  for (let x = 0; x < parts.length - 1; x++) {
    curr = curr[parts[x]];
    pathValues[x] = curr;
  }

  let y = pathValues.length - 1;

  for (
    ;
    y >= 0 && !(JsonType(pathValues[y]) === "object" && keyFunc(pathValues[y]));
    y--
  ) {}

  if (y >= 0) {
    const key = keyFunc(pathValues[y]);
    parts.splice(0, y + 1, key);
    return parts.join(".");
  }

  return path;
}

/**
 * Updates the source with a new value at the specified path and computes diffs.
 * Also updates any keyed objects that were nested in the value.
 * @param source - The source object to update
 * @param path - Dot-separated path to update
 * @param value - The new value
 * @param keyFunc - Optional function to extract keys from objects
 * @returns Diff results showing all changes made
 */
function UpdateSource(
  source: any,
  path: string,
  value: unknown,
  flatten: boolean,
  keyFunc?: (val: any) => string,
) {
  const diffResult: JsonDiffResult = [];
  if (keyFunc) {
    const keyPath = ResolveKeyPath(source, path, keyFunc);
    if (keyPath !== path) {
      const keyDiffResult = UpdateSource(
        source,
        keyPath,
        value,
        flatten,
        keyFunc,
      );
      diffResult.push(...keyDiffResult);
    }
  }

  const [sourceValue] = GetPathValue(source, path);
  JsonDiff(value, sourceValue, path, diffResult);

  if (flatten && keyFunc) {
    let flattened: any = {};
    flattened = FlattenValue(flattened, value, keyFunc) as any;
    flattened = JsonDeepClone(flattened);
    const keys = Object.keys(flattened);
    for (let x = 0; x < keys.length; x++)
      JsonDiff(flattened[keys[x]], source[keys[x]], keys[x], diffResult);
  }

  const filteredDiffResult = diffResult.filter(
    (diff) => diff.value !== undefined,
  );
  for (let x = 0; x < filteredDiffResult.length; x++) {
    SetPathValue(
      source,
      filteredDiffResult[x].path,
      filteredDiffResult[x].value,
    );
  }

  return diffResult;
}

function SpliceSource(
  source: any,
  path: string,
  start: number,
  deleteCount: number | undefined,
  items: any[],
  flatten: boolean,
  keyFunc?: (val: any) => string,
): DiffSpliceResult {
  const [sourceValue, found] = GetPathValue(source, path);
  if (!found) throw `Value not found at path ${path}`;

  if (!Array.isArray(sourceValue))
    throw `Value found at path ${path} is not an array`;

  deleteCount ??= sourceValue.length - start;
  const spliceResult: DiffSpliceResult = {
    path: path.split("."),
    start,
    deleteCount,
    spliceResult: null,
    diffResult: [] as JsonDiffResult,
  };
  spliceResult.spliceResult = sourceValue.splice(start, deleteCount, ...items);
  InvalidateSnapshotForValue(sourceValue);

  if (flatten && keyFunc) {
    // Register the keyed entities the new items carry, diffed against the roots
    // already held: a new entity is added whole, one re-inserted unchanged (an undo)
    // produces no diff, so its readers aren't woken.
    const flattened = JsonDeepClone(FlattenValue({}, items, keyFunc)) as {
      [key: string]: unknown;
    };
    const keys = Object.keys(flattened);
    for (let x = 0; x < keys.length; x++)
      JsonDiff(
        flattened[keys[x]],
        source[keys[x]],
        keys[x],
        spliceResult.diffResult,
      );
  }

  const filteredDiffResult = spliceResult.diffResult.filter(
    (diff) => diff.value !== undefined,
  );
  for (let x = 0; x < filteredDiffResult.length; x++) {
    SetPathValue(
      source,
      filteredDiffResult[x].path,
      filteredDiffResult[x].value,
    );
  }

  return spliceResult;
}

/**
 * Diff tree implementation. Maintains root state and computes diffs for path/value updates.
 * Used directly by `DiffSync`, and is the building block for a `DiffAsync` worker entry
 * file: construct one with the desired `keyFunc`/`projections` and connect it to the worker
 * thread with `ConnectWorkerToDiffTree` (see `defaultDiffTreeWorker.ts` for the no-argument
 * case, or a custom entry file when either is needed).
 */
export class DiffTree {
  private rootState: {} = {};
  private projectionOrder: DiffTreeProjectionEntry[];
  private projectionMemo = new Map<string, any[]>();

  /**
   * Creates a DiffTree instance.
   * @param keyFunc - Optional function to extract a key from objects
   * @param projections - Optional map of derived-value projections, keyed by id. Cycles
   *   and reads of an unregistered projection id are rejected here, at construction.
   */
  constructor(
    private keyFunc?: { (val: any): string },
    projections?: DiffTreeProjectionMap,
  ) {
    this.projectionOrder = projections ? BuildProjectionOrder(projections) : [];
  }

  private RunProjections(): JsonDiffResult {
    if (this.projectionOrder.length === 0) return [];
    return RunProjections(
      this.rootState,
      this.keyFunc,
      this.projectionOrder,
      this.projectionMemo,
    );
  }

  /**
   * Computes diffs for a batch of path/value pairs.
   * @param data - Array of objects with path and value properties
   * @returns Combined diff results
   */
  public DiffBatch(data: Array<{ path: string; value: any }>) {
    const results = data
      .map(({ path, value }) =>
        UpdateSource(this.rootState, path, value, true, this.keyFunc),
      )
      .flat(1);
    results.push(...this.RunProjections());
    return results;
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  public DiffPath(path: string, value: any, flatten = true) {
    const results = UpdateSource(
      this.rootState,
      path,
      value,
      flatten,
      this.keyFunc,
    );
    results.push(...this.RunProjections());
    return results;
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[],
    flatten = true,
  ) {
    const spliceResult = SpliceSource(
      this.rootState,
      path,
      start,
      deleteCount,
      items,
      flatten,
      this.keyFunc,
    );
    spliceResult.diffResult.push(...this.RunProjections());
    return spliceResult;
  }

  /**
   * Retrieves the current value at a path.
   * @param path - Dot-separated path to the value
   * @returns The value at the specified path
   */
  public GetPath(path: string) {
    const [value] = GetPathValue(this.rootState, path, this.keyFunc);
    return value;
  }

  /**
   * Returns an immutable, cached snapshot of the value at a path (empty string for the
   * whole tree). Not part of `IDiffTree`; internal, for a future feature.
   * @param path - Dot-separated path to the value
   */
  public Snapshot(path: string) {
    const [value, found] = GetPathValue(this.rootState, path, this.keyFunc);
    if (!found) throw `Unable to get snapshot for path ${path}`;

    return CreateSnapshot(this.rootState, this.keyFunc, value);
  }
}
