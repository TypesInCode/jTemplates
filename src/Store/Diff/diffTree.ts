import { JsonDiffFactoryResult, JsonDiffResult } from "../../Utils/json";

export interface IDiffMethod {
  method: "create" | "diffpath" | "diffbatch" | "updatepath" | "getpath";
  arguments: Array<any>;
}

export interface IDiffTree {
  DiffBatch(data: Array<{ path: string; value: any }>): JsonDiffResult;
  DiffPath(path: string, value: any): JsonDiffResult;
  // UpdatePath(path: string, value: any): void;
}

export interface IDiffTreeConstructor {
  new (keyFunc?: { (val: any): string }): IDiffTree;
  /* GetKeyRef(key: string): string;
  ReadKeyRef(ref: string): string; */
}

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
        /* case "updatepath": {
          diffTree.UpdatePath(data.arguments[0], data.arguments[1]);
          ctx.postMessage(null);
          break;
          } */
        case "getpath": {
          const ret = diffTree.GetPath(data.arguments[0]);
          ctx.postMessage(ret);
          break;
        }
      }
    };
  }

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

  function GetPathValue(source: any, path: string) {
    if (path === "") return source;

    const parts = path.split(".");
    let curr = source;
    for (let x = 0; x < parts.length; x++) curr = curr[parts[x]];

    return curr;
  }

  function SetPathValue(
    source: any,
    path: (string | number)[],
    value: unknown
  ) {
    if (path.length === 0) return;

    let curr = source;
    let x = 0;
    for (; x < path.length - 1; x++) curr = curr[path[x]];

    curr[path[x]] = value;
  }

  function ResolveKeyPath(source: any, path: string, keyFunc: (val: any) => string) {
    const parts = path.split('.');
    const pathValues = new Array(parts.length - 1);

    let curr = source;
    for(let x=0; x<parts.length - 1; x++) {
      curr = curr[parts[x]];
      pathValues[x] = curr;
    }

    let y=pathValues.length - 1;

    for(; y >= 0 && !(JsonType(pathValues[y]) === 'object' && keyFunc(pathValues[y])); y--) { }

    if(y >= 0) {
      const key = keyFunc(pathValues[y]);
      parts.splice(0, y+1, key);
      return parts.join('.');
    }

    return path;
  }

  function UpdateSource(
    source: any,
    path: string,
    value: unknown,
    keyFunc?: (val: any) => string
  ) {
    const diffResult: JsonDiffResult = [];
    if(keyFunc) {
      const keyPath = ResolveKeyPath(source, path, keyFunc);
      if(keyPath !== path) {
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

    const filteredDiffResult = diffResult.filter((diff) => diff.value !== undefined);
    for (let x = 0; x < filteredDiffResult.length; x++) {
      SetPathValue(source, filteredDiffResult[x].path, filteredDiffResult[x].value);
    }

    return diffResult;
  }

  class DiffTree implements IDiffTree {
    private rootState: {} = {};

    constructor(private keyFunc?: { (val: any): string }) {}

    public DiffBatch(data: Array<{ path: string; value: any }>) {
      const results = data
        .map(({ path, value }) => this.DiffPath(path, value))
        .flat(1);
      return results;
    }

    public DiffPath(path: string, value: any) {
      return UpdateSource(this.rootState, path, value, this.keyFunc);
    }

    public GetPath(path: string) {
      return GetPathValue(this.rootState, path);
    }
  }

  return DiffTree as IDiffTreeConstructor;
}
