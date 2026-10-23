import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonDiffResult, JsonMove, JsonType } from "../../../Utils/json";
import { ISnapshotState, Snapshot, SnapshotPath, SnapshotResolver } from "../../Tree/snapshot";

export const ROOT_ROUTE = "/";
export const PROJECTION_PREFIX = "$projection_";
export const ROUTE_STATE = Symbol("ROUTE_STATE");

const ROUTE_DELIMETER = "/";
const PROP_DELIMETER = ".";

type KeyFunc = { (value: any): string | undefined };

/** Returns the keyFunc for a route path (`/channel/1/`, or `""`/`/` for the root) */
export type RouteKeyFunc = { (route: string): KeyFunc | undefined };

/**
 * The path a keyed value lives at: its key joined to the route it was found in. A key
 * starting with `/` is a route path from the root.
 * @returns The path, or undefined when the value isn't keyed
 */
export function ResolveKey(keyFunc: KeyFunc | undefined, route: string, value: any) {
  const key = keyFunc?.(value);
  return key ? JoinPaths(route, key) : undefined;
}

export function ExpandKeyedDiffFromValue(route: string, path: string, keyFunc: KeyFunc, value: any, keyedDiff: { path: string, value: any }[]) {
  const type = JsonType(value);
  if (type === 'value')
    return;

  const filterPrefix = JoinPaths(route, path);
  const key = keyFunc(value);
  if (key) {
    const [keyRoute] = SplitRouteAndPath(key);
    const invalidKeyRoute = keyRoute && !keyRoute.startsWith('/') && route.endsWith(keyRoute);
    const fullKeyPath = JoinPaths(route, key);

    if (!invalidKeyRoute && fullKeyPath && !fullKeyPath.startsWith(filterPrefix))
      keyedDiff.push({
        path: fullKeyPath,
        value: value
      });
  }
  // else {
    const keys = type === "array" ? undefined : Object.keys(value);
    const length = keys ? keys.length : value.length;
    for (let x = 0; x < length; x++) {
      const child = value[keys ? keys[x] : x];
      ExpandKeyedDiffFromValue(route, path, keyFunc, child, keyedDiff);
    }
    // }
}

/**
 * Applies a diff to `diffRoot`, then each keyed value and rebased row it produced, until none are
 * left. Each rebase moves a row past one keyed value, so the rows run out.
 */
export function ApplyDiff(snapshot: ISnapshotState, treeRootState: any, routeKeyFunc: RouteKeyFunc, route: string, diffRoot: any, diff: JsonDiffResult) {
  JsonApplyDiff(diffRoot, diff, function (parent, prop, value) {
    parent[prop] = value;
    Snapshot.Invalidate(snapshot, parent);
  });

  const keyFunc = routeKeyFunc(route);
  if (!keyFunc)
    return;

  const rebasedRouteMap: { [route: string]: JsonDiffResult } = {};
  const keyedWrites: { path: string, value: any }[] = [];

  for (let x = 0; x < diff.length; x++) {
    const diffRow = diff[x];
    const path = diffRow.path;
    const pathStr = path.join('.');
    const routeAndPath = JoinPaths(route, pathStr);

    if (diffRow.type === "write")
      ExpandKeyedDiffFromValue(route, pathStr, keyFunc, diffRow.value, keyedWrites);

    let curr = diffRoot;
    let key = null;
    let keyIndex = -1;
    let keyCurr = null;
    for (let y = 0; curr && y < path.length; y++) {
      const currKey = keyFunc(curr);
      if (currKey) {
        key = currKey;
        keyIndex = y;
        keyCurr = curr;
      }
      curr = curr[path[y]];
    }

    if (key) {
      const joinedPath = JoinPaths(route, key);
      if (!routeAndPath.startsWith(joinedPath)) {
        const exists = !!ReadPath(treeRootState, joinedPath);
        const [targetRoute, targetPath] = SplitRouteAndPath(joinedPath);
        rebasedRouteMap[targetRoute] ??= [];

        if (!exists) {
          rebasedRouteMap[targetRoute].push({
            type: 'write',
            path: targetPath.split('.'),
            value: keyCurr
          });
        }
        else {
          const rebasedDiffRow = diffRow.type === "move" ? {
            ...diffRow,
            basePath: targetPath.split('.').concat(diffRow.path.slice(keyIndex) as string[])
          } : {
            ...diffRow,
            path: targetPath.split('.').concat(diffRow.path.slice(keyIndex) as string[])
          };

          if (rebasedDiffRow.type === "move" || rebasedDiffRow.value !== ReadPath(treeRootState, JoinPaths(targetRoute, rebasedDiffRow.path.join('.'))))
            rebasedRouteMap[targetRoute].push(rebasedDiffRow);
        }
      }
    }
  }

  for (let x = 0; x < keyedWrites.length; x++) {
    const [keyedRoute, keyedPath] = SplitRouteAndPath(keyedWrites[x].path);
    ApplyValueToPath(snapshot, treeRootState, routeKeyFunc, keyedRoute, keyedPath, keyedWrites[x].value);
  }

  for (const rebasedRoute in rebasedRouteMap) {
    const rebasedRoot = ReadPath(treeRootState, rebasedRoute);
    ApplyDiff(snapshot, treeRootState, routeKeyFunc, rebasedRoute, rebasedRoot, rebasedRouteMap[rebasedRoute]);
  }
}

export function ApplyPathValues(snapshot: ISnapshotState, root: any, pathValues: { path: string, value: any }[]) {
  for (let x = 0; x < pathValues.length; x++)
    WritePath(snapshot, root, pathValues[x].path, JsonDeepClone(pathValues[x].value));
}

/**
 * A snapshot resolver reading each keyed child through the path it lives at, keyed with the
 * keyFunc of the route the snapshot walk is in.
 */
export function CreateKeyResolver(root: any, routeKeyFunc: RouteKeyFunc): SnapshotResolver {
  return function (child, snapshotPath) {
    const route = SnapshotPathRoute(snapshotPath);
    const keyedPath = ResolveKey(routeKeyFunc(route), route, child);
    if (!keyedPath)
      return undefined;

    const value = ReadPath(root, keyedPath);
    return value === undefined ? undefined : { value, path: ToSnapshotPath(keyedPath) };
  };
}

/**
 * The snapshot of `routeRoot[property]`, read through its home value when it's keyed, as a
 * snapshot of the whole route would hold it.
 */
function ResolvedSnapshot(snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc, routeRoot: any, route: string, property: string) {
  const value = routeRoot[property];
  if (JsonType(value) === "value")
    return value;

  const resolver = CreateKeyResolver(root, routeKeyFunc);
  const path = ToSnapshotPath(JoinPaths(route, property));
  const resolved = resolver(value, path);
  return resolved ? Snapshot.Get(snapshot, resolved.value, resolver, resolved.path) : Snapshot.Get(snapshot, value, resolver, path);
}

export function ApplyValueToPath(snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc, basePath: string, path: string, value: any) {
  const [route, property] = SplitRouteAndPath(path);
  if (!property)
    throw new Error("Unable to write to root path");

  let combinedRoute = JoinPaths(basePath, route);
  let diffRoot = ReadPath(root, combinedRoute);
  if (diffRoot === undefined) {
    WritePath(snapshot, root, combinedRoute, undefined);
    diffRoot = ReadPath(root, combinedRoute);
  }

  // Only the written value is snapshotted. A snapshot of the whole route would cache values that
  // embed keys whose home values this apply hasn't written yet, and nothing would update them.
  const propertyIndex = property.indexOf(PROP_DELIMETER);
  const rootProperty = propertyIndex < 0 ? property : property.slice(0, propertyIndex);
  const currentValue = ReadPath(ResolvedSnapshot(snapshot, root, routeKeyFunc, diffRoot, combinedRoute, rootProperty), propertyIndex < 0 ? "" : property.slice(propertyIndex + 1));
  const diff = JsonDiff(value, currentValue, property);

  ApplyDiff(snapshot, root, routeKeyFunc, combinedRoute, diffRoot, diff);
}

/**
 * Converts a route path to the snapshot path of the value it names, following how
 * `WritePath` stores route state: `/channel/1/item.v` is `[ROUTE_STATE, "channel", ROUTE_STATE, "1", "item", "v"]`.
 */
export function ToSnapshotPath(path: string): SnapshotPath {
  const snapshotPath: SnapshotPath = [];
  const [route, dotPath] = SplitRouteAndPath(path);
  const routeParts = route.split(ROUTE_DELIMETER);
  for (let x = 0; x < routeParts.length; x++)
    routeParts[x] !== "" && snapshotPath.push(ROUTE_STATE, routeParts[x]);

  if (dotPath !== "")
    snapshotPath.push(...dotPath.split(PROP_DELIMETER));

  return snapshotPath;
}

/** The route path a snapshot path is in: each segment following a `ROUTE_STATE`, e.g. `/channel/1/` */
export function SnapshotPathRoute(path: Readonly<SnapshotPath>) {
  let route = ROUTE_DELIMETER;
  for (let x = 0; x < path.length - 1; x++)
    if (path[x] === ROUTE_STATE)
      route += `${String(path[x + 1])}${ROUTE_DELIMETER}`;

  return route;
}

export function WritePath(snapshot: ISnapshotState, root: any, path: string, value: any, guardPath = true, pathIndex = 0) {
  const startingSlash = path[pathIndex] === ROUTE_DELIMETER;
  if (startingSlash && path.includes(ROUTE_DELIMETER, pathIndex + 1)) {
    const routeKey = path.slice(pathIndex + 1, path.indexOf(ROUTE_DELIMETER, pathIndex + 1));
    if (!Object.hasOwn(root, ROUTE_STATE))
      Object.defineProperty(root, ROUTE_STATE, {
        value: {}
      });

    root[ROUTE_STATE][routeKey] ??= {};
    WritePath(snapshot, root[ROUTE_STATE][routeKey], path, value, guardPath, pathIndex + routeKey.length + 1);
    return;
  }

  const sliceIndex = startingSlash ? pathIndex + 1 : pathIndex;
  const dotPath = path.slice(sliceIndex);
  if (guardPath && dotPath.startsWith(PROJECTION_PREFIX))
    throw new Error(`Cannot write to ${path}: ${PROJECTION_PREFIX} keys are reserved for projection results.`);

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
