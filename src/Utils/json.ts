import { ArraysEqual } from "./array";

export type JsonWrite = {
  type: "write",
  path: (string | number)[],
  value: unknown
};

export type JsonMove = {
  type: "move",
  path: (string | number)[],
  sourceProp: string | number,
  targetProp: string | number
};

/**
 * Result of a JSON diff operation, containing paths and values that changed.
 * @template T - The type of the JSON value being diffed
 */
export type JsonDiffResult<T = unknown> = (JsonMove | JsonWrite)[];

const jsonProto = Object.getPrototypeOf({});
const arrayProto = Object.getPrototypeOf([]);
const strProto = Object.getPrototypeOf("");
const numProto = Object.getPrototypeOf(0);
const boolProto = Object.getPrototypeOf(false);

/**
 * Determines the JSON type of a value.
 * @param value - The value to check
 * @returns "value" for primitives/null/undefined, "object" for plain objects, "array" for arrays
 */
export function JsonType(value: any) {
  if (value === null || value === undefined) return "value";

  switch (Object.getPrototypeOf(value)) {
    case strProto:
    case numProto:
    case boolProto:
      return "value";
    case jsonProto:
      return "object";
    case arrayProto:
      return "array";
  }

  if (Array.isArray(value)) return "array";

  return "value";
}

/**
 * Deep merges a patch into a source value.
 * - If types don't match, returns the patch
 * - For objects: recursively merges properties, adds new properties
 * - For arrays: maps over patch, merging with corresponding source elements
 * @param source - The original value
 * @param patch - The value to merge into source
 * @returns The merged result
 */
export function JsonMerge(source: unknown, patch: unknown) {
  if (patch === undefined) return JsonDeepClone(source);

  const sourceType = JsonType(source);
  const patchType = JsonType(patch);

  if (sourceType !== patchType) return patch;

  switch (sourceType) {
    case "array": {
      const typedSource = source as unknown[];
      const typedPatch = patch as unknown[];

      const result = new Array(typedPatch.length);

      for (let x = 0; x < typedPatch.length; x++)
        result[x] = JsonMerge(typedSource[x], typedPatch[x]);

      return result;
    }
    case "object": {
      const typedSource = source as { [prop: string]: unknown };
      const typedPatch = patch as { [prop: string]: unknown };
      const sourceKeys = Object.keys(typedSource);
      const targetKeys = Object.keys(typedPatch).filter(
        (key) => !sourceKeys.includes(key),
      );

      const result = {} as { [prop: string]: unknown };
      for (let x = 0; x < sourceKeys.length; x++) {
        result[sourceKeys[x]] = JsonMerge(
          typedSource[sourceKeys[x]],
          typedPatch[sourceKeys[x]],
        );
      }

      for (let x = 0; x < targetKeys.length; x++) {
        result[targetKeys[x]] = typedPatch[targetKeys[x]];
      }

      return result;
    }
    default:
      return patch;
  }
}

/**
 * Creates a deep clone of a JSON-compatible value.
 * @template T - The type of the value to clone
 * @param value - The value to clone
 * @returns A deep clone of the value
 */
export function JsonDeepClone<T>(value: T, type = JsonType(value)): T {
  switch (type) {
    case "array": {
      const typed = value as unknown[];
      const result = new Array(typed.length);
      for (let x = 0; x < typed.length; x++)
        result[x] = JsonDeepClone(typed[x]);

      return result as T;
    }
    case "object": {
      const ret = {} as T;
      const keys = Object.keys(value as unknown as object) as (keyof T)[];
      for (let x = 0; x < keys.length; x++)
        ret[keys[x]] = JsonDeepClone(value[keys[x]]);

      return ret;
    }
    default:
      return value;
  }
}

/**
 * Applies a diff result to a root value in place: moves first, then writes.
 * @param resolve - Returns the object to walk into for `parent[prop]`; the walk stores it back at
 *   `parent[prop]` when it's a different object
 * @param assign - Assigns a written value (already cloned) to its parent
 * @param move - Assigns a moved value to its new slot. A move relocates a value that's already in
 *   the root, so it's kept separate from `assign`, which handles new values.
 */
export function JsonApplyDiff(
  root: any,
  diff: JsonDiffResult,
  /* resolve?: (parent: any, prop: string | number) => any, */
  assign?: (parent: any, prop: string | number, value: any) => void,
  /* move?: (parent: any, prop: string | number, value: any) => void */
) {
  const moves = diff.filter(function (diff) {
    return diff.type === "move";
  });
  JsonApplyMoves(root, moves, assign);

  const writes = diff.filter(function (diff) {
    return diff.type === "write";
  });
  JsonApplyWrites(root, writes, assign);
}

function DefaultAssign(parent: any, prop: string | number, value: any) {
  parent[prop] = value;
}

/**
 * Applies a diff result to a root value in place. A diff doesn't own its values (see JsonDiff),
 * so each value is deep-cloned before it's written: the root never shares an object with the
 * diff, the value it was computed from, or another record.
 * - A single record with an empty path replaces the root's contents, keeping its identity
 * - Otherwise each record's value is assigned at its path
 * @param root - The value to update; must be an object or array
 * @param diff - The diff result to apply
 * @param callback - Called with the object written to, the property written ("" when an array
 *   root is replaced), and whether that property is new to the object
 * @throws If a root replacement would change the root's JSON type, or the root is a primitive
 */
export function JsonApplyWrites(
  root: any,
  diff: JsonWrite[],
  assign: (parent: any, prop: string | number, value: any) => void = DefaultAssign
) {
  const pathTuples: [string | number, unknown][] = [["", root]];
  if (diff.length === 1 && diff[0].path.length === 0) {
    const diffRow = diff[0];
    const diffPatch = JsonDeepClone(diffRow.value);

    const type = JsonType(root);
    const patchType = JsonType(diffPatch);

    if (type !== patchType)
      throw new Error("Unable to change type of root value");

    switch (type) {
      case "array": {
        (root as any[]).splice(0, root.length, ...(diffPatch as any[]));
        break;
      }
      case "object": {
        const keys = Object.keys(root);
        const patchKeys = Object.keys(diffPatch);
        for (let x = 0; x < keys.length; x++)
          if (!patchKeys.includes(keys[x]))
            delete root[keys[x]];

        Object.assign(root, diffPatch);
        break;
      }
      case "value":
        throw new Error("Unable to replace root value type: " + root);
    }


    return;
  }

  for (let x = 0; x < diff.length; x++) {
    const { path, value } = diff[x];

    let y = 0;
    for (; y < path.length - 1; y++) {
      const property = path[y];
      const value = pathTuples[y][1] as any;

      const tupleIndex = y + 1;
      if (pathTuples.length <= tupleIndex) {
        const childValue = value[property]; // resolve(value, property);
        value[property] = childValue;
        pathTuples.push([property, childValue]);
      }
      else if (pathTuples[tupleIndex][0] !== property) {
        pathTuples[tupleIndex][0] = property;
        // value[property] = pathTuples[tupleIndex][1] = resolve(value, property);

        const next = tupleIndex + 1;
        if (next < pathTuples.length) pathTuples[next][0] = null;
      }
    }

    const assignValue = pathTuples[y][1] as any;
    const assignData = JsonDeepClone(value);
    assign(assignValue, path[y], assignData);
  }
}

function ReadPath(value: any, path: (string | number)[]) { // , resolve: (parent: any, prop: string | number) => any) {
  let curr = value;
  let x = 0;
  for (; curr && x < path.length; x++)
    curr = curr[path[x]];

  return curr;
}

function JsonApplyMoves(
  root: any,
  diff: JsonMove[],
  move: (parent: any, prop: string | number, value: any) => void = DefaultAssign
) {
  if (diff.length === 0)
    return;

  let moveRoot = null;
  let basePath = null;
  let copy = null;
  for (let x = diff.length - 1; x >= 0; x--) {
    if (!ArraysEqual(diff[x].path, basePath)) {
      basePath = diff[x].path;
      moveRoot = ReadPath(root, diff[x].path); //, resolve);
      const type = JsonType(moveRoot);
      copy = type === "array" ? moveRoot.slice() : type === "object" ? Object.assign({}, moveRoot) : root;
    }

    const sourceValue = copy[diff[x].sourceProp];
    move(moveRoot, diff[x].targetProp, sourceValue);
  }
}

/**
 * Computes the differences between two JSON values.
 * Returns an array of paths and values that changed from oldValue to newValue. A record doesn't
 * own its value: it references `newValue`'s objects, so two records can share one, and
 * JsonApplyDiff clones each value as it's applied.
 * @template T - The type of the JSON values being compared
 * @param newValue - The new value
 * @param oldValue - The old value to compare against
 * @param rootPath - Optional dot-separated string for the base path (for internal recursion)
 * @param initResult - Optional initial result array (for internal recursion)
 * @returns Array of change records with path and new value
 */
export function JsonDiff<T>(
  newValue: T,
  oldValue: T,
  rootPath?: string,
  initResult?: JsonDiffResult<T>,
): JsonDiffResult<T> {
  const result: JsonDiffResult<T> = initResult ?? [];
  const startPath = rootPath ? rootPath.split(".") : [];
  JsonDiffRecursive(startPath, newValue, oldValue, result);
  result.sort(function (a, b) {
    const aNum = a.type === "write" ? 1 : 0;
    const bNum = b.type === "write" ? 1 : 0;
    return aNum - bNum;
  })

  return result;
}

/**
 * Recursive helper for JsonDiff that traverses and compares values.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New value at this path
 * @param oldValue - Old value at this path
 * @param resp - Result array to populate with changes
 * @returns true if the entire subtree changed, false otherwise
 */
function JsonDiffRecursive(
  path: (string | number)[],
  newValue: any,
  oldValue: any,
  resp: JsonDiffResult<unknown>,
): boolean {
  if (newValue === oldValue) return false;

  const newType = JsonType(newValue);
  const oldType = JsonType(oldValue);

  const changedPathLength = resp.length;
  let allChildrenChanged = true;

  if (newType === oldType)
    switch (newType) {
      case "array": {
        allChildrenChanged = JsonDiffArrays(path, newValue, oldValue, resp);
        break;
      }
      case "object": {
        allChildrenChanged = JsonDiffObjects(path, newValue, oldValue, resp);
        break;
      }
    }

  if (allChildrenChanged) {
    resp.length > changedPathLength && resp.splice(changedPathLength);
    resp.push({
      type: "write",
      path,
      value: newValue,
    });
    return true;
  }

  return false;
}

const MOVE_SYMBOL = Symbol("MOVE_SYMBOL");

/**
 * Compares two arrays and records differences.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New array
 * @param oldValue - Old array to compare against
 * @param resp - Result array to populate with changes
 * @returns true if the entire array changed, false otherwise
 */
function JsonDiffArrays(
  path: (string | number)[],
  newValue: any[],
  oldValue: any[],
  resp: JsonDiffResult<unknown>,
) {
  if (oldValue.length === 0 || newValue.length === 0) {
    return oldValue.length !== newValue.length;
  }

  const newArraySlice = newValue.slice();
  const oldArraySlice = oldValue.slice();

  for (let x = 0; x < oldValue.length; x++) {
    const newIndex = newValue.indexOf(oldValue[x]);
    if (newIndex >= 0 && newIndex !== x) {
      oldArraySlice[x] = MOVE_SYMBOL;
      newArraySlice[newIndex] = MOVE_SYMBOL;

      resp.push({
        type: "move",
        path: path,
        sourceProp: x,
        targetProp: newIndex
      });
    }
  }

  for (let x = 0; x < newValue.length; x++) {
    const arrayPath = path.concat(x);
    if (newArraySlice[x] !== MOVE_SYMBOL)
      JsonDiffRecursive(arrayPath, newArraySlice[x], oldArraySlice[x], resp);
  }

  if (oldValue.length !== newValue.length)
    resp.push({
      type: "write",
      path: path.concat("length"),
      value: newValue.length,
    });

  return false;
}

/**
 * Compares two objects and records differences.
 * Uses sorted keys and two-pointer technique for efficient comparison.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New object
 * @param oldValue - Old object to compare against
 * @param resp - Result array to populate with changes
 * @returns true if the entire object should be replaced (keys removed), false otherwise
 */
function JsonDiffObjects(
  path: (string | number)[],
  newValue: { [key: string]: any },
  oldValue: { [key: string]: any },
  resp: JsonDiffResult<unknown>,
) {
  const newKeys = Object.keys(newValue).sort();
  const oldKeys = Object.keys(oldValue).sort();

  if (newKeys.length === 0 && oldKeys.length === 0) return false;

  if (newKeys.length < oldKeys.length) return true;

  let newKeyIndex = 0;
  let oldKeyIndex = 0;
  while (newKeyIndex < newKeys.length) {
    const childPath = path.concat(newKeys[newKeyIndex]);
    if (
      oldKeyIndex < oldKeys.length &&
      newKeys[newKeyIndex] === oldKeys[oldKeyIndex]
    ) {
      JsonDiffRecursive(
        childPath,
        newValue[newKeys[newKeyIndex]],
        oldValue[oldKeys[oldKeyIndex]],
        resp,
      );
      oldKeyIndex++;
    } else if (newValue[newKeys[newKeyIndex]] !== undefined) {
      resp.push({
        type: "write",
        path: childPath,
        value: newValue[newKeys[newKeyIndex]],
      });
    }

    newKeyIndex++;
  }

  if (oldKeyIndex < oldKeys.length) return true;

  return false;
}
