// Proposed enhancement (if instance counts make it needed): a parent's RunProjections runs
// every route instance's projector, so each instance's summary memo is checked on every run,
// even for instances nobody wrote to. A set of instances written since the last run, filled
// by route writes and cleared by RunProjections, would let it skip the rest. It would only
// skip visits: the projector's memo still decides whether a summary re-runs.

import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonMerge, JsonType, type JsonDiffResult } from "../../Utils/json";
import { ISnapshotState, Snapshot, SnapshotResolver } from "../Tree/snapshot";
import {
  DiffSpliceResult,
  DiffTreeRouteConfig,
  DiffTreeRoutes,
  IDiffTreeProjectionHost,
  IDiffTreeProjector,
  IDiffTreeRouteDefinition,
  PROJECTION_PREFIX,
  ROUTE_SUMMARY,
} from "./diffTree.types";

/**
 * Where route instances' state lives: a non-enumerable property holding a tree's routes by
 * segment, one level per segment of a base path. `/channel/0001/metadata.name` is
 * `root[ROUTES].channel[ROUTES]["0001"].metadata.name`. Being a symbol, it's never seen by
 * diffs, flattening or snapshots of the state holding it.
 */
const ROUTES = Symbol("ROUTES");

/** A registered route pattern. */
interface IRoute {
  pattern: string;
  /** The pattern's first fixed segment: the root key its summaries are written to */
  output: string;
  /** The pattern's segments after the first: a fixed segment, or a param's name */
  segments: { fixed?: string; param?: string }[];
  /** How many of `segments` are params */
  paramCount: number;
  definition: IDiffTreeRouteDefinition;
  /** Every instance created for the route */
  instances: ITreeContext[];
  /** The definition's routes, parsed on demand to validate a path below a missing instance */
  nested?: Map<string, IRoute>;
}

/** A route path matched against a tree's routes. */
interface IRouteMatch {
  route: IRoute;
  values: string[];
  config: DiffTreeRouteConfig;
  /** The instance's base path: the matched part of the route path, from the family's root */
  base: string;
  /** What the instance handles: a dot path into its state, or a route path for its own routes */
  subPath: string;
}

/** What a root tree and every route instance under it share. */
interface ITreeFamily {
  /** The root state; instances' state hangs off it under `ROUTES` */
  root: { [key: string]: any };
  /** One cache for the family; its `base` is the base path keyed children resolve against */
  snapshotState: ISnapshotState;
  /** Every tree in the family by base path (`""` for the root tree) */
  trees: Map<string, ITreeContext>;
  /** Whether any tree in the family is running projections; instances can't be deleted then */
  projecting: boolean;
}

/** A tree's state, as the functions below see it. */
interface ITreeContext {
  tree: DiffTree;
  family: ITreeFamily;
  /** The tree's base path: `""` for the root tree, `/channel/0001` for a route instance */
  base: string;
  /** The tree's root state object; never replaced, so its `ROUTES` stay attached */
  state: { [key: string]: any };
  keyFunc: ((val: any) => string | undefined) | undefined;
  /** Routes by output key */
  routes: Map<string, IRoute>;
  /** Summary diffs written to this tree's state during its current `RunProjections` */
  summaryDiff: JsonDiffResult;
  /** A route instance's parent and route; undefined for the root tree */
  parent: ITreeContext | undefined;
  route: IRoute | undefined;
  /** A route instance's param values, in pattern order: its slot under the output key */
  values: string[];
}

const treeContexts = new WeakMap<DiffTree, ITreeContext>();

/** Whether a path or key is a route path: one starting with `/`. */
export function IsRoutePath(path: string) {
  return path.charCodeAt(0) === 47;
}

function IsParamSegment(segment: string) {
  return segment.startsWith("{") && segment.endsWith("}");
}

/**
 * Parses route patterns at construction. A pattern must start with a fixed segment, its
 * output key, which can't contain `.`, start with `$projection_`, or be shared with another
 * pattern (so patterns can't overlap).
 */
function ParseRoutes(routes: DiffTreeRoutes | undefined) {
  const result = new Map<string, IRoute>();
  if (routes === undefined) return result;

  const patterns = Object.keys(routes);
  for (let x = 0; x < patterns.length; x++) {
    const pattern = patterns[x];
    if (!IsRoutePath(pattern))
      throw new Error(`DiffTree route pattern must start with "/": ${pattern}`);

    const parts = pattern.slice(1).split("/");
    const output = parts[0];
    if (output === "" || IsParamSegment(output))
      throw new Error(`DiffTree route pattern must start with a fixed segment: ${pattern}`);
    if (output.includes("."))
      throw new Error(`DiffTree route pattern's first segment can't contain ".": ${pattern}`);
    if (output.startsWith(PROJECTION_PREFIX))
      throw new Error(`DiffTree route pattern's first segment can't start with "${PROJECTION_PREFIX}": ${pattern}`);

    const existing = result.get(output);
    if (existing !== undefined)
      throw new Error(`DiffTree route patterns ${existing.pattern} and ${pattern} share the output key "${output}"`);

    const names = new Set<string>();
    const segments = parts.slice(1).map(function (part) {
      if (part === "")
        throw new Error(`DiffTree route pattern has an empty segment: ${pattern}`);
      if (!IsParamSegment(part))
        return { fixed: part };

      const param = part.slice(1, -1);
      if (param === "" || names.has(param))
        throw new Error(`DiffTree route pattern has an empty or repeated param "${param}": ${pattern}`);

      names.add(param);
      return { param };
    });

    result.set(output, {
      pattern,
      output,
      segments,
      paramCount: names.size,
      definition: routes[pattern],
      instances: [],
    });
  }

  return result;
}

/**
 * Matches the leading segments of a route path (split on `/`, without the leading `/`)
 * against a set of routes: the output key, then every segment of the pattern. Returns the
 * match and the segments left after it, or undefined when nothing matches.
 */
function MatchPattern(routes: Map<string, IRoute>, base: string, parts: string[]) {
  const route = routes.get(parts[0]);
  if (route === undefined || parts.length <= route.segments.length)
    return undefined;

  const values: string[] = [];
  const config: DiffTreeRouteConfig = {};
  for (let x = 0; x < route.segments.length; x++) {
    const segment = route.segments[x];
    const part = parts[x + 1];
    if (part === "") return undefined;

    if (segment.param === undefined) {
      if (part !== segment.fixed) return undefined;
    } else {
      values.push(part);
      config[segment.param] = part;
    }
  }

  return {
    route,
    values,
    config,
    base: `${base}/${parts.slice(0, route.segments.length + 1).join("/")}`,
    rest: parts.slice(route.segments.length + 1),
  };
}

/**
 * Matches a route path against a tree's routes. Everything after the last `/` is a dot path
 * into the instance's state, and must be non-empty. A path longer than the pattern is
 * handled by the instance's own routes. Returns undefined when nothing matches.
 */
function MatchRoute(ctx: ITreeContext, path: string): IRouteMatch | undefined {
  const last = path.lastIndexOf("/");
  const dotPath = path.slice(last + 1);
  const match = dotPath === "" ? undefined : MatchPattern(ctx.routes, ctx.base, path.slice(1, last).split("/"));
  if (match === undefined) return undefined;

  const { rest, ...result } = match;
  return {
    ...result,
    subPath: rest.length > 0 ? `/${rest.join("/")}/${dotPath}` : dotPath,
  };
}

/**
 * A tree's root state object under a family's root state, created along the way: one
 * `ROUTES` level per segment of the base path.
 */
function RouteState(root: { [key: string]: any }, base: string) {
  let state = root;
  if (base === "") return state;

  const parts = base.slice(1).split("/");
  for (let x = 0; x < parts.length; x++) {
    let routes = state[ROUTES as any];
    if (routes === undefined)
      Object.defineProperty(state, ROUTES, { value: (routes = Object.create(null)) });

    state = routes[parts[x]] ??= {};
  }

  return state;
}

/** A matched route's instance; created from the route's definition when `create` is set. */
function GetInstance(ctx: ITreeContext, match: IRouteMatch, create: boolean) {
  let instance = ctx.family.trees.get(match.base);
  if (instance !== undefined || !create) return instance;

  const definition = match.route.definition;
  const tree = new DiffTree(ctx.keyFunc, definition.projector?.(match.config), definition.routes, ctx.tree, match.base);
  instance = treeContexts.get(tree)!;
  instance.parent = ctx;
  instance.route = match.route;
  instance.values = match.values;
  match.route.instances.push(instance);
  return instance;
}

/**
 * Runs a write against the instance a route path names, creating the instance on first use.
 * @returns The instance's own result
 */
function WriteRoute<T>(ctx: ITreeContext, path: string, write: (tree: DiffTree, subPath: string) => T): T {
  const match = MatchRoute(ctx, path);
  if (match === undefined) throw `Route path ${path} matches no route`;

  const instance = GetInstance(ctx, match, true)!;
  return write(instance.tree, match.subPath);
}

/** The existing instance a route path names, and the path within it, or undefined. */
function ReadRoute(ctx: ITreeContext, path: string) {
  const match = MatchRoute(ctx, path);
  const instance = match && GetInstance(ctx, match, false);
  return instance && ([instance.tree, match!.subPath] as const);
}

/**
 * The key a keyed object is held under in this tree: a root key, or a route key matching one
 * of this tree's routes. A route key matching none of them isn't a key here, so the object is
 * plain: a route instance sharing its parent's `keyFunc` holds an entity routed into it as
 * plain data rather than routing it again.
 */
function EntityKey(ctx: ITreeContext, value: unknown) {
  const key = ctx.keyFunc?.(value);
  if (!key) return undefined;

  return !IsRoutePath(key) || MatchRoute(ctx, key) !== undefined ? key : undefined;
}

/**
 * The value a route key names in its (existing) instance, and that instance's context, or
 * undefined when the instance or the value doesn't exist.
 */
function ResolveRouteKey(ctx: ITreeContext, key: string): readonly [any, ITreeContext] | undefined {
  const match = MatchRoute(ctx, key);
  const instance = match && GetInstance(ctx, match, false);
  if (instance === undefined) return undefined;

  if (IsRoutePath(match!.subPath)) return ResolveRouteKey(instance, match!.subPath);

  const [value, found] = GetPathValue(instance, match!.subPath, false);
  return found ? [value, instance] : undefined;
}

/**
 * Resolves a keyed child to its root entity: in this tree's root state, or in a route
 * instance. Returns the context that owns the result, so keys below it resolve against
 * their owner.
 */
function ResolveKeyed(ctx: ITreeContext, value: any): readonly [any, ITreeContext] {
  if (ctx.keyFunc === undefined || JsonType(value) === "value") return [value, ctx];

  const key = EntityKey(ctx, value);
  if (!key) return [value, ctx];
  if (!IsRoutePath(key)) return [ctx.state[key] ?? value, ctx];

  return ResolveRouteKey(ctx, key) ?? [value, ctx];
}

/**
 * The snapshot resolver for a family: a keyed child resolves against the tree at the
 * snapshot state's `base`, to its root in that tree or in a route instance. Resolving into an
 * instance moves `base` to it, so keys below resolve against the instance; the snapshot
 * restores `base` once the child is built.
 */
function CreateResolver(family: ITreeFamily): SnapshotResolver {
  return function (child: any) {
    const ctx = family.trees.get(family.snapshotState.base)!;
    const key = EntityKey(ctx, child);
    if (!key) return undefined;
    if (!IsRoutePath(key)) return ctx.state[key];

    const resolved = ResolveRouteKey(ctx, key);
    if (resolved === undefined || JsonType(resolved[0]) === "value") return undefined;

    family.snapshotState.base = resolved[1].base;
    return resolved[0];
  };
}

/** A snapshot of a value from a tree's state, resolving keyed children against that tree. */
function SnapshotIn(ctx: ITreeContext, value: any) {
  const state = ctx.family.snapshotState;
  const base = state.base;
  state.base = ctx.base;
  try {
    return Snapshot.Get(state, value);
  } finally {
    state.base = base;
  }
}

/**
 * Flattens nested objects/arrays, extracting keyed objects by key. A routed entity (one with
 * a route key) isn't descended into: its instance flattens what it holds.
 * @param ctx - The tree whose keys are extracted
 * @param root - Object to store flattened values
 * @param value - Value to flatten
 * @returns The root object with flattened values
 */
function FlattenValue(
  ctx: ITreeContext,
  root: { [key: string]: unknown },
  value: unknown,
) {
  const type = JsonType(value);
  switch (type) {
    case "array":
      const typedArray = value as unknown[];
      for (let x = 0; x < typedArray.length; x++)
        FlattenValue(ctx, root, typedArray[x]);
      break;
    case "object":
      const typedObject = value as { [key: string]: unknown };
      const key = EntityKey(ctx, typedObject);
      if (key) {
        root[key] = typedObject;
        if (IsRoutePath(key)) break;
      }

      const keys = Object.keys(typedObject);
      for (let x = 0; x < keys.length; x++)
        FlattenValue(ctx, root, typedObject[keys[x]]);
  }

  return root;
}

/**
 * Registers the keyed entities a written value carries. One with a root key is diffed
 * against the root the tree holds, into `diffResult`. One with a route key is written to its
 * instance when `route` is set, and the instance's diff stays its own; otherwise (summary and
 * projection writes) it stays embedded only.
 */
function FlattenKeyed(ctx: ITreeContext, value: unknown, diffResult: JsonDiffResult, route: boolean) {
  const flattened = FlattenValue(ctx, {}, value);
  const keys = Object.keys(flattened);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    if (IsRoutePath(key)) {
      route && WriteRoute(ctx, key, (tree, subPath) => tree.DiffPath(subPath, flattened[key]));
      continue;
    }

    if (ctx.routes.has(key))
      throw `Keyed entity ${key} has the output key of route ${ctx.routes.get(key)!.pattern}`;

    JsonDiff(flattened[key], ctx.state[key], key, diffResult);
  }
}

/**
 * Retrieves a value from a tree's root state using a dot-separated path.
 * @param ctx - The tree
 * @param path - Dot-separated path to the value (empty string returns the root)
 * @param resolveKeys - Whether keyed children are read through their root entity, in this
 *   tree or a route instance
 * @returns The value at the specified path, and whether every segment exists
 */
function GetPathValue(ctx: ITreeContext, path: string, resolveKeys = true): readonly [any, boolean] {
  if (path === "") return [ctx.state, true] as const;

  const parts = path.split(".");
  let curr: any = ctx.state;
  let owner = ctx;
  let x = 0;
  for (; curr && x < parts.length - 1; x++)
    [curr, owner] = resolveKeys ? ResolveKeyed(owner, curr[parts[x]]) : [curr[parts[x]], owner];

  if (curr && Object.hasOwn(curr, parts[x])) {
    [curr, owner] = resolveKeys ? ResolveKeyed(owner, curr[parts[x]]) : [curr[parts[x]], owner];
    x++;
  } else curr = undefined;

  return [curr, x === parts.length] as const;
}

/**
 * Resolves a path to its keyed root object if applicable: the deepest keyed object along the
 * path, unless a routed entity comes first. A routed entity's instance owns everything below
 * it, so the outermost one wins and the instance resolves the rest.
 * @param ctx - The tree
 * @param path - Dot-separated path
 * @returns The resolved path (possibly shortened to a root key, or a route path), and the
 *   key it was resolved through, if any
 */
function ResolveKeyPath(ctx: ITreeContext, path: string): readonly [string, string | undefined] {
  const parts = path.split(".");
  let curr: any = ctx.state;
  let keyIndex = -1;
  let key: string | undefined;
  for (let x = 0; x < parts.length - 1; x++) {
    curr = curr[parts[x]];
    if (JsonType(curr) !== "object") continue;

    const currKey = EntityKey(ctx, curr);
    if (!currKey) continue;

    keyIndex = x;
    key = currKey;
    if (IsRoutePath(currKey)) break;
  }

  if (keyIndex < 0) return [path, undefined];

  parts.splice(0, keyIndex + 1, key!);
  return [parts.join("."), key];
}

function InvalidateFor(ctx: ITreeContext) {
  return function (obj: any) {
    Snapshot.Invalidate(ctx.family.snapshotState, obj);
  };
}

/**
 * Updates the tree with a new value at the specified path and computes diffs.
 * Also updates any keyed objects that were nested in the value.
 * @param ctx - The tree to update
 * @param path - Dot-separated path to update
 * @param value - The new value
 * @param route - Whether route-keyed entities are written to their instances (client
 *   writes), or left embedded (summary and projection writes)
 * @returns Diff results showing all changes made to this tree's root state
 */
function UpdateSource(
  ctx: ITreeContext,
  path: string,
  value: unknown,
  route: boolean,
) {
  let diffResult: JsonDiffResult = [];
  if (ctx.keyFunc) {
    const [keyPath, key] = ResolveKeyPath(ctx, path);
    if (keyPath !== path) {
      if (!IsRoutePath(keyPath))
        diffResult = diffResult.concat(UpdateSource(ctx, keyPath, value, route));
      else if (route) {
        // The embedded copy may be stale (an entity can be written through many paths), so
        // it isn't used to recreate a deleted entity: write the whole entity instead
        if (ResolveRouteKey(ctx, key!) === undefined)
          throw `Path ${path} writes into the routed entity ${key}, which its route instance doesn't hold (it was deleted); write the whole entity instead`;

        WriteRoute(ctx, keyPath, (tree, subPath) => tree.DiffPath(subPath, value));
      }
    }
  }

  const newDiffStart = diffResult.length;
  const [sourceValue] = GetPathValue(ctx, path, false);
  JsonDiff(value, sourceValue, path, diffResult);

  if (ctx.keyFunc)
    FlattenKeyed(ctx, value, diffResult, route);

  const newDiff = diffResult.slice(newDiffStart);
  JsonApplyDiff(ctx.state, newDiff, InvalidateFor(ctx));

  return diffResult;
}

function PushSource(
  ctx: ITreeContext,
  path: string,
  items: any[],
) {
  const [sourceValue, found] = GetPathValue(ctx, path, false);
  if (!found) throw `Value not found at path ${path}`;

  if (!Array.isArray(sourceValue))
    throw `Value found at path ${path} is not an array`;

  const results: JsonDiffResult = items.map(function (value, index) {
    return {
      path: `${path}.${sourceValue.length + index}`.split('.'),
      value
    };
  })

  if (items.length > 0)
    results.push({
      path: `${path}.length`.split('.'),
      value: sourceValue.length + items.length
    });

  if (ctx.keyFunc)
    FlattenKeyed(ctx, items, results, true);

  JsonApplyDiff(ctx.state, results, InvalidateFor(ctx));

  return results;
}

function SpliceSource(
  ctx: ITreeContext,
  path: string,
  start: number,
  deleteCount: number | undefined,
  items: any[],
): DiffSpliceResult {
  const [sourceValue, found] = GetPathValue(ctx, path, false);
  if (!found) throw `Value not found at path ${path}`;

  if (!Array.isArray(sourceValue))
    throw `Value found at path ${path} is not an array`;

  deleteCount ??= sourceValue.length - start;
  // The result references the caller's items like a diff record (see JsonDiff). Spliced in
  // directly rather than through JsonApplyDiff, so the tree's copy is cloned here.
  const spliceResult: DiffSpliceResult = {
    path: path.split("."),
    start,
    items,
    deleteCount,
    spliceResult: null,
    diffResult: [] as JsonDiffResult,
  };
  spliceResult.spliceResult = sourceValue.splice(start, deleteCount, ...JsonDeepClone(items));
  Snapshot.Invalidate(ctx.family.snapshotState, sourceValue);

  // Register the keyed entities the new items carry, diffed against the roots
  // already held: a new entity is added whole, one re-inserted unchanged (an undo)
  // produces no diff, so its readers aren't woken.
  if (ctx.keyFunc)
    FlattenKeyed(ctx, items, spliceResult.diffResult, true);

  JsonApplyDiff(ctx.state, spliceResult.diffResult, InvalidateFor(ctx));

  return spliceResult;
}

/** Whether a diff entry is for a route key, which never reaches a Store. */
function IsRoutedEntry(entry: JsonDiffResult[number]) {
  const root = entry.path[0];
  return typeof root === "string" && IsRoutePath(root);
}

/**
 * Drops diff entries for route keys. Nothing in root state is stored under a route key, so
 * this is only a safeguard keeping routed paths out of the Store.
 */
function FilterRouted(diff: JsonDiffResult) {
  for (let x = 0; x < diff.length; x++)
    if (IsRoutedEntry(diff[x]))
      return diff.filter((entry) => !IsRoutedEntry(entry));

  return diff;
}

/** Rejects a root-path write to a route's output key: only the route's summary writes it. */
function AssertNotOutput(ctx: ITreeContext, path: string) {
  const root = path.split(".", 1)[0];
  const route = ctx.routes.get(root);
  if (route !== undefined)
    throw `Path ${path} is the output key of route ${route.pattern}; only its summary writes it`;
}

const SUMMARY_KEY = PROJECTION_PREFIX + ROUTE_SUMMARY;

/**
 * Checks that the segments below a missing instance name an instance of the definition's
 * nested routes, so a malformed path throws whether or not the instances on it exist.
 */
function AssertInstancePath(route: IRoute, path: string, parts: string[]) {
  while (parts.length > 0) {
    route.nested ??= ParseRoutes(route.definition.routes);
    const match = MatchPattern(route.nested, "", parts);
    if (match === undefined) throw `Route path ${path} doesn't name a route instance`;

    route = match.route;
    parts = match.rest;
  }
}

/**
 * Drops a deleted instance, and every instance nested under it, from the family: their trees
 * can't be found any more, so a later write at the same base creates a fresh one, and their
 * state's top-level values are invalidated, so a snapshot that resolved one of their entities
 * is rebuilt (from the embedded copy).
 */
function ForgetInstance(instance: ITreeContext) {
  for (const route of instance.routes.values())
    for (let x = 0; x < route.instances.length; x++)
      ForgetInstance(route.instances[x]);

  const snapshotState = instance.family.snapshotState;
  instance.family.trees.delete(instance.base);
  Snapshot.Invalidate(snapshotState, instance.state);
  const keys = Object.keys(instance.state);
  for (let x = 0; x < keys.length; x++)
    if (JsonType(instance.state[keys[x]]) !== "value")
      Snapshot.Invalidate(snapshotState, instance.state[keys[x]]);
}

/**
 * Removes an instance's state from its parent's `ROUTES`, along with the levels between them
 * that it leaves empty (`channel[ROUTES].red` once it has no sizes left).
 */
function RemoveInstanceState(parent: ITreeContext, instance: ITreeContext) {
  const parts = instance.base.slice(parent.base.length + 1).split("/");
  const levels = [parent.state];
  for (let x = 0; x < parts.length - 1; x++)
    levels.push(levels[x][ROUTES as any][parts[x]]);

  let x = parts.length - 1;
  delete levels[x][ROUTES as any][parts[x]];
  for (; x > 0 && Object.keys(levels[x][ROUTES as any]).length === 0; x--)
    delete levels[x - 1][ROUTES as any][parts[x - 1]];
}

/**
 * Removes a deleted instance's slot under its route's output key, if its summary wrote one.
 * Without params, the slot is the output key: it's set to undefined, matching what the Store
 * holds once it applies the diff. The key stays, so a projection reading it re-runs: a
 * projector skips a projection whose read is missing, which would keep its stale result. With params, the slot's key is deleted, along with the levels it leaves empty,
 * up to the output key, which stays (as `{}` at worst). The emptied container's removal is
 * diffed as a replacement of the deepest container left, since a diff has no delete record.
 * The diff is collected for the parent's `RunProjections`.
 */
function RemoveSlot(parent: ITreeContext, instance: ITreeContext) {
  const path = [instance.route!.output, ...instance.values];
  const levels = [parent.state];
  for (let x = 0; x < path.length - 1; x++) {
    const level = levels[x][path[x]];
    if (JsonType(level) !== "object") return;
    levels.push(level);
  }

  let x = path.length - 1;
  if (!Object.hasOwn(levels[x], path[x])) return;

  // Never remove the output key of a route with params
  while (x > 1 && Object.keys(levels[x]).length === 1) x--;

  let diffResult: JsonDiffResult;
  if (x === 0) {
    diffResult = [{ path: [path[0]], value: undefined }];
  } else {
    const container: { [key: string]: unknown } = { ...levels[x] };
    delete container[path[x]];
    diffResult = [{ path: path.slice(0, x), value: container }];
  }

  if (x === 0) levels[0][path[0]] = undefined;
  else delete levels[x][path[x]];

  Snapshot.Invalidate(parent.family.snapshotState, levels[x]);
  parent.summaryDiff = parent.summaryDiff.concat(diffResult);
}

/**
 * Deletes the instance a route path names (split on `/`, without the leading `/`), resolving
 * a nested path through the instances that exist.
 * @returns Whether the instance existed
 */
function DeleteInstance(ctx: ITreeContext, path: string, parts: string[]): boolean {
  const match = MatchPattern(ctx.routes, ctx.base, parts);
  if (match === undefined) throw `Route path ${path} doesn't name a route instance`;

  const instance = ctx.family.trees.get(match.base);
  if (instance === undefined) {
    AssertInstancePath(match.route, path, match.rest);
    return false;
  }

  if (match.rest.length > 0) return DeleteInstance(instance, path, match.rest);

  const instances = match.route.instances;
  instances.splice(instances.indexOf(instance), 1);
  ForgetInstance(instance);
  RemoveInstanceState(ctx, instance);
  RemoveSlot(ctx, instance);
  return true;
}

/**
 * Writes a route instance's summary to its slot in the parent: `<output>.<param values>`, in
 * param order, or the output key itself for a route without params. Path segments are built
 * as an array, so a param value may contain `.`. Missing levels are created by the write.
 * Route-keyed entities in a summary aren't routed. The diff is collected for the parent's
 * `RunProjections`.
 * @returns The parent's diff
 */
function WriteSummary(instance: ITreeContext, value: unknown) {
  const parent = instance.parent!;
  const path = [instance.route!.output, ...instance.values];
  let container = parent.state;
  let depth = 0;
  while (depth < path.length - 1 && JsonType(container[path[depth]]) === "object")
    container = container[path[depth++]];

  let newValue = value;
  for (let x = path.length - 1; x > depth; x--)
    newValue = { [path[x]]: newValue };

  const prefix = path.slice(0, depth + 1);
  const diffResult = JsonDiff(newValue, container[path[depth]]);
  for (let x = 0; x < diffResult.length; x++)
    diffResult[x].path = prefix.concat(diffResult[x].path as string[]);

  if (parent.keyFunc)
    FlattenKeyed(parent, value, diffResult, false);

  JsonApplyDiff(parent.state, diffResult, InvalidateFor(parent));
  parent.summaryDiff = parent.summaryDiff.concat(diffResult);
  return diffResult;
}

/**
 * Diff tree implementation. Maintains root state and computes diffs for path/value updates.
 * Used directly by `DiffSync`, and is the building block for a `StoreAsync` worker entry
 * file: construct one with the desired `keyFunc`/`projector` and connect it to the worker
 * thread with `ConnectWorkerToDiffTree` (see `defaultDiffTreeWorker.ts` for the no-argument
 * case, or a custom entry file when either is needed).
 *
 * A tree can also have routes: internal state in route instances, written through route
 * paths (`/channel/0001/metadata.name`). Each instance is a `DiffTree` the tree creates from
 * the route's definition, holding its state in the tree's root state under a non-enumerable
 * key. Only an instance's summary (its `ROUTE_SUMMARY` projection) reaches the root keys,
 * under the route's output key.
 */
export class DiffTree {
  private rootState: { [key: string]: any };
  private context: ITreeContext;
  private projectionHost: IDiffTreeProjectionHost;

  /**
   * Creates a DiffTree instance.
   * @param keyFunc - Optional function to extract a key from objects. A key may be a route
   *   key (`/channel/0001/metadata`): the entity is then written to that route instance.
   * @param projector - Optional projection implementation, e.g. `SequentialProjector`.
   *   Keeps per-tree state, so it must not be shared with another tree.
   * @param routes - Optional route patterns, each with the definition of its instances, e.g.
   *   `{ "/channel/{channelId}": { projector: ({ channelId }) => ... } }`.
   *   Invalid or overlapping patterns are rejected here.
   * @param parent - Internal: the tree creating this one as a route instance; this tree
   *   then shares its root state and snapshot cache
   * @param base - Internal: the route instance's base path, from the root tree
   */
  constructor(
    keyFunc?: { (val: any): string | undefined },
    private projector?: IDiffTreeProjector,
    routes?: DiffTreeRoutes,
    parent?: DiffTree,
    base = "",
  ) {
    const parentContext = parent && treeContexts.get(parent);
    let family: ITreeFamily;
    if (parentContext !== undefined) {
      family = parentContext.family;
      if (!IsRoutePath(base) || family.trees.has(base))
        throw new Error(`DiffTree route base ${base} is invalid or already in use`);
    } else {
      family = { root: {}, snapshotState: Snapshot.Create(), trees: new Map(), projecting: false };
      family.snapshotState.resolve = keyFunc && CreateResolver(family);
      base = "";
    }

    const context: ITreeContext = {
      tree: this,
      family,
      base,
      state: RouteState(family.root, base),
      keyFunc,
      routes: ParseRoutes(routes),
      summaryDiff: [],
      parent: undefined,
      route: undefined,
      values: [],
    };
    family.trees.set(base, context);
    treeContexts.set(this, context);
    this.context = context;
    this.rootState = context.state;

    this.projectionHost = {
      Snapshot: (value) => SnapshotIn(context, value),
      Read: (path) => GetPathValue(context, path),
      ReadRoot: (key) => GetPathValue(context, key, false),
      RootKeys: () => Object.keys(context.state),
      Write: (path, value) =>
        context.parent !== undefined && path === SUMMARY_KEY
          ? WriteSummary(context, value)
          : UpdateSource(context, path, value, false),
    };
  }

  /**
   * Brings every route summary and projection up to date with the tree. Every route
   * instance runs its projectors first (its own routes' instances before it), and its
   * `ROUTE_SUMMARY` projection writes its slot under the route's output key; this tree's
   * projections run last, so they read up-to-date summaries.
   * @returns Diff entries for this tree's root state: summaries and projections that changed
   */
  public RunProjections(): JsonDiffResult {
    const ctx = this.context;
    const projecting = ctx.family.projecting;
    ctx.family.projecting = true;
    try {
      for (const route of ctx.routes.values())
        for (let x = 0; x < route.instances.length; x++)
          // Discarded: an instance's changes reach this tree only through its summary
          route.instances[x].tree.RunProjections();

      const projectionDiff = this.projector ? this.projector.Run(this.projectionHost) : [];
      // Taken only once the run succeeds: summary diffs (and slot removals recorded since the
      // last run) stay collected through a throw, for the next run to return
      const diffResult = ctx.summaryDiff.concat(projectionDiff);
      ctx.summaryDiff = [];
      return FilterRouted(diffResult);
    } finally {
      ctx.family.projecting = projecting;
    }
  }

  /**
   * Deletes a route instance and every instance nested under it, and removes its slot under
   * the route's output key. The slot's removal reaches the Store with the next
   * `RunProjections` (`Commit()` for a `DiffTreeWriter`). A later write to the same path
   * creates a fresh instance, with a new projector.
   * @param path - The instance's route path, e.g. `/objectTypes/ORDER` or `/channel/0001/thread/5`
   * @returns Whether an instance existed and was deleted
   * @throws When `path` doesn't name exactly one instance of a registered pattern, or when it's
   *   called while projections run
   */
  public DeleteRoute(path: string): boolean {
    if (this.context.family.projecting)
      throw `DeleteRoute(${path}) can't be called while projections run`;
    if (!IsRoutePath(path))
      throw `Route path ${path} doesn't name a route instance`;

    return DeleteInstance(this.context, path, path.slice(1).split("/"));
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value, or a route path
   * @param value - The new value to compare
   * @returns Diff results showing changes. For a route path, the instance's own diff, with
   *   paths relative to the instance; this tree's changes come from `RunProjections`.
   */
  public DiffPath(path: string, value: any): JsonDiffResult {
    if (IsRoutePath(path))
      return WriteRoute(this.context, path, (tree, subPath) => tree.DiffPath(subPath, value));

    AssertNotOutput(this.context, path);
    return FilterRouted(UpdateSource(this.context, path, value, true));
  }

  public PatchPath(path: string, patch: any): JsonDiffResult {
    if (IsRoutePath(path))
      return WriteRoute(this.context, path, (tree, subPath) => tree.PatchPath(subPath, patch));

    AssertNotOutput(this.context, path);
    const value = this.Snapshot(path);
    const merged = JsonMerge(value, patch);
    return FilterRouted(UpdateSource(this.context, path, merged, true));
  }

  public PushPath(path: string, items: unknown[]): JsonDiffResult {
    if (IsRoutePath(path))
      return WriteRoute(this.context, path, (tree, subPath) => tree.PushPath(subPath, items));

    AssertNotOutput(this.context, path);
    return FilterRouted(PushSource(this.context, path, items));
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[],
  ): DiffSpliceResult {
    if (IsRoutePath(path))
      return WriteRoute(this.context, path, (tree, subPath) => tree.SplicePath(subPath, start, deleteCount, items));

    AssertNotOutput(this.context, path);
    const spliceResult = SpliceSource(this.context, path, start, deleteCount, items);
    spliceResult.diffResult = FilterRouted(spliceResult.diffResult);
    return spliceResult;
  }

  /**
   * Retrieves the current value at a path.
   * @param path - Dot-separated path to the value, or a route path
   * @returns The value at the specified path; undefined for a route instance that doesn't exist
   */
  public GetPath(path: string): any {
    if (IsRoutePath(path)) {
      const target = ReadRoute(this.context, path);
      return target && target[0].GetPath(target[1]);
    }

    const [value] = GetPathValue(this.context, path);
    return value;
  }

  /**
   * Returns an immutable, cached snapshot of the value at a path (empty string for the
   * whole tree). Not part of `IDiffTree`; internal, for a future feature.
   * @param path - Dot-separated path to the value, or a route path
   */
  public Snapshot(path: string): any {
    if (IsRoutePath(path)) {
      const target = ReadRoute(this.context, path);
      if (target === undefined) throw `Unable to get snapshot for path ${path}`;

      return target[0].Snapshot(target[1]);
    }

    const [value, found] = GetPathValue(this.context, path);
    if (!found) throw `Unable to get snapshot for path ${path}`;

    return SnapshotIn(this.context, value);
  }
}
