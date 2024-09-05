import { JsonDiffResult } from "../../Utils/json";
import { GET_OBSERVABLE_VALUE, ObservableNode } from "../Tree/observableNode";

export class Store {
  private rootMap = new Map<string | number, any>();
  private createNode: <T>(data: T) => T;

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

  Get<O>(id: string, defaultValue?: O): O | undefined {
    let result = this.rootMap.get(id);
    if (result === undefined) {
      result = this.createNode({ [id]: defaultValue });
      this.rootMap.set(id, result);
    }

    return result[id] as O;
  }

  protected UpdateRootMap(results: JsonDiffResult) {
    for (let x = 0; x < results.length; ) {
      const root = results[x].path[0];

      const startIndex = x;
      while (x < results.length && results[x].path[0] === root) x++;

      const rootGroup = results.slice(startIndex, x);

      this.UpdateRootObject(rootGroup[0].path[0], rootGroup);
    }
  }

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
