export type JsonDiffResult<T = unknown> = { path: (string | number)[]; value: unknown }[];
const jsonProto = Object.getPrototypeOf({});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonType(value: any) {
  if (value === null || value === undefined) return 'value';

  if (Array.isArray(value)) return 'array';

  if (jsonProto === Object.getPrototypeOf(value)) return 'object';

  return 'value';
}

export function JsonDeepClone<T>(value: T): T {
  const type = JsonType(value);
  switch (type) {
    case 'array':
      return (value as unknown as unknown[]).map(JsonDeepClone) as unknown as T;
    case 'object': {
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

export function JsonDiff<T>(newValue: T, oldValue: T): JsonDiffResult<T> {
  const result: JsonDiffResult<T> = [];
  JsonDiffRecursive([], newValue, oldValue, result);
  return result;
}

function JsonDiffRecursive(
  path: (string | number)[],
  newValue: any,
  oldValue: any,
  resp: JsonDiffResult<unknown>
): boolean {
  if (newValue === oldValue) return false;

  const newType = JsonType(newValue);
  const oldType = JsonType(oldValue);

  const changedPathLength = resp.length;
  let allChildrenChanged = true;

  if (newType === oldType)
    switch (newType) {
      case 'array': {
        allChildrenChanged = JsonDiffArrays(path, newValue, oldValue, resp);
        break;
      }
      case 'object': {
        allChildrenChanged = JsonDiffObjects(path, newValue, oldValue, resp);
        break;
      }
    }

  if (allChildrenChanged) {
    resp.splice(changedPathLength);
    resp.push({
      // path: path.split('.').filter(path => !!path),
      path,
      value: newValue
    });
    return true;
  }

  return false;
}

function JsonDiffArrays(
  path: (string | number)[],
  newValue: any[],
  oldValue: any[],
  resp: JsonDiffResult<unknown>
) {
  let allChildrenChanged = true;

  if (newValue.length !== oldValue.length)
    resp.push({
      path: path.concat('length'),
      value: newValue.length
    });

  if (newValue.length > 0 || oldValue.length > 0) {
    for (let y = 0; y < newValue.length; y++) {
      const arrayPath = path.concat(y);
      const oldValueElem = oldValue[y];
      allChildrenChanged = JsonDiffRecursive(arrayPath, newValue[y], oldValueElem, resp) && allChildrenChanged;
    }
  } else allChildrenChanged = false;

  return allChildrenChanged;
}

function JsonDiffObjects(
  path: (string | number)[],
  newValue: { [key: string]: any },
  oldValue: { [key: string]: any },
  resp: JsonDiffResult<unknown>
) {
  const newKeys = Object.keys(newValue).sort();
  const oldKeys = Object.keys(oldValue).sort();

  if (newKeys.length === 0 && oldKeys.length === 0)
    return false;

  if(newKeys.length < oldKeys.length)
    return true;

  
  let newKeyIndex = 0;
  let oldKeyIndex = 0;
  while (newKeyIndex < newKeys.length) {
    const childPath = path.concat(newKeys[newKeyIndex]);
    if (oldKeyIndex < oldKeys.length && newKeys[newKeyIndex] === oldKeys[oldKeyIndex]) {
      JsonDiffRecursive(childPath, newValue[newKeys[newKeyIndex]], oldValue[oldKeys[oldKeyIndex]], resp);
      oldKeyIndex++;
    } else if (newValue[newKeys[newKeyIndex]] !== undefined) {
      resp.push({
        path: childPath,
        value: newValue[newKeys[newKeyIndex]]
      });
    }

    newKeyIndex++;
  }

  if (oldKeyIndex < oldKeys.length) 
    return true;

  return false;
}
