import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonDiffResult, JsonType } from "../../../Utils/json";
import { ISnapshotState, Snapshot } from "../../Tree/snapshot";

const ROUTE_SUMMARY = Symbol("ROUTE_SUMMARY");
export const ROUTE_STATE = Symbol("ROUTE_STATE");

const ROUTE_DELIMETER = "/";
const PROP_DELIMETER = ".";

export function ExpandKeyedDiffFromValue(keyFunc: { (value: any): string | undefined }, basePath: string, value: any, keyedDiff: { path: string, value: any }[]) {
  const type = JsonType(value);
  if (type === 'value')
    return;

  switch (type) {
    case "array": {
      for (let x = 0; x < value.length; x++) {
        const child = value[x];
        let key = keyFunc(child);
        if (key) {
          key = JoinPaths(basePath, key);
          keyedDiff.push({
            path: key,
            value: child
          });
        }
        ExpandKeyedDiffFromValue(keyFunc, basePath, value[x], keyedDiff);
      }
      break;
    }
    case "object": {
      const keys = Object.keys(value);
      for (let x = 0; x < keys.length; x++) {
        const child = value[keys[x]];

        let key = keyFunc(child);
        if (key) {
          key = JoinPaths(basePath, key);
          keyedDiff.push({
            path: key,
            value: child
          });
        }

        ExpandKeyedDiffFromValue(keyFunc, basePath, child, keyedDiff);
      }
      break;
    }
  }
}



export function ApplyDiffToPath(snapshot: ISnapshotState, keyFunc: { (value: any): string | undefined } | undefined, basePath: string, diffRoot: any, diff: JsonDiffResult) {
  const keyedDiff: { path: string, value: any }[] = [];
  JsonApplyDiff(diffRoot, diff, function (path, prop, _, value) {
    if (keyFunc) {
      let key = keyFunc(value);
      if (key) {
        key = JoinPaths(basePath, key);
        keyedDiff.push({
          path: key,
          value
        });
      }
      else {
        let x = path.length - 1;
        while (!key && x >= 0) {
          key = keyFunc(path[x][1]);
          !key && x--;
        }

        if (key) {
          let dotPath = "";
          for (; x < path.length - 1; x++)
            dotPath += path[x][0] ? `.${path[x][0]}` : '';

          dotPath += `.${prop}`;
          dotPath = dotPath.startsWith('.') ? dotPath.slice(1) : dotPath; // remove possible leading '.'

          keyedDiff.push({
            path: JoinPaths(basePath, `${key}.${dotPath}`),
            value
          });
        }
      }

      ExpandKeyedDiffFromValue(keyFunc, basePath, value, keyedDiff);
    }

    Snapshot.Invalidate(snapshot, path[path.length - 1][1]);
  });

  return keyedDiff;
}

export function ApplyPathValues(snapshot: ISnapshotState, root: any, pathValues: { path: string, value: any }[]) {
  for (let x = 0; x < pathValues.length; x++)
    WritePath(snapshot, root, pathValues[x].path, JsonDeepClone(pathValues[x].value));
}

export function ApplyValueToPath(snapshot: ISnapshotState, root: any, keyFunc: { (value: any): string | undefined } | undefined, basePath: string, path: string, value: any) {
  const [route, property] = SplitRouteAndPath(path);
  if (!property)
    throw new Error("Unable to write to root path");

  let combinedRoute = JoinPaths(basePath, route);
  let diffRoot = ReadPath(root, combinedRoute);
  if (diffRoot === undefined) {
    WritePath(snapshot, root, combinedRoute, undefined);
    diffRoot = ReadPath(root, combinedRoute);
  }

  const diffRootSnapshot = Snapshot.Get(snapshot, diffRoot, function (child: any) {
    const key = keyFunc?.(child);
    if (key) {
      const path = JoinPaths(basePath, key);
      return ReadPath(root, path);
    }
    return child;
  }, [ROUTE_STATE]);
  const currentValue = ReadPath(diffRootSnapshot, property);
  const diff = JsonDiff(value, currentValue, property);

  const keyedValues = ApplyDiffToPath(snapshot, keyFunc, basePath, diffRoot, diff);
  ApplyPathValues(snapshot, root, keyedValues);
  return keyedValues;
}

export function WritePath(snapshot: ISnapshotState, root: any, path: string, value: any, pathIndex = 0) {
  const startingSlash = path[pathIndex] === ROUTE_DELIMETER;
  if (startingSlash && path.includes(ROUTE_DELIMETER, pathIndex + 1)) {
    const routeKey = path.slice(pathIndex + 1, path.indexOf(ROUTE_DELIMETER, pathIndex + 1));
    if (!Object.hasOwn(root, ROUTE_STATE))
      Object.defineProperty(root, ROUTE_STATE, {
        value: {}
      });

    root[ROUTE_STATE][routeKey] ??= {};
    WritePath(snapshot, root[ROUTE_STATE][routeKey], path, value, pathIndex + routeKey.length + 1);
    return;
  }

  const sliceIndex = startingSlash ? pathIndex + 1 : pathIndex;
  const dotPath = path.slice(sliceIndex);
  if (dotPath === '')
    return;

  const parts = dotPath.split(PROP_DELIMETER);

  let curr = root;
  let x = 0;
  for (; curr && x < parts.length - 1; x++)
    curr = curr[parts[x]];

  if (!curr)
    throw new Error("Unable to write value to path: " + path);

  if (curr[parts[x]])
    Snapshot.Invalidate(snapshot, curr[parts[x]]);

  curr[parts[x]] = value;
  Snapshot.Invalidate(snapshot, curr);
}

export function ReadPath(root: any, path: string, pathIndex = 0) {
  if (root === undefined)
    return undefined;

  if (path === '')
    return root;

  const startingSlash = path[pathIndex] === ROUTE_DELIMETER;
  if (startingSlash && pathIndex === path.length - 1)
    return root;

  if (startingSlash && path.includes(ROUTE_DELIMETER, pathIndex + 1)) {
    const routeKey = path.slice(pathIndex + 1, path.indexOf(ROUTE_DELIMETER, pathIndex + 1));

    const nextRoot = root[ROUTE_STATE]?.[routeKey];
    return ReadPath(nextRoot, path, pathIndex + routeKey.length + 1);
  }

  const sliceIndex = startingSlash ? pathIndex + 1 : pathIndex;
  const dotPath = path.slice(sliceIndex);

  const parts = dotPath.split(PROP_DELIMETER);

  let curr = root;
  let x = 0;
  for (; curr && x < parts.length - 1; x++)
    curr = curr[parts[x]];

  return curr?.[parts[x]];
}

export function SplitRouteAndPath(path: string) {
  const lastSlash = path.lastIndexOf(ROUTE_DELIMETER);
  const route = path.slice(0, lastSlash + 1);
  const propertyPath = path.slice(lastSlash + 1);

  return [route, propertyPath] as const;
}

export function GetKeyedPath(root: any, dotPath: string, keyFunc?: (data: any) => string) {
  if (!keyFunc)
    return undefined;

  const parts = dotPath.split(PROP_DELIMETER);
  let keyPath = keyFunc(root);
  let curr = root;

  for (let x = 0; curr && x < parts.length - 1; x++) {
    curr = curr[parts[x]];
    keyPath = keyFunc(root) ?? keyPath;
  }

  return keyPath;
}

export function JoinPaths(basePath: string, targetPath: string) {
  if (targetPath.startsWith(ROUTE_DELIMETER))
    return targetPath;

  if (basePath === '')
    return `/${targetPath}`;

  return basePath.concat(targetPath);
}
