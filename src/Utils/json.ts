export type JsonDiffResult<T = unknown> = {
  path: (string | number)[];
  value: unknown;
}[];

export type JsonDiffFactoryResult = ReturnType<typeof JsonDiffFactory>;

export function JsonDiffFactory() {
  const jsonProto = Object.getPrototypeOf({});
  const arrayProto = Object.getPrototypeOf([]);
  const strProto = Object.getPrototypeOf("");
  const numProto = Object.getPrototypeOf(0);
  const boolProto = Object.getPrototypeOf(false);

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
        const result = {} as { [prop: string]: unknown };
        for (let x = 0; x < sourceKeys.length; x++)
          result[sourceKeys[x]] = JsonMerge(
            typedSource[sourceKeys[x]],
            typedPatch[sourceKeys[x]],
          );

        return result;
      }
      default:
        return patch;
    }
  }

  function JsonDeepClone<T>(value: T): T {
    const type = JsonType(value);
    switch (type) {
      case "array":
        return (value as unknown as unknown[]).map(
          JsonDeepClone,
        ) as unknown as T;
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
