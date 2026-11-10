import { JsonApplyDiff, JsonApplySplices, JsonDiff, JsonDiffStrategyFunc, JsonType, SPLICE_ACTION } from "../../../Utils/json";
import { ISnapshotState, Snapshot } from "../../Tree/snapshot";

export const ROOT_ROUTE = "/";
export const PROJECTION_PREFIX = "$projection_";
export const ROUTE_STATE = Symbol("ROUTE_STATE");

const ROUTE_DELIMETER = "/";
export const PROP_DELIMETER = ".";
const WILDCARD = "*";

type KeyFunc = { (value: any): string | undefined };

/** Returns the keyFunc for a route path (`/channel/1/`, or `""`/`/` for the root) */
export type RouteKeyFunc = { (route: string): KeyFunc | undefined };

/**
 * Where a keyed value lives ("its home"): its key joined to the route it's written in. A key
 * starting with `/` is a route path from the root.
 * @returns The home's path, or undefined when the value isn't keyed or its key names a route the
 *   value's own route ends with, which can't be its home
 */
function HomePath(keyFunc: KeyFunc | undefined, route: string, value: any) {
  const key = JsonType(value) === "value" ? undefined : keyFunc?.(value);
  if (!key)
    return undefined;

  if (key.includes(ROUTE_DELIMETER)) {
    const [keyRoute] = SplitRouteAndPath(key);
    if (keyRoute && !keyRoute.startsWith(ROUTE_DELIMETER) && route.endsWith(keyRoute))
      return undefined;
  }

  return JoinPaths(route, key);
}

/**
 * Writes a value to a path, keeping every keyed value at its home.
 *
 * A keyed value is written to its home, and every other place it appears (a "slot") holds that
 * home object itself rather than a copy. So reading through a slot reads the home, a write through a
 * slot writes the home, and a home's snapshot is shared by every slot. Homes keep their identity: a
 * home is only ever changed in place.
 *
 * A write is applied in three steps:
 * 1. A path that runs through a slot is a write to the first such slot's home. When the write would change
 *    the entity's key, the changed entity is written to the slot instead, which writes it to its new
 *    home and leaves the old one alone.
 * 2. The value is flattened: each keyed value in it is written to its home and replaced by the home
 *    object. A keyed value whose home is inside the written path stays where it is: it's its own home.
 * 3. The flattened value is diffed into what's at the path, in place. A slot is never diffed into,
 *    since that would change another entity's home: a slot written with anything else is replaced,
 *    and so is an array of keyed values, which holds nothing but slots.
 *
 * @param basePath The route the path is relative to, e.g. `/First/Second/`
 * @param path The path, e.g. `value.item`; its own route, if any, is joined to `basePath`
 * @throws When the path's parent doesn't exist, or a home would be replaced with a value of
 *   another type, which would break the slots holding it
 */
export function ApplyValueToPath(snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc, basePath: string, path: string, value: any) {
  const [route, property] = SplitRouteAndPath(path);
  if (!property)
    throw new Error("Unable to write to root path");

  const combinedRoute = JoinPaths(basePath, route);
  if (ReadPath(root, combinedRoute) === undefined)
    WritePath(snapshot, root, combinedRoute, undefined);

  WriteValue({ snapshot, root, routeKeyFunc }, combinedRoute, property.split(PROP_DELIMETER), value);
}

/**
 * Splices the array at a path in place, as `Array.prototype.splice` would: a start past the end
 * splices at the end, and a delete past the end deletes to it. A path through a slot splices the
 * slot's home's array. Inserted items are flattened like a written value (see ApplyValueToPath).
 * @param path The array's path, e.g. `items` or `/channel/1/value.list`
 * @throws When there's no array at the path
 */
export function SpliceValueAtPath(snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc, path: string, start: number, deleteCount: number, items: readonly unknown[]) {
  const [route, property] = SplitRouteAndPath(path);
  const combinedRoute = JoinPaths("", route);
  const context = { snapshot, root, routeKeyFunc };
  const keyFunc = routeKeyFunc(combinedRoute);
  const targetPath = JoinPaths(combinedRoute, property);
  // Flattened first: a home it writes could be the one holding the array
  const insert = items.map(item => ({ type: SPLICE_ACTION.INSERT as const, value: Flatten(context, keyFunc, combinedRoute, targetPath, item) }));

  const array = ReadPath(root, path);
  if (!array)
    throw new Error(`Array not found at path: ${path}`);

  if (!Array.isArray(array))
    throw new Error(`Value at path ${path} is not an array`);

  const index = Math.min(start, array.length);
  const actualDelete = Math.max(0, Math.min(deleteCount, array.length - index));
  if (actualDelete === 0 && insert.length === 0)
    return;

  JsonApplySplices(array, [{ index, delete: actualDelete, insert }], KeepValue);
  Snapshot.Invalidate(snapshot, array);
}

type WriteContext = { snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc };

function WriteValue(context: WriteContext, route: string, parts: string[], value: any) {
  const keyFunc = context.routeKeyFunc(route);
  const routeRoot = ReadPath(context.root, route);

  // Step 1: the first slot the path runs through, below the route's root and above the target.
  // Values inside a home are keyed by the home's own route, so any slot past this one is found by
  // the write to the home.
  let slotDepth = -1;
  let slotHome: string | undefined;
  for (let x = 0, curr = routeRoot; keyFunc && x < parts.length - 1; x++) {
    curr = curr?.[parts[x]];
    if (JsonType(curr) === "value")
      break;

    const homePath = HomePath(keyFunc, route, curr);
    if (homePath && homePath !== JoinPaths(route, parts.slice(0, x + 1).join(PROP_DELIMETER))) {
      slotDepth = x + 1;
      slotHome = homePath;
      break;
    }
  }

  if (slotHome !== undefined) {
    const home = ReadPathParts(routeRoot, parts, slotDepth);
    const rest = parts.slice(slotDepth);
    const changed = SetPath(home, rest, value);
    if (keyFunc!(changed) === keyFunc!(home)) {
      const [homeRoute, homeProperty] = SplitRouteAndPath(slotHome);
      WriteValue(context, homeRoute, homeProperty.split(PROP_DELIMETER).concat(rest), value);
    }
    else
      WriteValue(context, route, parts.slice(0, slotDepth), changed);

    return;
  }

  // Step 2: flatten first, so the homes it writes exist before the slots pointing to them
  const targetPath = JoinPaths(route, parts.join(PROP_DELIMETER));
  const flattened = Flatten(context, keyFunc, route, targetPath, value);

  // Step 3
  const parent = ReadPathParts(routeRoot, parts, parts.length - 1);
  if (JsonType(parent) === "value")
    throw new Error("Unable to write value to path: " + targetPath);

  const prop = parts[parts.length - 1];
  const current = parent[prop];
  if (current === flattened)
    return;

  const currentType = JsonType(current);
  const currentHome = HomePath(keyFunc, route, current);
  const currentIsSlot = currentHome !== undefined && currentHome !== targetPath;
  const flattenedHome = HomePath(keyFunc, route, flattened);
  const flattenedIsSlot = flattenedHome !== undefined && flattenedHome !== targetPath;
  if (currentType !== "value" && currentType === JsonType(flattened) && !currentIsSlot && !flattenedIsSlot) {
    const diff = JsonDiff(flattened, current, undefined, IngestStrategy(keyFunc, route, flattened));
    if (diff.length > 0) {
      JsonApplyDiff(
        current,
        diff,
        (target, key, written) => Assign(context.snapshot, target, key, written),
        (target, key) => Remove(context.snapshot, target, key),
        (array) => Snapshot.Invalidate(context.snapshot, array),
        KeepValue
      );
    }

    return;
  }

  if (currentHome !== undefined && !currentIsSlot && flattened !== undefined)
    throw new Error(`Unable to replace the keyed value at ${targetPath}: a keyed value keeps its type and key at its home`);

  Assign(context.snapshot, parent, prop, flattened);
}

/**
 * How a flattened value is diffed into the tree: a slot, or an array of them, is replaced rather
 * than diffed into, and so is any value replacing a slot. The value being written is diffed into
 * its target even when it's keyed, which is how a home is updated in place.
 *
 * An array of slots holding the same homes as before, in the same order, is skipped rather than
 * replaced, so it keeps its object and its snapshot: rewriting an entity whose keyed children didn't
 * change leaves the entity's snapshot, and every projection reading it, alone.
 */
function IngestStrategy(keyFunc: KeyFunc | undefined, route: string, rootValue: any): JsonDiffStrategyFunc | undefined {
  return keyFunc && function (newValue, oldValue) {
    if (newValue === rootValue)
      return undefined;

    if (Array.isArray(newValue)) {
      if (newValue.length === 0 || HomePath(keyFunc, route, newValue[0]) === undefined)
        return undefined;

      return SameElements(newValue, oldValue) ? "skip" : "write";
    }

    return HomePath(keyFunc, route, newValue) !== undefined || HomePath(keyFunc, route, oldValue) !== undefined ? "write" : undefined;
  };
}

/**
 * A copy of a value the tree owns, with each keyed value written to its home and replaced by the
 * home object. A keyed value whose home is inside `targetPath`, the path being written, is copied
 * in place instead.
 */
function Flatten(context: WriteContext, keyFunc: KeyFunc | undefined, route: string, targetPath: string, value: any): any {
  const type = JsonType(value);
  if (type === "value")
    return value;

  const homePath = HomePath(keyFunc, route, value);
  if (homePath !== undefined && !IsPathWithin(homePath, targetPath)) {
    // A home written back to itself, e.g. one read through a slot, has nothing to write
    const home = ReadPath(context.root, homePath);
    if (home === value)
      return home;

    const [homeRoute, homeProperty] = SplitRouteAndPath(homePath);
    if (home === undefined && ReadPath(context.root, homeRoute) === undefined)
      WritePath(context.snapshot, context.root, homeRoute, undefined);

    WriteValue(context, homeRoute, homeProperty.split(PROP_DELIMETER), value);
    // An existing home is updated in place, so only a new one needs reading
    return home ?? ReadPath(context.root, homePath);
  }

  if (type === "array") {
    const result = new Array(value.length);
    for (let x = 0; x < value.length; x++)
      result[x] = Flatten(context, keyFunc, route, targetPath, value[x]);

    return result;
  }

  const result: { [key: string]: any } = {};
  const keys = Object.keys(value);
  for (let x = 0; x < keys.length; x++)
    result[keys[x]] = Flatten(context, keyFunc, route, targetPath, value[keys[x]]);

  return result;
}

/** Whether `oldValue` is an array holding the same elements (===) in the same order */
function SameElements(newValue: unknown[], oldValue: unknown) {
  if (!Array.isArray(oldValue) || oldValue.length !== newValue.length)
    return false;

  for (let x = 0; x < newValue.length; x++)
    if (newValue[x] !== oldValue[x])
      return false;

  return true;
}

/** The flattened value is already the tree's own, slots included, so it's written as is */
function KeepValue(value: unknown) {
  return value;
}

// Removing or replacing a value changes its parent, not the value: its snapshot stays valid. That
// matters for a slot, whose value is a home still held, and read, elsewhere.
function Remove(snapshot: ISnapshotState, parent: any, prop: string | number) {
  delete parent[prop];
  Snapshot.Invalidate(snapshot, parent);
}

function Assign(snapshot: ISnapshotState, parent: any, prop: string | number, value: any) {
  parent[prop] = value;
  Snapshot.Invalidate(snapshot, parent);
}

/** The value at the first `depth` parts of a property path */
function ReadPathParts(value: any, parts: string[], depth: number) {
  let curr = value;
  for (let x = 0; curr !== undefined && curr !== null && x < depth; x++)
    curr = curr[parts[x]];

  return curr;
}

/**
 * A copy of `value` with `path` set, copying only the objects along the path
 * @throws When an object along the path doesn't exist
 */
function SetPath(value: any, path: string[], set: any): any {
  if (path.length === 0)
    return set;

  if (JsonType(value) === "value")
    throw new Error("Unable to write value to path: " + path.join(PROP_DELIMETER));

  const copy = Array.isArray(value) ? value.slice() : { ...value };
  copy[path[0]] = SetPath(value[path[0]], path.slice(1), set);
  return copy;
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

export function ReadPathFound(root: any, path: string, pathIndex = 0) {
  if (root === undefined)
    return [undefined, false];

  if (path === '')
    return [root, !!root];

  const startingSlash = path[pathIndex] === ROUTE_DELIMETER;
  if (startingSlash && pathIndex === path.length - 1)
    return [root, !!root];

  if (startingSlash && path.includes(ROUTE_DELIMETER, pathIndex + 1)) {
    const routeKey = path.slice(pathIndex + 1, path.indexOf(ROUTE_DELIMETER, pathIndex + 1));

    const nextRoot = root[ROUTE_STATE]?.[routeKey];
    return ReadPathFound(nextRoot, path, pathIndex + routeKey.length + 1);
  }

  const sliceIndex = startingSlash ? pathIndex + 1 : pathIndex;
  const dotPath = path.slice(sliceIndex);

  const parts = dotPath.split(PROP_DELIMETER);

  let curr = root;
  let x = 0;
  for (; curr && x < parts.length - 1; x++)
    curr = curr[parts[x]];

  return [curr?.[parts[x]], !!curr];
}

export function SplitRouteAndPath(path: string) {
  const lastSlash = path.lastIndexOf(ROUTE_DELIMETER);
  const route = path.slice(0, lastSlash + 1);
  const propertyPath = path.slice(lastSlash + 1);

  return [route, propertyPath] as const;
}

/**
 * Deletes a route's state, child routes included, from its parent route. Every cached snapshot
 * that embedded a value from it, such as one reading a keyed value through its home in the
 * route, is invalidated.
 * @param route A non-root route path, e.g. `/channel/1/`
 */
export function DeleteRouteState(snapshot: ISnapshotState, root: any, route: string) {
  const parentRoute = route.slice(0, route.lastIndexOf(ROUTE_DELIMETER, route.length - 2) + 1);
  const segment = route.slice(parentRoute.length, -1);
  const routeStates = ReadPath(root, parentRoute)?.[ROUTE_STATE];
  if (!routeStates || !Object.hasOwn(routeStates, segment))
    return;

  InvalidateState(snapshot, routeStates[segment]);
  delete routeStates[segment];
}

function InvalidateState(snapshot: ISnapshotState, value: any) {
  if (JsonType(value) === "value")
    return;

  Snapshot.Invalidate(snapshot, value);
  const keys = Object.keys(value);
  for (let x = 0; x < keys.length; x++)
    InvalidateState(snapshot, value[keys[x]]);

  const routeStates = value[ROUTE_STATE];
  for (const segment in routeStates)
    InvalidateState(snapshot, routeStates[segment]);
}

/** Whether a path's route has a wildcard segment, e.g. a `row_*` segment */
export function IsWildcardPath(path: string) {
  return SplitRouteAndPath(path)[0].includes(WILDCARD);
}

/**
 * Whether a route matches a route pattern segment by segment. A pattern segment ending in `*`
 * matches any segment starting with the text before it: a `row_*` segment matches `row_1`.
 */
export function RouteMatches(pattern: string, route: string) {
  if (pattern === route)
    return true;

  // Every route but a few fails on the text before the wildcard, so that's checked before splitting
  const wildcard = pattern.indexOf(WILDCARD);
  if (wildcard < 0 || !route.startsWith(pattern.slice(0, wildcard)))
    return false;

  const patternParts = pattern.split(ROUTE_DELIMETER);
  const routeParts = route.split(ROUTE_DELIMETER);
  if (patternParts.length !== routeParts.length)
    return false;

  for (let x = 0; x < patternParts.length; x++)
    if (patternParts[x].endsWith(WILDCARD) ? !routeParts[x].startsWith(patternParts[x].slice(0, -1)) : patternParts[x] !== routeParts[x])
      return false;

  return true;
}

/**
 * Expands a wildcard path's route against the route state under `root`.
 * @returns Each matching path, keyed by the segment the wildcard matched
 */
export function ExpandWildcardPath(root: any, path: string) {
  const [route, property] = SplitRouteAndPath(path);
  const parts = route.split(ROUTE_DELIMETER);
  const index = parts.findIndex(part => part.endsWith(WILDCARD));
  const prefix = parts[index].slice(0, -1);
  const parent = ReadPath(root, parts.slice(0, index).join(ROUTE_DELIMETER) + ROUTE_DELIMETER);
  const children = parent?.[ROUTE_STATE] ?? {};

  const paths: { [segment: string]: string } = {};
  for (const segment of Object.keys(children))
    if (segment.startsWith(prefix)) {
      parts[index] = segment;
      paths[segment] = parts.join(ROUTE_DELIMETER) + property;
    }

  return paths;
}

/**
 * Throws when a read path's wildcard is invalid: more than one wildcard segment, a `*` that
 * doesn't end its segment, or a `*` in the property path.
 */
export function ValidateWildcardPath(path: string) {
  const [route, property] = SplitRouteAndPath(path);
  const wildcards = route.split(ROUTE_DELIMETER).filter(part => part.includes(WILDCARD));
  if (property.includes(WILDCARD) || wildcards.length > 1 || wildcards.some(part => part.indexOf(WILDCARD) !== part.length - 1))
    throw new Error(`Invalid wildcard read ${path}: only one route segment may end in ${WILDCARD}.`);
}

/** Whether `path` is `basePath` or a property below it: `/a.b` is within `/a`, `/ab` isn't */
export function IsPathWithin(path: string, basePath: string) {
  return path === basePath || path.startsWith(basePath + PROP_DELIMETER);
}

export function JoinPaths(basePath: string, targetPath: string) {
  if (targetPath.startsWith(ROUTE_DELIMETER))
    return targetPath;

  if (basePath === '')
    return `/${targetPath}`;

  return basePath.concat(targetPath);
}
