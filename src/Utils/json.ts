/**
 * Result of a JSON diff operation, containing paths and values that changed.
 * @template T - The type of the JSON value being diffed
 */
export type JsonDiffResult<T = unknown> = {
  /** Array path segments (strings for object keys, numbers for array indices) */
  path: (string | number)[];
  /** The new value at this path */
  value: unknown;
}[];

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

export function JsonApplyDiff(root: any, diff: JsonDiffResult, callback: (obj: any, prop: string, added: boolean) => void, skipUndefined = false) {
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
        callback(root, "", false);
        break;
      }
      case "object": {
        const keys = Object.keys(root);
        const patchKeys = Object.keys(diffPatch);
        for (let x = 0; x < keys.length; x++)
          if (!patchKeys.includes(keys[x]))
            delete root[keys[x]];

        Object.assign(root, diffPatch);
        for (let x = 0; x < patchKeys.length; x++)
          callback(root, patchKeys[x], keys.includes(patchKeys[x]));

        break;
      }
      case "value":
        throw new Error("Unable to replace root value type: " + root);
    }


    return;
  }

  const pathTuples: [string | number, unknown][] = [["", root]];
  for (let x = 0; x < diff.length; x++) {
    const { path, value } = diff[x];
    if (skipUndefined && value === undefined)
      continue;

    let y = 0;
    for (; y < path.length - 1; y++) {
      const property = path[y];
      const value = pathTuples[y][1];

      const tupleIndex = y + 1;
      if (pathTuples.length <= tupleIndex)
        pathTuples.push([property, (value as any)[property]]);
      else if (pathTuples[tupleIndex][0] !== property) {
        pathTuples[tupleIndex][0] = property;
        pathTuples[tupleIndex][1] = (value as any)[property];

        const next = tupleIndex + 1;
        if (next < pathTuples.length) pathTuples[next][0] = null;
      }
    }

    const assignValue = pathTuples[y][1] as any;
    const assignData = JsonDeepClone(value);
    const added = !Object.hasOwn(assignValue, path[y]);
    assignValue[path[y]] = assignData;
    callback(assignValue, path[y] as string, added);
  }
}

/**
 * Computes the differences between two JSON values.
 * Returns an array of paths and values that changed from oldValue to newValue. Each change
 * record's value is a deep clone of the new value: computing a diff doesn't take ownership of
 * the inputs, so a record never shares an object with `newValue` or with another record.
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
  const start = result.length;
  JsonDiffRecursive(startPath, newValue, oldValue, result);

  // Cloned once the records are final: the recursion replaces a subtree's records with one
  // record for the whole subtree when every child changed.
  for (let x = start; x < result.length; x++)
    result[x].value = JsonDeepClone(result[x].value);

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
      path,
      value: newValue,
    });
    return true;
  }

  return false;
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

  let allChildrenChanged = true;

  if (newValue.length > 0 || oldValue.length > 0) {
    for (let y = 0; y < newValue.length; y++) {
      const arrayPath = path.concat(y);
      const oldValueElem = oldValue[y];
      allChildrenChanged =
        JsonDiffRecursive(arrayPath, newValue[y], oldValueElem, resp) &&
        allChildrenChanged;
    }
  } else allChildrenChanged = false;

  if (newValue.length !== oldValue.length)
    resp.push({
      path: path.concat("length"),
      value: newValue.length,
    });

  return allChildrenChanged;
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
        path: childPath,
        value: newValue[newKeys[newKeyIndex]],
      });
    }

    newKeyIndex++;
  }

  if (oldKeyIndex < oldKeys.length) return true;

  return false;
}
