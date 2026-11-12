import { JsonDeepClone, JsonDiffResult, JsonType } from "../../Utils/json";
import { ObservableNode } from "../Tree/observableNode";
import { Opaque } from "../Tree/opaque";

/** Options shared by `StoreSync` and `StoreAsync` */
export interface IStoreOptions {
  /**
   * Root keys the store holds whole, as an `Opaque`: a written root or a projection's
   * `$projection_<key>`. `Get` returns such a root's raw value, never proxied, the same reference
   * until the root is written again, and only that write updates its readers. Treat the value as
   * read-only: a change made inside it notifies no one. An opaque root can't be read through a
   * key (`keyFunc`). The store tells its `DiffTree` (`DiffTree.MarkOpaque`), which writes each one
   * whole instead of diffing inside it. Write the raw value: the store boxes it, and an `Opaque`
   * written to a store isn't opened.
   */
  opaque?: readonly string[];
}

/**
 * Base class for reading observable data: holds root objects as ObservableNode instances
 * and applies diff results to them. Subclasses decide where the diffs come from: `Store`
 * adds the write methods, and `PushStore` takes them from a `DiffTreeWriter`.
 *
 * @see Store
 * @see PushStore
 */
export abstract class ReadStore {

  private rootMap = new Map<string | number, any>();
  private createNode: <T>(data: T, unwrapValue?: boolean) => T;
  /** Root keys held whole, see `IStoreOptions.opaque` */
  protected readonly opaque: ReadonlySet<string | number>;

  /**
   * Creates an instance of ReadStore.
   * @param keyFunc Optional function to generate a key for a given data value.
   * When provided, enables alias functionality where values can reference other root objects.
   * @param opaque Root keys held whole, see `IStoreOptions.opaque`.
   */
  constructor(protected keyFunc?: (value: any) => string | undefined, opaque: readonly string[] = []) {
    this.opaque = new Set(opaque);
    const aliasFunc =
      keyFunc &&
      ((value: unknown, reactive = true) => {
        const key = keyFunc(value);
        // A route key names an entity in a DiffTree route instance, which never reaches the
        // store: read the embedded copy
        if (key === undefined || key.startsWith("/")) return undefined;
        if (this.opaque.has(key))
          throw `Opaque root ${key} can't be read through a key`;

        const rootObject = this.rootMap.get(key);
        if (rootObject === undefined)
          throw `No root object found for key: ${key}`;

        const rootValue = ObservableNode.Unwrap(rootObject); // rootObject[GET_OBSERVABLE_VALUE];
        reactive && ObservableNode.Touch(rootValue, key);
        const alias = rootValue[key];
        return alias;
      });

    this.createNode = aliasFunc
      ? ObservableNode.CreateFactory(aliasFunc)
      : ObservableNode.Create;
  }

  /**
   * Retrieves a value from the store by id.
   * @template O - The type of the value to retrieve
   * @param id - The id/key of the value
   * @returns The value or undefined if not found
   */
  Get<O>(id: string): O | undefined;
  /**
   * Retrieves a value from the store by id, with a default value if not found.
   * @template O - The type of the value to retrieve
   * @param id - The id/key of the value
   * @param defaultValue - The default value to return if id doesn't exist
   * @returns The value or the default value
   */
  Get<O>(id: string, defaultValue: O): O;
  Get<O>(id: string, defaultValue?: O): O | undefined {
    let result = this.rootMap.get(id);
    if (result === undefined) {
      result = this.createNode({ [id]: this.opaque.has(id) ? Box(defaultValue) : defaultValue });
      this.rootMap.set(id, result);
    }

    return result[id] as O | undefined;
  }

  Has(id: string) {
    return this.rootMap.has(id);
  }

  /**
   * Whether the store holds the root a path is in: its key, before the first `.`. Push, Splice
   * and Patch take a path into a root, e.g. `rows.t_1`.
   * @param path The path, e.g. `user.items`.
   */
  protected HasRootOf(path: string): boolean {
    return this.Has(RootOf(path));
  }

  /**
   * Updates the root map with diff results by grouping changes by root path.
   * @param results - Array of diff results to apply
   * @protected
   */
  protected UpdateRootMap(results: JsonDiffResult) {
    for (let x = 0; x < results.length; ) {
      const root = results[x].path[0];

      const startIndex = x;
      while (x < results.length && results[x].path[0] === root) x++;

      const rootGroup = results.slice(startIndex, x);

      this.UpdateRootObject(rootGroup[0].path[0], rootGroup);
    }
  }

  /**
   * Updates a specific root object with diff results.
   * Creates the root object if it doesn't exist.
   * @param rootPath - The path of the root object
   * @param results - Array of diff results to apply to this root object
   * @throws If unable to initialize root path with the given results
   * @private
   */
  private UpdateRootObject(rootPath: string | number, results: JsonDiffResult) {
    if (this.opaque.has(rootPath))
      results = OpaqueResults(rootPath, results);

    const rootObject = this.rootMap.get(rootPath);

    if (rootObject === undefined) {
      if (results[0].type !== "write" || results[0].path.length > 1)
        throw `Unable to initialize root path ${rootPath} with initial path ${results[0].path}`;

      const rootData = JsonDeepClone(results[0].value);
      const newRootObject = this.createNode({ [rootPath]: rootData }, false);
      this.rootMap.set(rootPath, newRootObject);
      // Later entries for the same root (e.g. route summaries written one instance at a time)
      // apply to the root just created
      if (results.length > 1)
        ObservableNode.ApplyDiff(newRootObject, results.slice(1));

      return;
    }

    ObservableNode.ApplyDiff(rootObject, results);
  }
}

/**
 * Base class for observable data store management.
 * Stores root objects as ObservableNode instances and manages updates through diff operations.
 *
 * @see StoreSync
 * @see StoreAsync
 */
export abstract class Store extends ReadStore {
  abstract Write(data: unknown, key?: string): Promise<void> | void;
  abstract Patch(key: string, patch: unknown): Promise<void> | void;
  abstract Push(key: string, ...data: unknown[]): Promise<void> | void;
  abstract Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): Promise<void> | void;
}

/** An opaque root's value as the store holds it: an object or array boxed, anything else as it is */
function Box(value: unknown) {
  return JsonType(value) === "value" ? value : new Opaque(value);
}

/**
 * An opaque root's diff, each value boxed. A DiffTree that marks the root opaque writes it whole or
 * deletes it, so any other change means it wasn't told.
 * @throws When the diff writes inside the root
 */
function OpaqueResults(rootPath: string | number, results: JsonDiffResult): JsonDiffResult {
  return results.map(result => {
    if (result.path.length > 1 || (result.type !== "write" && result.type !== "delete"))
      throw `Opaque root ${rootPath} was changed at ${result.path.join(".")}: mark it opaque in the DiffTree too (DiffTree.MarkOpaque)`;

    return result.type === "write" ? { ...result, value: Box(result.value) } : result;
  });
}

/** The root key a path is in: its text before the first `.` */
export function RootOf(path: string) {
  const dot = path.indexOf(".");
  return dot < 0 ? path : path.slice(0, dot);
}
