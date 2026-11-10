import { JsonApplyDiff, JsonApplySplices, JsonDiff, JsonDiffStrategyFunc, JsonType, SPLICE_ACTION } from "../../../Utils/json";
import { ArraysEqual } from "../../../Utils/array";
import { ISnapshotState, Snapshot } from "../../Tree/snapshot";
import { IsPathWithin, JoinPaths, PROP_DELIMETER, ROUTE_DELIMETER, SplitRouteAndPath } from "./paths";
import { Assign, ReadPath, ReadPathParts, Remove, RouteState } from "./state";

type KeyFunc = { (value: any): string | undefined };

/** Returns the keyFunc for a route path (`/channel/1/`, or `""`/`/` for the root) */
export type RouteKeyFunc = { (route: string): KeyFunc | undefined };

/** What a write needs: the tree's snapshot cache, its root state, and each route's keyFunc */
export type WriteContext = { snapshot: ISnapshotState, root: any, routeKeyFunc: RouteKeyFunc };

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
 * @param path The path, e.g. `value.item` or `/First/Second/value.item`
 * @throws When the path's parent doesn't exist, or a home would be replaced with a value of
 *   another type, which would break the slots holding it
 */
export function ApplyValueToPath(context: WriteContext, path: string, value: any) {
  const [route, property] = WriteRoute(path);
  if (!property)
    throw new Error("Unable to write to root path");

  RouteState(context.root, route, true);
  WriteValue(context, route, property.split(PROP_DELIMETER), value);
}

/**
 * Splices the array at a path in place, as `Array.prototype.splice` would: a start past the end
 * splices at the end, and a delete past the end deletes to it. A path through a slot splices the
 * slot's home's array. Inserted items are flattened like a written value (see ApplyValueToPath).
 * @param path The array's path, e.g. `items` or `/channel/1/value.list`
 * @throws When there's no array at the path
 */
export function SpliceValueAtPath(context: WriteContext, path: string, start: number, deleteCount: number, items: readonly unknown[]) {
  const [route, property] = WriteRoute(path);
  const keyFunc = context.routeKeyFunc(route);
  const targetPath = JoinPaths(route, property);
  // Flattened first: a home it writes could be the one holding the array
  const insert = items.map(item => ({ type: SPLICE_ACTION.INSERT as const, value: Flatten(context, keyFunc, route, targetPath, item) }));

  const array = ReadPath(context.root, path);
  if (!array)
    throw new Error(`Array not found at path: ${path}`);

  if (!Array.isArray(array))
    throw new Error(`Value at path ${path} is not an array`);

  const index = Math.min(start, array.length);
  const actualDelete = Math.max(0, Math.min(deleteCount, array.length - index));
  if (actualDelete === 0 && insert.length === 0)
    return;

  JsonApplySplices(array, [{ index, delete: actualDelete, insert }], KeepValue);
  Snapshot.Invalidate(context.snapshot, array);
}

/** A written path's route from the root (`/` for the root route) and its property path */
function WriteRoute(path: string) {
  const [route, property] = SplitRouteAndPath(path);
  return [JoinPaths("", route), property] as const;
}

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
    // The path is only joined for a keyed value
    if (homePath !== undefined && IsSlot(homePath, JoinPaths(route, parts.slice(0, x + 1).join(PROP_DELIMETER)))) {
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
  if (currentType !== "value" && currentType === JsonType(flattened) && !IsSlot(currentHome, targetPath) && !IsSlot(HomePath(keyFunc, route, flattened), targetPath)) {
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

  // The current value is the home at this path
  if (currentHome === targetPath && flattened !== undefined)
    throw new Error(`Unable to replace the keyed value at ${targetPath}: a keyed value keeps its type and key at its home`);

  Assign(context.snapshot, parent, prop, flattened);
}

/** Whether a value with this home, held at `path`, is a slot: its home is somewhere else */
function IsSlot(homePath: string | undefined, path: string) {
  return homePath !== undefined && homePath !== path;
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

      return Array.isArray(oldValue) && ArraysEqual(newValue, oldValue) ? "skip" : "write";
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
    home === undefined && RouteState(context.root, homeRoute, true);

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

/** The flattened value is already the tree's own, slots included, so it's written as is */
function KeepValue(value: unknown) {
  return value;
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
