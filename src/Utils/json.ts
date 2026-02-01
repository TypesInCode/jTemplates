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

export type JsonDiffFactoryResult = ReturnType<typeof JsonDiffFactory>;

/**
 * Factory that creates JSON utility functions for diffing, merging, and cloning.
 * @returns Object containing JsonDiff, JsonType, JsonDeepClone, and JsonMerge functions
 */
export function JsonDiffFactory() {
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
  function JsonType(value: any) {
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
  function JsonMerge(source: unknown, patch: unknown) {
    if (patch === undefined) return JsonDeepClone(source);

    const sourceType = JsonType(source);
    const patchType = JsonType(patch);

    if (sourceType !== patchType) return patch;

    switch (sourceType) {
      case "array": {
        const typedSource = source as unknown[];
        const typedPatch = patch as unknown[];
        const result = typedPatch.map(function (patch, index): unknown {
          return JsonMerge(typedSource[index], patch);
        });

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
  function JsonDeepClone<T>(value: T): T {
    const type = JsonType(value);
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
   * Computes the differences between two JSON values.
   * Returns an array of paths and values that changed from oldValue to newValue.
   * @template T - The type of the JSON values being compared
   * @param newValue - The new value
   * @param oldValue - The old value to compare against
   * @param rootPath - Optional dot-separated string for the base path (for internal recursion)
   * @param initResult - Optional initial result array (for internal recursion)
   * @returns Array of change records with path and new value
   */
  function JsonDiff<T>(
    newValue: T,
    oldValue: T,
    rootPath?: string,
    initResult?: JsonDiffResult<T>,
  ): JsonDiffResult<T> {
    const result: JsonDiffResult<T> = initResult ?? [];
    const startPath = rootPath ? rootPath.split(".") : [];
    JsonDiffRecursive(startPath, newValue, oldValue, result);
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

    if (newValue.length !== oldValue.length)
      resp.push({
        path: path.concat("length"),
        value: newValue.length,
      });

    if (newValue.length > 0 || oldValue.length > 0) {
      for (let y = 0; y < newValue.length; y++) {
        const arrayPath = path.concat(y);
        const oldValueElem = oldValue[y];
        allChildrenChanged =
          JsonDiffRecursive(arrayPath, newValue[y], oldValueElem, resp) &&
          allChildrenChanged;
      }
    } else allChildrenChanged = false;

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

  return { JsonDiff, JsonType, JsonDeepClone, JsonMerge };
}

export const { JsonDiff, JsonType, JsonDeepClone, JsonMerge } =
  JsonDiffFactory();
