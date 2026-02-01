import { JsonDiffFactoryResult, JsonDiffResult } from "../../Utils/json";

/**
 * Represents a method call for worker-based diff operations.
 */
export interface IDiffMethod {
  /** The method to call */
  method: "create" | "diffpath" | "diffbatch" | "updatepath" | "getpath";
  /** Arguments for the method call */
  arguments: Array<any>;
}

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
  DiffPath(path: string, value: any): JsonDiffResult;
}

/**
 * Constructor interface for IDiffTree.
 */
export interface IDiffTreeConstructor {
  /**
   * Creates a new IDiffTree instance.
   * @param keyFunc - Optional function to extract a key from a value
   */
  new (keyFunc?: { (val: any): string }): IDiffTree;
}

/**
 * Factory function that creates a DiffTree class.
 * Can operate in worker mode for async operations.
 * @param jsonDiffFactory - Optional factory for JSON diff utilities
 * @param worker - If true, sets up worker message handling
 * @returns DiffTree constructor
 */
export function DiffTreeFactory(
  jsonDiffFactory?: () => JsonDiffFactoryResult,
  worker?: boolean,
) {
  const { JsonDiff, JsonType, JsonDeepClone } = jsonDiffFactory();

  const ctx: Worker = this as any;
  if (worker && ctx) {
    let diffTree: DiffTree = null;

    ctx.onmessage = function (event: any) {
      const data = event.data as IDiffMethod;
      switch (data.method) {
        case "create": {
          const keyFunc = data.arguments[0]
            ? eval(data.arguments[0])
            : undefined;
          diffTree = new DiffTree(keyFunc);
          ctx.postMessage(null);
          break;
        }
        case "diffpath": {
          const diff = diffTree.DiffPath(data.arguments[0], data.arguments[1]);
          ctx.postMessage(diff);
          break;
        }
        case "diffbatch": {
          const diff = diffTree.DiffBatch(data.arguments[0]);
          ctx.postMessage(diff);
          break;
        }
        case "getpath": {
          const ret = diffTree.GetPath(data.arguments[0]);
          ctx.postMessage(ret);
          break;
        }
      }
    };
  }

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
  function GetPathValue(source: any, path: string) {
    if (path === "") return source;

    const parts = path.split(".");
    let curr = source;
    for (let x = 0; x < parts.length; x++) curr = curr[parts[x]];

    return curr;
  }

  /**
   * Sets a value in a source object at the specified path.
   * @param source - The source object
   * @param path - Array of path segments (strings for keys, numbers for indices)
   * @param value - The value to set
   */
  function SetPathValue(
    source: any,
    path: (string | number)[],
    value: unknown,
  ) {
    if (path.length === 0) return;

    let curr = source;
    let x = 0;
    for (; x < path.length - 1; x++) curr = curr[path[x]];

    curr[path[x]] = value;
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
      y >= 0 &&
      !(JsonType(pathValues[y]) === "object" && keyFunc(pathValues[y]));
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
    keyFunc?: (val: any) => string,
  ) {
    const diffResult: JsonDiffResult = [];
    if (keyFunc) {
      const keyPath = ResolveKeyPath(source, path, keyFunc);
      if (keyPath !== path) {
        const keyDiffResult = UpdateSource(source, keyPath, value, keyFunc);
        diffResult.push(...keyDiffResult);
      }
    }

    const sourceValue = GetPathValue(source, path);
    JsonDiff(value, sourceValue, path, diffResult);

    if (keyFunc) {
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

  /**
   * Internal diff tree implementation.
   * Maintains root state and computes diffs for path/value updates.
   * @private
   */
  class DiffTree implements IDiffTree {
    private rootState: {} = {};

    /**
     * Creates a DiffTree instance.
     * @param keyFunc - Optional function to extract a key from objects
     */
    constructor(private keyFunc?: { (val: any): string }) {}

    /**
     * Computes diffs for a batch of path/value pairs.
     * @param data - Array of objects with path and value properties
     * @returns Combined diff results
     */
    public DiffBatch(data: Array<{ path: string; value: any }>) {
      const results = data
        .map(({ path, value }) => this.DiffPath(path, value))
        .flat(1);
      return results;
    }

    /**
     * Computes the diff between a new value and the current value at a path.
     * @param path - Dot-separated path to the value
     * @param value - The new value to compare
     * @returns Diff results showing changes
     */
    public DiffPath(path: string, value: any) {
      return UpdateSource(this.rootState, path, value, this.keyFunc);
    }

    /**
     * Retrieves the current value at a path.
     * @param path - Dot-separated path to the value
     * @returns The value at the specified path
     */
    public GetPath(path: string) {
      return GetPathValue(this.rootState, path);
    }
  }

  return DiffTree as IDiffTreeConstructor;
}
