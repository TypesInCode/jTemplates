import { JsonDiffIdentityFunc, JsonDiffInto, JsonDiffResult, JsonDiffStrategyFunc, JsonHasChanges, JsonMerge, JsonType } from '../../Utils/json';
import { Snapshot } from '../Tree/snapshot';
import { IKeyFunc, IKeyedProjectionDefinition, IKeyedState, IProjection, IProjectionDefinition, IReadSource, IRoute, IRouteDefinition, IRouteDefinitions, IRouteSource, IWildcardMatch, IWildcardSource } from './utils/diffTree.types';
import { ApplyValueToPath, DeleteRouteState, ExpandWildcardPath, IsWildcardPath, JoinPaths, PROJECTION_PREFIX, PROP_DELIMETER, ReadPath, ReadPathFound, ROOT_ROUTE, RouteKeyFunc, RouteMatches, SpliceValueAtPath, SplitRouteAndPath, ValidateWildcardPath, WritePath } from './utils/diffTree.utils';

export class DiffTree {
  private rootState = {};

  private rootRoute: IRoute;
  /** Each root key's snapshot as of the last commit */
  private commitedSnapshot = new Map<string, any>();
  // Definitions are fixed and instances are never removed, so a route path always finds the same instance
  private routeCache = new Map<string, IRoute>();
  private routeKeyFunc: RouteKeyFunc = (routePath) => this.GetRouteInstance(routePath).keyFunc;
  // Slots hold their homes' objects, so a snapshot reads keyed values as it finds them: no resolver
  private snapshot = Snapshot.Create();
  // Every projection of every route instance, dependencies first; rebuilt when an instance may have been created
  private projectionOrder: IProjection[] | undefined;
  // Changes whenever the order is reset, so a wildcard read can tell its matches may have changed
  private routeVersion = 0;

  constructor(
    private keyFunc?: IKeyFunc,
    private routeDefinitions: IRouteDefinitions = {}
  ) {
    if (!Object.hasOwn(this.routeDefinitions, ROOT_ROUTE))
      this.routeDefinitions = { ...this.routeDefinitions, [ROOT_ROUTE]: { projections: {} } };

    this.rootRoute = CreateRoute([], ROOT_ROUTE, this.routeDefinitions[ROOT_ROUTE], this.keyFunc);
    // Every other pattern in the map is a child of the root route
    this.rootRoute.routeDefinitions = this.routeDefinitions;
    this.rootRoute.childPartCounts = PartCounts(this.routeDefinitions);
    // Both spellings of the root route, so the first lookup of either isn't taken for a new instance
    this.routeCache.set("", this.rootRoute);
    this.routeCache.set(ROOT_ROUTE, this.rootRoute);
  }

  WritePath(path: string, value: any) {
    const [routePath, propertyPath] = SplitRouteAndPath(path);
    if (propertyPath.startsWith(PROJECTION_PREFIX))
      throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);

    this.GetRouteInstance(routePath);
    // Keyed entities are local to the route written to; a key starting with "/" is a route path from the root
    ApplyValueToPath(this.snapshot, this.rootState, this.routeKeyFunc, routePath, path, value);
  }

  public PatchPath(path: string, patch: any) {
    const value = this.Snapshot(path);
    const merged = JsonMerge(value, patch);
    this.WritePath(path, merged);
  }

  public PushPath(path: string, items: unknown[]) {
    if (SplitRouteAndPath(path)[1].startsWith(PROJECTION_PREFIX))
      throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);

    const array = ReadPath(this.rootState, path);
    // A missing array throws in SpliceValueAtPath
    SpliceValueAtPath(this.snapshot, this.rootState, this.routeKeyFunc, path, Array.isArray(array) ? array.length : 0, 0, items);
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[]
  ) {
    if (SplitRouteAndPath(path)[1].startsWith(PROJECTION_PREFIX))
      throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);

    SpliceValueAtPath(this.snapshot, this.rootState, this.routeKeyFunc, path, start, deleteCount, items);
  }

  /**
   * Deletes a route: its state, its child routes and projection outputs, and its route
   * instances. The projection order is rebuilt on the next `RunProjections`, so deleting
   * several routes in a row sorts once.
   * @param routePath The route to delete, e.g. `/channel/1/`
   * @throws When the path is the root route or has a property path, e.g. `/channel/1/name`
   */
  DeleteRoute(routePath: string) {
    const [route, propertyPath] = SplitRouteAndPath(routePath);
    const fullRoute = JoinPaths("", route);
    if (propertyPath || fullRoute === ROOT_ROUTE)
      throw new Error(`Unable to delete ${routePath}: only a non-root route path, e.g. /channel/1/, can be deleted.`);

    DeleteRouteState(this.snapshot, this.rootState, fullRoute);
    RemoveRouteInstances(this.rootRoute, fullRoute);
    for (const cachedPath of this.routeCache.keys())
      if (cachedPath.startsWith(fullRoute))
        this.routeCache.delete(cachedPath);

    this.projectionOrder = undefined;
    this.routeVersion++;
  }

  /**
   * Reads the raw value at a path, root (`value.prop`) or routed (`/channel/1/value.prop`).
   * @returns The value, or undefined when any segment of the path doesn't exist
   */
  ReadPath(path: string) {
    return ReadPath(this.rootState, path);
  }

  /**
   * Runs every projection of every route instance, dependencies first. A projection is skipped
   * when no route it reads through changed since its last run, when a read's parent is missing,
   * or when every read value is the same as its last run. Outputs are written as-is to
   * `$projection_<key>` in their route, without a diff; an output the same as the last one written
   * (JsonHasChanges) isn't written, so the last one's objects stay and its readers are skipped.
   * @throws When projections depend on each other in a cycle
   */
  RunProjections() {
    const order = this.projectionOrder ??= OrderProjections(this.rootRoute);
    for (let x = 0; x < order.length; x++) {
      const projection = order[x];
      if (this.SourcesUnchanged(projection.sources))
        continue;

      const previous = projection.sources;
      const values = this.ReadValues(projection.reads, projection.sources = new Array(projection.reads.length), previous);
      if (!values || SameValues(projection.reads, values, projection.values))
        continue;

      let output;
      if (projection.keyed) {
        output = RunKeyed(projection, projection.keyed, values[0]);
        // Every entry kept its output, so the record it wrote last run still holds
        if (output === UNCHANGED) {
          projection.values = values;
          continue;
        }
      }
      else {
        output = projection.projection(...values);
        // An output the same as the last one written leaves that one in place, so the projections
        // reading it see the same objects and are skipped
        if (projection.values !== undefined && !JsonHasChanges(output, ReadPath(this.rootState, projection.output))) {
          projection.values = values;
          continue;
        }
      }

      WritePath(this.snapshot, this.rootState, projection.output, output, false);
      Snapshot.Register(this.snapshot, output);
      if (projection.readsOutput)
        // Its own output is one of its reads, so the output it just wrote isn't a change
        projection.values = this.ReadValues(projection.reads, projection.sources = new Array(projection.reads.length), projection.sources);
      else {
        projection.values = values;
        this.RefreshSources(projection.sources, SplitRouteAndPath(projection.output)[0]);
      }
    }
  }

  /**
   * The changes since the last commit. The root is a flat record of keys, so each key's snapshot
   * is taken and compared on its own, without building a snapshot of the whole root: a key no
   * write touched has the same cached snapshot as the last commit, and is skipped.
   */
  Commit() {
    const committed = this.commitedSnapshot;
    const keys = Object.keys(this.rootState);
    // Diffed key by key into one result
    const diff: JsonDiffResult = [];
    const rootKeyFunc = this.routeKeyFunc(ROOT_ROUTE);
    const strategy = CommitStrategy(rootKeyFunc);
    const identity = CommitIdentity(rootKeyFunc);
    // How many of the committed keys are still in the root, to tell whether any are gone
    let kept = 0;
    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      const had = committed.has(key);
      had && kept++;
      const last = committed.get(key);
      // A value with no cached snapshot was written to; one whose cached snapshot is the one
      // committed wasn't, which a cache lookup tells without taking the snapshot
      const value = (this.rootState as { [key: string]: any })[key];
      if (had && (value === last || JsonType(value) !== "value" && Snapshot.Peek(this.snapshot, value) === last))
        continue;

      const next = Snapshot.Child(this.snapshot, this.rootState, key);
      if (had && next === last)
        continue;

      JsonDiffInto(next, last, [key], diff, strategy, identity);
      committed.set(key, next);
    }

    if (kept < committed.size)
      for (const key of committed.keys())
        if (!Object.hasOwn(this.rootState, key)) {
          committed.delete(key);
          diff.push({
            type: "write",
            path: [key],
            value: undefined
          });
        }

    return diff;
  }

  public Snapshot(path: string) {
    const [routePath, propertyPath] = SplitRouteAndPath(path);
    const routeState = ReadPath(this.rootState, routePath);
    const routeSnapshot = Snapshot.Get(this.snapshot, routeState);
    const snapshot = ReadPath(routeSnapshot, propertyPath);
    return snapshot;
  }

  /**
   * Finds the route instance for a route path (the portion of a path before the last `/`), creating it (and any missing
   * parent instances) from the matching definition on first use.
   * @returns The deepest route instance matched by a definition, or the root route when none matches
   */
  private GetRouteInstance(routePath: string) {
    let route = this.routeCache.get(routePath);
    if (route)
      return route;

    this.projectionOrder = undefined;
    this.routeVersion++;
    const segments = RouteSegments(routePath);
    route = segments.length === 0 ? this.rootRoute : FindRoute(this.rootRoute, segments, 0, this.keyFunc) ?? this.rootRoute;
    this.routeCache.set(routePath, route);
    return route;
  }

  /**
   * Whether every source a projection's reads resolved through on its last full read still has
   * the snapshot it read: a write anywhere under a value clears its cached snapshot, so then no
   * read can have changed. A wildcard read also needs the same route instances to exist.
   */
  private SourcesUnchanged(sources: (IReadSource | undefined)[] | undefined) {
    if (!sources)
      return false;

    for (let x = 0; x < sources.length; x++) {
      const source = sources[x];
      if (!source)
        return false;

      if ("matches" in source) {
        if (source.version !== this.routeVersion)
          return false;

        for (let y = 0; y < source.matches.length; y++)
          if (!this.SourceUnchanged(source.matches[y]))
            return false;
      }
      else if (!this.SourceUnchanged(source))
        return false;
    }

    return true;
  }

  /**
   * Whether a source still has the snapshot it was read with. A key's value is read from the
   * state again, so a key written with a new value is a change too; a primitive value has no
   * snapshot of its own and is compared as it is.
   */
  private SourceUnchanged(source: IRouteSource) {
    if (source.key === undefined)
      return Snapshot.Peek(this.snapshot, source.state) === source.snapshot;

    const value = (source.state as { [key: string]: any })[source.key];
    if (JsonType(value) === "value")
      return value === source.snapshot;

    // A value with no cached snapshot was written since, even where the key read as missing
    const snapshot = Snapshot.Peek(this.snapshot, value);
    return snapshot !== undefined && snapshot === source.snapshot;
  }

  /**
   * Takes a new snapshot of every source in the route a projection just wrote its output to that
   * the write cleared. Nothing the projection read changed between its read and the write, so
   * without this the next run would read everything again for nothing. A source of one key keeps
   * its snapshot unless the output is under that key.
   */
  private RefreshSources(sources: (IReadSource | undefined)[], outputRoute: string) {
    for (let x = 0; x < sources.length; x++) {
      const source = sources[x];
      const routes = source && ("matches" in source ? source.matches : [source]);
      for (let y = 0; routes && y < routes.length; y++) {
        const route = routes[y];
        if (route.route !== outputRoute || this.SourceUnchanged(route))
          continue;

        route.snapshot = route.key === undefined ?
          Snapshot.Get(this.snapshot, route.state) :
          Snapshot.Child(this.snapshot, route.state, route.key);
      }
    }
  }

  /**
   * Snapshots of the values at each path, read through the route's state so keyed values resolve
   * through their own copy.
   * @param sources Filled with what each read resolved through; a read after a missing one is left undefined
   * @param previous The sources of the last full read, so a wildcard read reuses its unchanged matches
   * @returns The values, or undefined when any of them is missing
   */
  private ReadValues(paths: string[], sources: (IReadSource | undefined)[], previous?: (IReadSource | undefined)[]) {
    const values = new Array(paths.length);
    for (let x = 0; x < paths.length; x++) {
      if (IsWildcardPath(paths[x])) {
        const source = this.ReadWildcard(paths[x], previous?.[x] as IWildcardSource | undefined);
        values[x] = WildcardValue(source);
        sources[x] = source;
        continue;
      }

      const [value, found, source] = this.ReadValue(paths[x]);
      sources[x] = source;
      if (!found)
        return undefined;

      values[x] = value;
    }

    return values;
  }

  /**
   * The value at a path, whether it was found, and the route it was read through, when there is
   * one. A property path is read from the snapshot of its first segment alone, not of the whole
   * route, so a write to the route's other keys neither rebuilds what it reads nor changes it.
   */
  private ReadValue(path: string): [any, boolean, IRouteSource | undefined] {
    const [route, property] = SplitRouteAndPath(path);
    const [routeState, found] = ReadPathFound(this.rootState, route);
    if (!found || !routeState)
      return [undefined, false, undefined];

    if (property === "") {
      const routeSnapshot = Snapshot.Get(this.snapshot, routeState);
      return [routeSnapshot, !!routeSnapshot, { route, state: routeState, snapshot: routeSnapshot }];
    }

    const dot = property.indexOf(PROP_DELIMETER);
    const key = dot < 0 ? property : property.slice(0, dot);
    const keySnapshot = Snapshot.Child(this.snapshot, routeState, key);
    const source = { route, state: routeState, key, snapshot: keySnapshot };
    if (dot < 0)
      return [keySnapshot, true, source];

    const [value, valueFound] = ReadPathFound(keySnapshot, property.slice(dot + 1));
    return [value, valueFound, source];
  }

  /**
   * Reads every route a wildcard path matches. While no route instance was added or removed since
   * the last read, the matches are the same, and a match whose route has the same snapshot keeps
   * the value it read.
   */
  private ReadWildcard(path: string, previous: IWildcardSource | undefined): IWildcardSource {
    if (previous && previous.version === this.routeVersion) {
      const matches = previous.matches.map(match =>
        this.SourceUnchanged(match) ? match : this.ReadMatch(match.segment, match.path));
      return { version: this.routeVersion, matches };
    }

    const paths = ExpandWildcardPath(this.rootState, path);
    const matches: IWildcardMatch[] = [];
    for (const segment in paths)
      matches.push(this.ReadMatch(segment, paths[segment]));

    return { version: this.routeVersion, matches };
  }

  private ReadMatch(segment: string, path: string): IWildcardMatch {
    const [value, found, source] = this.ReadValue(path);
    // An expanded path's route exists, so a source is always found
    return { ...source!, segment, path, value, found };
  }
}

/**
 * How `Commit` diffs the root's snapshots for a Store with the same keyFunc:
 * - An array whose first element is keyed is spliced, its elements matched by CommitIdentity.
 * - A keyed value below a root key, with the same key as before, is skipped when the Store reads it
 *   through its root key (any key not starting with `/`): that root key's own diff carries the
 *   change. The Store reads a route key's embedded copy, so that one is diffed.
 * - A keyed value with a different key is written.
 * Each root key's own value is diffed, keyed or not: it's the entity's home.
 */
function CommitStrategy(keyFunc: IKeyFunc | undefined): JsonDiffStrategyFunc | undefined {
  return keyFunc && function (newValue, oldValue, path) {
    if (Array.isArray(newValue))
      return newValue.length > 0 && JsonType(newValue[0]) !== "value" && keyFunc(newValue[0]) !== undefined ? "splice" : undefined;

    if (path.length <= 1)
      return undefined;

    const key = keyFunc(newValue);
    if (key === undefined)
      return undefined;

    if (key !== (JsonType(oldValue) === "value" ? undefined : keyFunc(oldValue)))
      return "write";

    return key.startsWith(ROOT_ROUTE) ? undefined : "skip";
  };
}

/**
 * What `Commit` matches a spliced array's elements by:
 * - An entity the Store reads by its root key (any key not starting with `/`) is matched by that
 *   key. Editing it leaves the array unchanged, and its root key's own diff carries the change. An
 *   entity whose key changed doesn't match, so it's deleted and the new one inserted.
 * - Anything else, route-key entities included, is matched by ===: the Store reads a route key's
 *   embedded copy, so a changed one must be replaced.
 */
function CommitIdentity(keyFunc: IKeyFunc | undefined): JsonDiffIdentityFunc | undefined {
  return keyFunc && function (value) {
    if (JsonType(value) === "value")
      return value;

    const key = keyFunc(value);
    return key === undefined || key.startsWith(ROOT_ROUTE) ? value : key;
  };
}

/**
 * The value of a wildcard read: each match's value keyed by its segment. A match missing the
 * value is left out, so no match reads as an empty object.
 */
function WildcardValue(source: IWildcardSource) {
  const values: { [segment: string]: any } = {};
  for (let x = 0; x < source.matches.length; x++)
    if (source.matches[x].found)
      values[source.matches[x].segment] = source.matches[x].value;

  return values;
}

/** Whether every read value is the same as its last run; a wildcard read compares each matched value */
function SameValues(paths: string[], values: any[], lastValues: any[] | undefined) {
  if (!lastValues)
    return false;

  for (let x = 0; x < values.length; x++)
    if (values[x] !== lastValues[x] && !(IsWildcardPath(paths[x]) && SameEntries(values[x], lastValues[x])))
      return false;

  return true;
}

function SameEntries(values: { [segment: string]: any }, lastValues: { [segment: string]: any }) {
  const keys = Object.keys(values);
  if (keys.length !== Object.keys(lastValues).length)
    return false;

  for (let x = 0; x < keys.length; x++)
    if (!Object.hasOwn(lastValues, keys[x]) || values[keys[x]] !== lastValues[keys[x]])
      return false;

  return true;
}

/**
 * Whether a read and a projection output overlap: the read's route matches the output's (see
 * `RouteMatches` for wildcards), and one dot path contains the other. A read of the route's root
 * object (`/channel/1/`) overlaps every output in that route, but not those of its child routes,
 * which a snapshot of the route doesn't include.
 */
function PathsOverlap(read: string, output: string) {
  const [readRoute, readProperty] = SplitRouteAndPath(read);
  const [outputRoute, outputProperty] = SplitRouteAndPath(output);
  return RouteMatches(readRoute, outputRoute) && PropertiesOverlap(readProperty, outputProperty);
}

/** What `RunKeyed` returns when no entry's output changed and none was added or removed */
const UNCHANGED = Symbol("UNCHANGED");

/**
 * A keyed projection's output for a record: each entry's output, from its last run when its value
 * is the same, and without the entries it returns undefined for. A value that isn't an object or
 * array reads as an empty record.
 * @returns The output, or `UNCHANGED` when it would hold the same entries as the last one written
 */
function RunKeyed(projection: IProjection, state: IKeyedState, record: any) {
  const entries = new Map<string, { value: any, output: any }>();
  const output: { [key: string]: any } = {};
  let changed = projection.values === undefined;
  const keys = JsonType(record) === "value" ? [] : Object.keys(record);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    if (state.routeState && key.startsWith(PROJECTION_PREFIX))
      continue;

    const value = record[key];
    const last = state.entries.get(key);
    const entry = last && last.value === value ? last : { value, output: KeptOutput(projection.projection(value, key), last) };

    entries.set(key, entry);
    changed ||= entry !== last && entry.output !== last?.output;
    if (entry.output !== undefined)
      SetOwnKey(output, key, entry.output);
  }

  // A key that's gone changes the output unless it was left out of it
  for (const [key, last] of state.entries)
    if (!entries.has(key) && last.output !== undefined)
      changed = true;

  state.entries = entries;
  return changed ? output : UNCHANGED;
}

/** A key's new output, or its last one when the two are the same, so the last one's objects are kept */
function KeptOutput(output: any, last: { output: any } | undefined) {
  return last && !JsonHasChanges(output, last.output) ? last.output : output;
}

/** Sets a key as an own property, even `__proto__`, which plain assignment would make the prototype */
function SetOwnKey(target: { [key: string]: any }, key: string, value: any) {
  if (key === "__proto__")
    Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  else
    target[key] = value;
}

/** Whether a read's property path and an output's in a matching route overlap; see `PathsOverlap` */
function PropertiesOverlap(readProperty: string, outputProperty: string) {
  return readProperty === "" ||
    readProperty === outputProperty ||
    readProperty.startsWith(`${outputProperty}.`) ||
    outputProperty.startsWith(`${readProperty}.`);
}

function CollectProjections(route: IRoute, byRoute: Map<string, IProjection[]>) {
  for (let x = 0; x < route.projections.length; x++) {
    const [outputRoute] = SplitRouteAndPath(route.projections[x].output);
    let projections = byRoute.get(outputRoute);
    projections || byRoute.set(outputRoute, projections = []);
    projections.push(route.projections[x]);
  }

  for (const child of route.childRoutes.values())
    CollectProjections(child, byRoute);
}

/**
 * Topologically sorts every projection under a route: a projection depends on every other
 * projection whose output overlaps one of its reads, so that projection is sorted earlier.
 * @throws When projections depend on each other in a cycle
 */
function OrderProjections(rootRoute: IRoute) {
  const byRoute = new Map<string, IProjection[]>();
  CollectProjections(rootRoute, byRoute);

  const order: IProjection[] = [];
  const state = new Map<IProjection, "visiting" | "done">();
  // The projections of every route a wildcard read's route matches, found once per read route
  const wildcardCandidates = new Map<string, IProjection[][]>();
  const CandidatesOf = (readRoute: string) => {
    let candidates = wildcardCandidates.get(readRoute);
    if (!candidates) {
      candidates = [];
      for (const [outputRoute, projections] of byRoute)
        if (RouteMatches(readRoute, outputRoute))
          candidates.push(projections);

      wildcardCandidates.set(readRoute, candidates);
    }

    return candidates;
  };

  function Visit(projection: IProjection, stack: string[]) {
    if (state.get(projection) === "done") return;
    if (state.get(projection) === "visiting")
      throw new Error(`DiffTree projection cycle detected: ${stack.concat(projection.output).join(" -> ")}`);

    state.set(projection, "visiting");
    const next = stack.concat(projection.output);
    // A keyed projection of its route's own state reads none of the route's projection outputs
    for (let x = 0; !projection.keyed?.routeState && x < projection.reads.length; x++) {
      const [readRoute, readProperty] = SplitRouteAndPath(projection.reads[x]);
      // A wildcard read can match outputs in any number of routes; the others only in their own
      const routeCandidates = IsWildcardPath(projection.reads[x]) ? CandidatesOf(readRoute) : [byRoute.get(readRoute) ?? []];

      for (const candidates of routeCandidates)
        for (let y = 0; y < candidates.length; y++)
          if (candidates[y] !== projection && PropertiesOverlap(readProperty, SplitRouteAndPath(candidates[y].output)[1]))
            Visit(candidates[y], next);
    }

    state.set(projection, "done");
    order.push(projection);
  }

  for (const projections of byRoute.values())
    for (let x = 0; x < projections.length; x++)
      Visit(projections[x], []);

  return order;
}

function FindRoute(parent: IRoute, segments: string[], index: number, defaultKeyFunc: IKeyFunc | undefined): IRoute | undefined {
  let route = FindChildRoute(parent, segments, index);
  if (!route) {
    const match = MatchRouteDefinition(parent.routeDefinitions, segments, index);
    if (!match)
      return undefined;

    const end = index + match.length;
    const parts = segments.slice(index, end);
    route = CreateRoute(parts, `/${segments.slice(0, end).join("/")}/`, match.definition, defaultKeyFunc);
    // Kept even when a deeper segment matches no definition, so a write below an undefined
    // child route still creates the parent routes whose projections may read it
    parent.childRoutes.set(parts.join("/"), route);
  }

  const nextIndex = index + route.parts.length;
  // Segments below the deepest defined route belong to it
  return nextIndex === segments.length ? route : FindRoute(route, segments, nextIndex, defaultKeyFunc) ?? route;
}

/**
 * The existing child instance the segments from `index` name, looked up by key for each number
 * of segments a child pattern spans, so finding one doesn't scan its siblings.
 */
function FindChildRoute(parent: IRoute, segments: string[], index: number) {
  for (let x = 0; x < parent.childPartCounts.length; x++) {
    const count = parent.childPartCounts[x];
    if (index + count > segments.length)
      continue;

    const route = parent.childRoutes.get(segments.slice(index, index + count).join("/"));
    if (route)
      return route;
  }

  return undefined;
}

/** Removes every route instance at or below a route path from the instances under `route` */
function RemoveRouteInstances(route: IRoute, routePath: string) {
  for (const [key, child] of route.childRoutes) {
    if (child.path.startsWith(routePath))
      route.childRoutes.delete(key);
    else if (routePath.startsWith(child.path))
      RemoveRouteInstances(child, routePath);
  }
}

/** The distinct numbers of segments the patterns in a definition map span, in definition order */
function PartCounts(definitions: IRouteDefinitions | undefined) {
  const counts: number[] = [];
  for (const pattern in definitions) {
    const count = RouteSegments(pattern).length;
    // The root pattern has no segments and is never a child
    if (count > 0 && !counts.includes(count))
      counts.push(count);
  }

  return counts;
}

function MatchRouteDefinition(definitions: IRouteDefinitions | undefined, segments: string[], index: number) {
  if (!definitions)
    return undefined;

  for (const pattern in definitions) {
    const patternParts = RouteSegments(pattern);
    // The root pattern has no segments and would match anything
    if (patternParts.length === 0 || patternParts.length > segments.length - index)
      continue;

    let x = 0;
    for (; x < patternParts.length && (IsParam(patternParts[x]) || patternParts[x] === segments[index + x]); x++);

    if (x === patternParts.length)
      return { definition: definitions[pattern], length: patternParts.length };
  }

  return undefined;
}

/**
 * @param routePath The instance's full route from the tree root, e.g. `/Root/1234/`. Each projection
 * read is resolved against it, so `name` becomes `/Root/1234/name`; a read starting with `/` is kept as-is.
 * @param defaultKeyFunc The tree's keyFunc, used when the definition doesn't define one
 */
function CreateRoute(parts: string[], routePath: string, definition: IRouteDefinition, defaultKeyFunc: IKeyFunc | undefined): IRoute {
  const projections: IProjection[] = [];
  for (const key in definition.projections) {
    const projectionDefinition = definition.projections[key];
    const output = JoinPaths(routePath, `${PROJECTION_PREFIX}${key}`);
    if (IsKeyedDefinition(projectionDefinition)) {
      const { read, projection } = projectionDefinition;
      if (read !== undefined && IsWildcardPath(read))
        throw new Error(`Invalid keyed projection read ${read}: a keyed projection reads one record, without a wildcard.`);

      // Its route's own state, without the outputs, so its own output isn't one of its reads
      const routeRead = JoinPaths(routePath, read ?? "");
      projections.push({
        key,
        reads: [routeRead],
        projection,
        output,
        readsOutput: read !== undefined && PathsOverlap(routeRead, output),
        keyed: { entries: new Map(), routeState: read === undefined }
      });
      continue;
    }

    const { reads, projection } = projectionDefinition;
    reads.forEach(ValidateWildcardPath);
    const routeReads = reads.map(read => JoinPaths(routePath, read));
    projections.push({ key, reads: routeReads, projection, output, readsOutput: routeReads.some(read => PathsOverlap(read, output)) });
  }

  return {
    path: routePath,
    parts,
    projections,
    childRoutes: new Map(),
    childPartCounts: PartCounts(definition.routes),
    keyFunc: definition.keyFunc ?? defaultKeyFunc,
    routeDefinitions: definition.routes
  };
}


/** Whether a projection definition is a keyed projection: it has no `reads` */
function IsKeyedDefinition(definition: IProjectionDefinition): definition is IKeyedProjectionDefinition {
  return definition.reads === undefined;
}

function IsParam(part: string) {
  return part.startsWith("{") && part.endsWith("}");
}

function RouteSegments(route: string) {
  return route.split("/").filter(part => part !== "");
}
