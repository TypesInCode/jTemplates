import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonDiffResult, JsonType } from "../../../Utils/json";
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

// export function ExpandKeyedDiffFromValue(routeKeyFunc: RouteKeyFunc, route: string, keyFunc: KeyFunc, value: any, keyedDiff: { path: string, value: any }[]) {
export function ExpandKeyedDiffFromValue(route: string, keyFunc: KeyFunc, value: any, keyedDiff: { path: string, value: any }[]) {
  const type = JsonType(value);
  if (type === 'value')
    return;

  const keys = type === "array" ? undefined : Object.keys(value);
  const length = keys ? keys.length : value.length;
  for (let x = 0; x < length; x++) {
    const child = value[keys ? keys[x] : x];
    const keyedPath = ResolveKey(keyFunc, route, child);
    if (keyedPath) {
      keyedDiff.push({
        path: keyedPath,
        value: child
      });

      // A keyed entity's children are keyed in the route it lives in
      /* const [childRoute] = SplitRouteAndPath(keyedPath);
      const childKeyFunc = routeKeyFunc(childRoute);
      childKeyFunc && ExpandKeyedDiffFromValue(routeKeyFunc, childRoute, childKeyFunc, child, keyedDiff); */
    }
    else
      ExpandKeyedDiffFromValue(route, keyFunc, child, keyedDiff);
  }
}

export function ApplyDiffToData(snapshot: ISnapshotState, treeRootState: any, routeKeyFunc: RouteKeyFunc, route: string, diffRoot: any, diff: JsonDiffResult) {
  const keyedDiff: { path: string, value: any }[] = [];
  // The route each walked object's children are keyed in: a keyed copy's home route, otherwise its parent's
  const routeOf = new Map<any, string>([[diffRoot, route]]);
  // Keyed copies made by this apply by the path they were read from, with the route they were found in
  const copies = new Map<string, { value: any, route: string }>();

  JsonApplyDiff(diffRoot, diff, function (parent, prop) {
    // Invalidate snapshot for current object because we know something below it is changing
    Snapshot.Invalidate(snapshot, parent);
    // find the context route for the parent which is guaranteed set by the object traversal
    const parentRoute = routeOf.get(parent)!;
    // get the context keyFunc from the route of the parent
    const parentKeyFunc = routeKeyFunc(parentRoute);

    // resolving to target
    const target = parent[prop];
    // Read key for current target
    const keyedPath = ResolveKey(parentKeyFunc, parentRoute, target);
    // If current target does not resolve a key then continue
    if (!keyedPath) {
      routeOf.set(target, parentRoute);
      return target;
    }

    const home = ReadPath(treeRootState, keyedPath);
    if (home === target) {
      routeOf.set(target, SplitRouteAndPath(keyedPath)[0]);
      return target;
    }

    // Find an existing copy for the resolved key
    let copy = copies.get(keyedPath);
    if (!copy) {
      // Create an initialize copy cache remember the parent route context it was created from
      copy = { value: JsonDeepClone(home ?? target), route: parentRoute };
      copies.set(keyedPath, copy);
      // Map the copy instance to its actual route
      routeOf.set(copy.value, SplitRouteAndPath(keyedPath)[0]);
    }

    // Return the copy
    return copy.value;
  }, function (parent, prop, value) {
    // assign the value to its parent
    parent[prop] = value;
    // invalidate the parent because it just changed
    Snapshot.Invalidate(snapshot, parent);

    // get the route of the parent object
    const parentRoute = routeOf.get(parent)!;
    // get the route-specific keyfunc of the parent's route
    const keyFunc = routeKeyFunc(parentRoute);
    // does the value just assigned have a key
    const valuePath = ResolveKey(keyFunc, parentRoute, value);
    if (valuePath) {
      // If the value does have a key, register it to get written
      keyedDiff.push({ path: valuePath, value });
      // Get the route for the keyed value
      const [valueRoute] = SplitRouteAndPath(valuePath);
      // Get the keyfunc for the keyd value's route
      const valueKeyFunc = routeKeyFunc(valueRoute);
      // Traverse the object to find any children that are also keyed values so they can be flattened
      valueKeyFunc && ExpandKeyedDiffFromValue(valueRoute, valueKeyFunc, value, keyedDiff);
    }
    else
      // Traverse the object to find any children that are keyed using the parent's route and keyfunc
      keyFunc && ExpandKeyedDiffFromValue(parentRoute, keyFunc, value, keyedDiff);
  });

  // A copy is keyed again after the writes, so a write that changed its key moves it to the new path.
  // The old path is left alone; other values may still embed it.
  for (const copy of copies.values()) {
    const copyPath = ResolveKey(routeKeyFunc(copy.route), copy.route, copy.value);
    copyPath && keyedDiff.push({ path: copyPath, value: copy.value });
  }

  return keyedDiff;
}

export function ApplyDiff(snapshot: ISnapshotState, treeRootState: any, routeKeyFunc: RouteKeyFunc, route: string, diffRoot: any, diff: JsonDiffResult) {
  const keyedValues = ApplyDiffToData(snapshot, treeRootState, routeKeyFunc, route, diffRoot, diff);
  for (let x = 0; x < keyedValues.length; x++) {
    const [keyedRoute, keyedPath] = SplitRouteAndPath(keyedValues[x].path);
    ApplyValueToPath(snapshot, treeRootState, routeKeyFunc, keyedRoute, keyedPath, keyedValues[x].value);
  }
}

// export function ApplyDiffToPath(snapshot: ISnapshotState, treeRootState: any, routeKeyFunc: RouteKeyFunc, route: string, diffRoot: any, diff: JsonDiffResult) {
//   const keyedDiff: { path: string, value: any }[] = [];
//   const applyKeyFunc = routeKeyFunc(route);
//
//   const pathToCopyCache = new Map<string, any>();
//   const copyToPathCache = new Map<any, string>();
//
//   JsonApplyDiff(diffRoot, diff, function (path: [(string | number), any][], parent, prop) {
//     // If we're here we are on the way to updating a child property. Invalidate snapshot
//     Snapshot.Invalidate(snapshot, parent);
//     const target = parent[prop];
//     let currKeyFunc: typeof applyKeyFunc = null;
//     let currRoute: string = null;
//
//     for (let x = path.length - 1; !currKeyFunc && x >= 0; x--) {
//       currKeyFunc = copyToPathCache.has(path[x][1]) ? routeKeyFunc(copyToPathCache.get(path[x][1])) : null;
//       currRoute = currKeyFunc ? copyToPathCache.get(path[x][1]) : null;
//     }
//
//     currKeyFunc ??= applyKeyFunc;
//     currRoute ??= route;
//     const keyedPath = ResolveKey(currKeyFunc, currRoute, target);
//
//     if (!keyedPath)
//       return parent[prop];
//
//     if (pathToCopyCache.has(keyedPath))
//       return pathToCopyCache.get(keyedPath);
//
//     const keyedObject = ReadPath(treeRootState, keyedPath);
//     const keyedObjectCopy = JsonDeepClone(keyedObject);
//     pathToCopyCache.set(keyedPath, keyedObjectCopy);
//     copyToPathCache.set(keyedObjectCopy, keyedPath);
//
//     return keyedObjectCopy;
//   });
//
//   JsonApplyDiff(diffRoot, diff, function (path, prop, _, value) {
//     // Walk down from the diff root, moving into each keyed ancestor's route. The nearest
//     // keyed ancestor's own copy gets the write too.
//     let currRoute = route;
//     let keyFunc = routeKeyFunc;
//     let ancestorPath: string | undefined;
//     let dotPath = "";
//     for (let x = 1; x < path.length; x++) {
//       const keyedPath = ResolveKey(keyFunc, currRoute, path[x][1]);
//       if (keyedPath) {
//         ancestorPath = keyedPath;
//         dotPath = "";
//         [currRoute] = SplitRouteAndPath(keyedPath);
//         keyFunc = routeKeyFunc(currRoute);
//       }
//       else
//         dotPath += `${path[x][0]}.`;
//     }
//
//     const valuePath = ResolveKey(keyFunc, currRoute, value);
//     if (valuePath) {
//       keyedDiff.push({
//         path: valuePath,
//         value
//       });
//       [currRoute] = SplitRouteAndPath(valuePath);
//       keyFunc = routeKeyFunc(currRoute);
//     }
//     else if (ancestorPath)
//       keyedDiff.push({
//         path: `${ancestorPath}.${dotPath}${prop}`,
//         value
//       });
//
//     keyFunc && ExpandKeyedDiffFromValue(routeKeyFunc, currRoute, keyFunc, value, keyedDiff);
//     Snapshot.Invalidate(snapshot, path[path.length - 1][1]);
//   });
//
//   return keyedDiff;
// }

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

  const diffRootSnapshot = Snapshot.Get(snapshot, diffRoot, CreateKeyResolver(root, routeKeyFunc), ToSnapshotPath(combinedRoute));
  const currentValue = ReadPath(diffRootSnapshot, property);
  const diff = JsonDiff(value, currentValue, property);

  ApplyDiff(snapshot, root, routeKeyFunc, combinedRoute, diffRoot, diff);
  // const keyedValues = ApplyDiffToData(snapshot, root, routeKeyFunc, combinedRoute, diffRoot, diff);
  // for (let x = 0; x < keyedValues.length; x++) {
  //   const [keyedRoute, keyedPath] = SplitRouteAndPath(keyedValues[x].path);
  //   ApplyValueToPath(snapshot, root, routeKeyFunc, keyedRoute, keyedPath, keyedValues[x].value);
  // }
  // ApplyPathValues(snapshot, root, keyedValues);
  // return keyedValues;
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
