import { JsonDiffResult } from "../../Utils/json";
import { GET_OBSERVABLE_VALUE, ObservableNode } from "../Tree/observableNode";

/**
 * Base class for observable data store management.
 * Stores root objects as ObservableNode instances and manages updates through diff operations.
 * 
 * @see StoreSync
 * @see StoreAsync
 */
export class Store {
  private rootMap = new Map<string | number, any>();
  private createNode: <T>(data: T) => T;

  /**
   * Creates an instance of Store.
   * @param keyFunc Optional function to generate a key for a given data value.
   * When provided, enables alias functionality where values can reference other root objects.
   */
  constructor(protected keyFunc?: (value: any) => string | undefined) {
    const aliasFunc =
      keyFunc &&
      ((value: unknown) => {
        const key = keyFunc(value);
        if (key === undefined) return undefined;

        const rootObject = this.rootMap.get(key);
        if (rootObject === undefined)
          throw `No root object found for key: ${key}`;

        const rootValue = rootObject[GET_OBSERVABLE_VALUE];
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
      result = this.createNode({ [id]: defaultValue });
      this.rootMap.set(id, result);
    }

    return result[id] as O | undefined;
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
    const rootObject = this.rootMap.get(rootPath);

    if (rootObject === undefined) {
      if (results.length > 1 || results[0].path.length > 1)
        throw `Unable to initialize root path ${rootPath} with ${results.length} results and initial path ${results[0].path}`;

      const newRootObject = this.createNode({ [rootPath]: results[0].value });
      this.rootMap.set(rootPath, newRootObject);

      return;
    }

    ObservableNode.ApplyDiff(rootObject, results);
  }
}
