import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonMerge, JsonType, type JsonDiffResult } from "../../Utils/json";
import { ISnapshotState, Snapshot } from "../Tree/snapshot";
import { DiffSpliceResult, IDiffTreeProjectionHost, IDiffTreeProjector } from "./diffTree.types";

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
 * @param snapshotState - The tree's snapshot cache
 * @param path - Dot-separated path to update
 * @param value - The new value
 * @param keyFunc - Optional function to extract keys from objects
 * @returns Diff results showing all changes made
 */
function UpdateSource(
  source: any,
  snapshotState: ISnapshotState,
  path: string,
  value: unknown,
  keyFunc?: (val: any) => string,
) {
  let diffResult: JsonDiffResult = [];
  if (keyFunc) {
    const keyPath = ResolveKeyPath(source, path, keyFunc);
    if (keyPath !== path) {
      const keyDiffResult = UpdateSource(
        source,
        snapshotState,
        keyPath,
        value,
        keyFunc,
      );
      diffResult = diffResult.concat(keyDiffResult);
    }
  }

  const newDiffStart = diffResult.length;
  const [sourceValue] = GetPathValue(source, path);
  JsonDiff(value, sourceValue, path, diffResult);

  if (keyFunc) {
    let flattened: any = {};
    flattened = FlattenValue(flattened, value, keyFunc) as any;
    const keys = Object.keys(flattened);
    for (let x = 0; x < keys.length; x++)
      JsonDiff(flattened[keys[x]], source[keys[x]], keys[x], diffResult);
  }

  const newDiff = diffResult.slice(newDiffStart);
  JsonApplyDiff(source, newDiff, function (obj) {
    Snapshot.Invalidate(snapshotState, obj);
  }, true);

  return diffResult;
}

function PushSource(
  source: any,
  snapshotState: ISnapshotState,
  path: string,
  items: any[],
  keyFunc?: (val: any) => string
) {
  const [sourceValue, found] = GetPathValue(source, path);
  if (!found) throw `Value not found at path ${path}`;

  if (!Array.isArray(sourceValue))
    throw `Value found at path ${path} is not an array`;

  const results: JsonDiffResult = items.map(function (value, index) {
    return {
      path: `${path}.${sourceValue.length + index}`.split('.'),
      value
    };
  })

  if (items.length > 0)
    results.push({
      path: `${path}.length`.split('.'),
      value: sourceValue.length + items.length
    });

  if (keyFunc) {
    const flattened = FlattenValue({}, items, keyFunc);
    const keys = Object.keys(flattened);
    for (let x = 0; x < keys.length; x++)
      JsonDiff(
        flattened[keys[x]],
        source[keys[x]],
        keys[x],
        results,
      );
  }

  JsonApplyDiff(source, results, function (obj) {
    Snapshot.Invalidate(snapshotState, obj);
  }, true);

  return results;
}

function SpliceSource(
  source: any,
  snapshotState: ISnapshotState,
  path: string,
  start: number,
  deleteCount: number | undefined,
  items: any[],
  keyFunc?: (val: any) => string,
): DiffSpliceResult {
  const [sourceValue, found] = GetPathValue(source, path);
  if (!found) throw `Value not found at path ${path}`;

  if (!Array.isArray(sourceValue))
    throw `Value found at path ${path} is not an array`;

  deleteCount ??= sourceValue.length - start;
  // The result references the caller's items like a diff record (see JsonDiff). Spliced in
  // directly rather than through JsonApplyDiff, so the tree's copy is cloned here.
  const spliceResult: DiffSpliceResult = {
    path: path.split("."),
    start,
    items,
    deleteCount,
    spliceResult: null,
    diffResult: [] as JsonDiffResult,
  };
  spliceResult.spliceResult = sourceValue.splice(start, deleteCount, ...JsonDeepClone(items));
  Snapshot.Invalidate(snapshotState, sourceValue);

  if (keyFunc) {
    // Register the keyed entities the new items carry, diffed against the roots
    // already held: a new entity is added whole, one re-inserted unchanged (an undo)
    // produces no diff, so its readers aren't woken.
    const flattened = FlattenValue({}, items, keyFunc);
    const keys = Object.keys(flattened);
    for (let x = 0; x < keys.length; x++)
      JsonDiff(
        flattened[keys[x]],
        source[keys[x]],
        keys[x],
        spliceResult.diffResult,
      );
  }

  JsonApplyDiff(source, spliceResult.diffResult, function (obj) {
    Snapshot.Invalidate(snapshotState, obj);
  }, true);

  return spliceResult;
}

/**
 * Diff tree implementation. Maintains root state and computes diffs for path/value updates.
 * Used directly by `DiffSync`, and is the building block for a `StoreAsync` worker entry
 * file: construct one with the desired `keyFunc`/`projector` and connect it to the worker
 * thread with `ConnectWorkerToDiffTree` (see `defaultDiffTreeWorker.ts` for the no-argument
 * case, or a custom entry file when either is needed).
 */
export class DiffTree {
  private rootState: {} = {};
  private snapshotState: ISnapshotState;
  private projectionHost: IDiffTreeProjectionHost;

  /**
   * Creates a DiffTree instance.
   * @param keyFunc - Optional function to extract a key from objects
   * @param projector - Optional projection implementation, e.g. `SequentialProjector`.
   *   Keeps per-tree state, so it must not be shared with another tree.
   */
  constructor(
    private keyFunc?: { (val: any): string },
    private projector?: IDiffTreeProjector,
  ) {
    // Keyed children are read through their root entity in rootState
    const rootState = this.rootState;
    this.snapshotState = Snapshot.Create(
      keyFunc &&
        ((child: any) => {
          const key = keyFunc(child);
          return key ? rootState[key as keyof typeof rootState] : undefined;
        }),
    );
    const snapshotState = this.snapshotState;
    this.projectionHost = {
      snapshotState,
      Read: (path) => GetPathValue(rootState, path, keyFunc),
      ReadRoot: (key) => GetPathValue(rootState, key),
      RootKeys: () => Object.keys(rootState),
      Write: (path, value) => UpdateSource(rootState, snapshotState, path, value, keyFunc),
    };
  }

  /**
   * Brings every projection up to date with the tree.
   * @returns Diff entries for every projection whose result changed
   */
  public RunProjections(): JsonDiffResult {
    return this.projector?.Run(this.projectionHost) ?? [];
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  public DiffPath(path: string, value: any) {
    return UpdateSource(
      this.rootState,
      this.snapshotState,
      path,
      value,
      this.keyFunc,
    );
  }

  public PatchPath(path: string, patch: any) {
    const value = this.Snapshot(path);
    const merged = JsonMerge(value, patch);
    return UpdateSource(
      this.rootState,
      this.snapshotState,
      path,
      merged,
      this.keyFunc
    );
  }

  public PushPath(path: string, items: unknown[]) {
    return PushSource(this.rootState, this.snapshotState, path, items, this.keyFunc);
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[],
  ) {
    return SpliceSource(
      this.rootState,
      this.snapshotState,
      path,
      start,
      deleteCount,
      items,
      this.keyFunc,
    );
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

    return Snapshot.Get(this.snapshotState, value);
  }
}
