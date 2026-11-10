import { JsonType } from "../../../Utils/json";
import { ISnapshotState, Snapshot } from "../../Tree/snapshot";
import { IRouteSource } from "./diffTree.types";
import { PROP_DELIMETER, ROUTE_DELIMETER, RouteAndProperty, SplitRouteAndPath, WILDCARD } from "./paths";

/**
 * The raw state of a DiffTree's routes. A route's state hangs off its parent route's state under
 * `ROUTE_STATE`, keyed by segment, so `Object.keys` of a route's state lists only its own values.
 */
export const ROUTE_STATE = Symbol("ROUTE_STATE");

/**
 * A route's state object, e.g. `/channel/1/`'s; `""` and `/` are the root.
 * @param create Creates the route's state, and its parents', when missing
 * @returns The state, or undefined when it's missing and `create` isn't set
 */
export function RouteState(root: any, route: string, create = false): any {
  let state = root;
  for (let start = 1; state !== undefined && state !== null && start < route.length;) {
    const end = route.indexOf(ROUTE_DELIMETER, start);
    const segment = route.slice(start, end);
    if (create && !Object.hasOwn(state, ROUTE_STATE))
      Object.defineProperty(state, ROUTE_STATE, { value: {} });

    state = create ? state[ROUTE_STATE][segment] ??= {} : state[ROUTE_STATE]?.[segment];
    start = end + 1;
  }

  return state;
}

/**
 * Writes a value to a path as it is, without diffing it or keeping keyed values at their homes,
 * creating the path's route when missing. A path to a route (`/channel/1/`) only creates it.
 * @throws When the path's parent doesn't exist
 */
export function WritePath(snapshot: ISnapshotState, root: any, path: string, value: any) {
  const [route, property] = RouteAndProperty(path);
  const state = RouteState(root, route, true);
  if (property === "")
    return;

  const parts = property.split(PROP_DELIMETER);
  const parent = ReadPathParts(state, parts, parts.length - 1);
  if (!parent)
    throw new Error("Unable to write value to path: " + path);

  Assign(snapshot, parent, parts[parts.length - 1], value);
}

/** The value at a path, or undefined when any segment of it doesn't exist; see ReadPathFound */
export function ReadPath(root: any, path: string) {
  return ReadPathFound(root, path)[0];
}

/**
 * The value at a path, and whether its parent was found: a property missing from an existing
 * parent is found as undefined.
 */
export function ReadPathFound(root: any, path: string): [any, boolean] {
  const [route, property] = RouteAndProperty(path);
  const state = RouteState(root, route);
  if (property === "")
    return [state, !!state];

  const parts = property.split(PROP_DELIMETER);
  const parent = ReadPathParts(state, parts, parts.length - 1);
  return [parent?.[parts[parts.length - 1]], !!parent];
}

/** The value at the first `depth` parts of a property path */
export function ReadPathParts(value: any, parts: string[], depth: number) {
  let curr = value;
  for (let x = 0; curr !== undefined && curr !== null && x < depth; x++)
    curr = curr[parts[x]];

  return curr;
}

/**
 * The snapshot of the value at a path, whether it was found, and the route it was read through,
 * when there is one. A property path is read from the snapshot of its first segment alone, not of
 * the whole route, so a write to the route's other keys neither rebuilds what it reads nor changes it.
 */
export function ReadSnapshot(snapshot: ISnapshotState, root: any, path: string): [any, boolean, IRouteSource | undefined] {
  const [route, property] = SplitRouteAndPath(path);
  const routeState = RouteState(root, route);
  if (!routeState)
    return [undefined, false, undefined];

  if (property === "") {
    const routeSnapshot = Snapshot.Get(snapshot, routeState);
    return [routeSnapshot, !!routeSnapshot, { route, state: routeState, snapshot: routeSnapshot }];
  }

  const dot = property.indexOf(PROP_DELIMETER);
  const key = dot < 0 ? property : property.slice(0, dot);
  const keySnapshot = Snapshot.Child(snapshot, routeState, key);
  const source = { route, state: routeState, key, snapshot: keySnapshot };
  if (dot < 0)
    return [keySnapshot, true, source];

  const [value, valueFound] = ReadPathFound(keySnapshot, property.slice(dot + 1));
  return [value, valueFound, source];
}

/**
 * Whether a key's value still has the snapshot taken of it, told by a cache lookup without
 * taking a new one. A primitive value has no snapshot of its own and is compared as it is. A
 * value with no cached snapshot was written since, even where the snapshot was undefined.
 */
export function KeyUnchanged(snapshot: ISnapshotState, state: object, key: string, keySnapshot: any) {
  const value = (state as { [key: string]: any })[key];
  if (JsonType(value) === "value")
    return value === keySnapshot;

  const cached = Snapshot.Peek(snapshot, value);
  return cached !== undefined && cached === keySnapshot;
}

// Removing or replacing a value changes its parent, not the value: its snapshot stays valid. That
// matters for a slot, whose value is a home still held, and read, elsewhere.
export function Remove(snapshot: ISnapshotState, parent: any, prop: string | number) {
  delete parent[prop];
  Snapshot.Invalidate(snapshot, parent);
}

export function Assign(snapshot: ISnapshotState, parent: any, prop: string | number, value: any) {
  parent[prop] = value;
  Snapshot.Invalidate(snapshot, parent);
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
  const routeStates = RouteState(root, parentRoute)?.[ROUTE_STATE];
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

/**
 * Expands a wildcard path's route against the route state under `root`.
 * @returns Each matching path, keyed by the segment the wildcard matched
 */
export function ExpandWildcardPath(root: any, path: string) {
  const [route, property] = SplitRouteAndPath(path);
  const parts = route.split(ROUTE_DELIMETER);
  const index = parts.findIndex(part => part.endsWith(WILDCARD));
  const prefix = parts[index].slice(0, -1);
  const parent = RouteState(root, parts.slice(0, index).join(ROUTE_DELIMETER) + ROUTE_DELIMETER);
  const children = parent?.[ROUTE_STATE] ?? {};

  const paths: { [segment: string]: string } = {};
  for (const segment of Object.keys(children))
    if (segment.startsWith(prefix)) {
      parts[index] = segment;
      paths[segment] = parts.join(ROUTE_DELIMETER) + property;
    }

  return paths;
}
