export type JsonDiffResult<T = unknown> = {
  path: (string | number)[];
  value: unknown;
}[];

export type JsonDiffFactoryResult = ReturnType<typeof JsonDiffFactory>;

export function ApplyDiff(root: any, diffResult: JsonDiffResult) {
  const pathTuples: [string | number, unknown][] = [["", root]];
  for (let x = 0; x < diffResult.length; x++) {
    const { path, value } = diffResult[x];

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

    const assignValue = pathTuples[y][1];
    (assignValue as any)[path[y]] = value;
  }
}

export function JsonDiffFactory() {
  
  const jsonProto = Object.getPrototypeOf({});
  function JsonType(value: any) {
    if (value === null || value === undefined) return "value";
  
    if (Array.isArray(value)) return "array";
  
    if (jsonProto === Object.getPrototypeOf(value)) return "object";
  
    return "value";
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
      resp.splice(changedPathLength);
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

  return { JsonDiff, JsonType };
}

export const { JsonDiff, JsonType } = JsonDiffFactory();
