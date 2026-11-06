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
      const tupleIndex = y + 1;

      if (tupleIndex >= pathTuples.length || pathTuples[tupleIndex][0] !== property) {
        const parent = pathTuples[y][1] as any;
        const child = parent[property];

        if (tupleIndex < pathTuples.length) {
          pathTuples[tupleIndex] = [property, child];
          const next = tupleIndex + 1;
          if (next < pathTuples.length) pathTuples[next][0] = null;
        }
        else
          pathTuples.push([property, child]);
      }
    }

    if (y >= path.length - 1) {
      const assignValue = pathTuples[y][1] as any;
      const assignData = JsonDeepClone(value);
      assign(assignValue, path[y], assignData);
    }
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
 * Whether two JSON values differ, without recording how: it stops at the first difference and
 * skips any subtree both values share, so it costs no more than walking what differs. An
 * undefined property counts as absent, as in JSON. Arrays are compared by position.
 * @param newValue - The new value
 * @param oldValue - The old value to compare against
 * @returns true when the values differ
 */
export function JsonHasChanges(newValue: unknown, oldValue: unknown): boolean {
  if (newValue === oldValue) return false;

  const type = JsonType(newValue);
  if (type !== JsonType(oldValue)) return true;

  switch (type) {
    case "array": {
      const newArray = newValue as unknown[];
      const oldArray = oldValue as unknown[];
      if (newArray.length !== oldArray.length) return true;

      for (let x = 0; x < newArray.length; x++)
        if (JsonHasChanges(newArray[x], oldArray[x])) return true;

      return false;
    }
    case "object": {
      const newObject = newValue as { [key: string]: unknown };
      const oldObject = oldValue as { [key: string]: unknown };
      const newKeys = Object.keys(newObject);
      let defined = 0;
      for (let x = 0; x < newKeys.length; x++) {
        const value = newObject[newKeys[x]];
        if (value === undefined) continue;

        defined++;
        if (!Object.hasOwn(oldObject, newKeys[x]) || JsonHasChanges(value, oldObject[newKeys[x]])) return true;
      }

      // Every defined key of the new value is in the old one, so they differ only when the old
      // one defines more
      const oldKeys = Object.keys(oldObject);
      if (oldKeys.length === defined) return false;

      let oldDefined = 0;
      for (let x = 0; x < oldKeys.length; x++)
        if (oldObject[oldKeys[x]] !== undefined) oldDefined++;

      return oldDefined !== defined;
    }
    default:
      return true;
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
  JsonDiffInto(newValue, oldValue, rootPath ? rootPath.split(".") : [], result);
  return JsonDiffOrder(result);
}

/**
 * Appends the differences between two JSON values to `result`, unordered: diffing several values
 * into one result, order it once at the end with JsonDiffOrder.
 * @param path - The path the values are at
 * @returns The result
 */
export function JsonDiffInto<T>(
  newValue: T,
  oldValue: T,
  path: (string | number)[],
  result: JsonDiffResult<T>,
): JsonDiffResult<T> {
  JsonDiffRecursive(path, newValue, oldValue, result);
  return result;
}

/**
 * Orders a diff result in place, moves before writes, each in the order they were found.
 * @returns The result
 */
export function JsonDiffOrder<T>(result: JsonDiffResult<T>): JsonDiffResult<T> {
  let moves = 0;
  for (let x = 0; x < result.length; x++)
    if (result[x].type === "move") moves++;

  if (moves === 0 || moves === result.length)
    return result;

  const writes: JsonDiffResult<T> = [];
  let next = 0;
  for (let x = 0; x < result.length; x++)
    if (result[x].type === "move") result[next++] = result[x];
    else writes.push(result[x]);

  for (let x = 0; x < writes.length; x++)
    result[next++] = writes[x];

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
 * Past this many elements after the common prefix, an array diff finds where each old element
 * went through a map of the new array instead of `indexOf`, which is quadratic.
 */
const MOVE_SCAN_LIMIT = 32;

/**
 * Where each old element is in the new array from `startIndex` to `endIndex`, as `indexOf` finds
 * it: the first index holding the same value, or -1.
 */
function NewIndexOf(newValue: any[], startIndex: number, endIndex: number) {
  if (endIndex - startIndex <= MOVE_SCAN_LIMIT)
    return (value: any) => {
      const index = newValue.indexOf(value, startIndex);
      return index < endIndex ? index : -1;
    };

  const indexes = new Map<any, number>();
  // From the end, so the first index of a repeated value is the one kept
  for (let x = endIndex - 1; x >= startIndex; x--)
    indexes.set(newValue[x], x);

  // indexOf never finds NaN, which a Map does
  return (value: any) => value !== value ? -1 : indexes.get(value) ?? -1;
}

export enum SPLICE_ACTION {
  MOVE = 1,
  INSERT = 2
}

export function JsonDiffArraySpliceV2(
  newValue: any[],
  oldValue: any[],
  resp: any[]
) {

  const oldValueActions = [] as any[];

  const oldIndexMap = new Map<any, number[]>();
  for (let x = 0; x < oldValue.length; x++) {
    const indexArray = oldIndexMap.get(oldValue[x]) ?? [];
    indexArray.push(x);
    oldIndexMap.set(oldValue[x], indexArray);
  }

  let indexOffset = 0;
  let splice: any = null;

  for (let x = 0; x < newValue.length; x++) {
    if (x + indexOffset < oldValue.length && oldValue[x + indexOffset] === newValue[x]) {
      // KEEP. Break splice
      if (splice !== null) {
        oldValueActions.push(splice);
        splice = null;
      }
      continue;
    }

    splice ??= { index: x, delete: 0, insert: [] as any[] };
    const indexArray = oldIndexMap.get(newValue[x]);
    let indexArrayIndex = 0;
    for (; indexArray && indexArrayIndex < indexArray.length && x + indexOffset > indexArray[indexArrayIndex]; indexArrayIndex++) {}

    // If we found a matching element later, let's delete to it and reset
    // if (x + nextIndexOffset < oldValue.length) {
    if (indexArray && indexArrayIndex < indexArray.length) {
      const deleteCount = indexArray[indexArrayIndex] - (x + indexOffset);
      splice.delete += deleteCount;
      indexOffset += deleteCount;

      oldValueActions.push(splice);
      splice = null;
    }
    else {
      indexOffset--;
      const moveFromIndex = oldIndexMap.get(newValue[x]);
      if (moveFromIndex !== undefined) {
        splice.insert.push({ type: SPLICE_ACTION.MOVE, from: moveFromIndex[0] });
      }
      else
        splice.insert.push({ type: SPLICE_ACTION.INSERT, data: newValue[x] });
    }
  }

  if (splice !== null) {
    oldValueActions.push(splice);
    splice = null;
  }

  return oldValueActions;
}

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

  let startIndex = 0;
  for (; startIndex < newValue.length && startIndex < oldValue.length && newValue[startIndex] === oldValue[startIndex]; startIndex++) { }

  // Arrays are equal, no diffing required
  if (startIndex === newValue.length && startIndex === oldValue.length)
    return false;

  // With the same length, the elements after the last change are where they were: only the
  // middle is diffed, and an element moved within it is found there
  let oldEnd = oldValue.length;
  let newEnd = newValue.length;
  if (oldEnd === newEnd)
    for (; newEnd > startIndex && newValue[newEnd - 1] === oldValue[newEnd - 1]; newEnd--, oldEnd--) { }

  // The indexes moves come from and go to: a moved-to slot isn't diffed, and a moved-from slot
  // isn't diffed against
  const movedFrom = new Set<number>();
  const movedTo = new Set<number>();
  const newIndexOf = NewIndexOf(newValue, startIndex, newEnd);
  for (let x = startIndex; x < oldEnd; x++) {
    const newIndex = newIndexOf(oldValue[x]);
    if (newIndex >= 0 && newIndex !== x) {
      movedFrom.add(x);
      movedTo.add(newIndex);

      resp.push({
        type: "move",
        path: path,
        sourceProp: x,
        targetProp: newIndex
      });
    }
  }

  for (let x = startIndex; x < newEnd; x++) {
    if (!movedTo.has(x))
      JsonDiffRecursive(path.concat(x), newValue[x], movedFrom.has(x) ? MOVE_SYMBOL : oldValue[x], resp);
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
