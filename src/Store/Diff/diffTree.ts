import { JsonDiff, JsonDiffResult, JsonMerge } from '../../Utils/json';
import { Snapshot } from '../Tree/snapshot';
import { IKeyFunc, IProjection, IRoute, IRouteDefinition, IRouteDefinitions } from './utils/diffTree.types';
import { ApplyDiff, /* ApplyDiffToData, */ ApplyPathValues, ApplyValueToPath, CreateKeyResolver, JoinPaths, PROJECTION_PREFIX, ReadPath, ReadPathFound, ROOT_ROUTE, RouteKeyFunc, SplitRouteAndPath, ToSnapshotPath, WritePath } from './utils/diffTree.utils';

export class DiffTree {
  private rootState = {};

  private rootRoute: IRoute;
  private commitedSnapshot: { [key: string]: any } = {};
  // Definitions are fixed and instances are never removed, so a route path always finds the same instance
  private routeCache = new Map<string, IRoute>();
  private routeKeyFunc: RouteKeyFunc = (routePath) => this.GetRouteInstance(routePath).keyFunc;
  private resolver = CreateKeyResolver(this.rootState, this.routeKeyFunc);
  private snapshot = Snapshot.Create(this.resolver);
  // Every projection of every route instance, dependencies first; rebuilt when an instance may have been created
  private projectionOrder: IProjection[] | undefined;

  constructor(
    private keyFunc?: IKeyFunc,
    private routeDefinitions: IRouteDefinitions = {}
  ) {
    if (!Object.hasOwn(this.routeDefinitions, ROOT_ROUTE))
      this.routeDefinitions = { ...this.routeDefinitions, [ROOT_ROUTE]: { projections: {} } };

    this.rootRoute = CreateRoute([], ROOT_ROUTE, this.routeDefinitions[ROOT_ROUTE], this.keyFunc);
    // Every other pattern in the map is a child of the root route
    this.rootRoute.routeDefinitions = this.routeDefinitions;
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
    const [routePath, valuePath] = SplitRouteAndPath(path);
    if (valuePath.startsWith(PROJECTION_PREFIX))
      throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);

    const combinedRoutePath = JoinPaths("", routePath);
    const routeRoot = ReadPath(this.rootState, combinedRoutePath);
    const value = ReadPath(this.Snapshot(combinedRoutePath), valuePath);

    if (!value) throw new Error(`Array not found at path: ${path}`);

    if (!Array.isArray(value))
      throw new Error(`Value at path ${path} is not an array`);

    if (items.length === 0)
      return;

    const diff: JsonDiffResult = [];
    for (let x = 0; x < items.length; x++)
      diff.push({
        type: "write",
        path: `${valuePath}.${value.length + x}`.split('.'),
        value: items[x]
      });

    diff.push({
      type: "write",
      path: `${valuePath}.length`.split('.'),
      value: value.length + items.length
    });

    ApplyDiff(this.snapshot, this.rootState, this.routeKeyFunc, combinedRoutePath, routeRoot, diff);
    /* const keyedValues = ApplyDiffToData(this.snapshot, this.rootState, this.routeKeyFunc, combinedRoutePath, routeRoot, diff);
    ApplyPathValues(this.snapshot, this.rootState, keyedValues); */
  }

  public SplicePath(
    path: string,
    start: number,
    deleteCount: number,
    items: any[]
  ) {
    const [routePath, valuePath] = SplitRouteAndPath(path);
    if (valuePath.startsWith(PROJECTION_PREFIX))
      throw new Error(`${PROJECTION_PREFIX} keys are read-only.`);

    const combinedRoutePath = JoinPaths("", routePath);
    const routeRoot = this.ReadPath(combinedRoutePath);
    const routeRootSnapshot = this.Snapshot(combinedRoutePath);
    const value = ReadPath(routeRootSnapshot, valuePath);

    if (!value) throw new Error(`Array not found at path: ${path}`);

    if (!Array.isArray(value))
      throw new Error(`Value at path ${path} is not an array`);

    const moveStartIndex = start + deleteCount;
    const moveEndIndex = start + items.length;

    const diff: JsonDiffResult = [];
    const basePath = valuePath.split('.') as (string | number)[];
    for (let x = moveStartIndex; x < value.length; x++)
      diff.push({
        type: "move",
        path: basePath,
        sourceProp: x,
        targetProp: moveEndIndex + (x - moveStartIndex)
      });

    for (let x = 0; x < items.length; x++)
      diff.push({
        type: "write",
        path: basePath.concat(start + x),
        value: items[x]
      });

    const actualDelete = start + deleteCount > value.length ? value.length - start : deleteCount;
    diff.push({
      type: "write",
      path: basePath.concat("length"),
      value: value.length - actualDelete + items.length
    });

    ApplyDiff(this.snapshot, this.rootState, this.routeKeyFunc, combinedRoutePath, routeRoot, diff);
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
   * when a read value is missing or every read value is the same as its last run. Outputs are
   * written as-is to `$projection_<key>` in their route, without a diff.
   * @throws When projections depend on each other in a cycle
   */
  RunProjections() {
    const order = this.projectionOrder ??= OrderProjections(this.rootRoute);
    for (let x = 0; x < order.length; x++) {
      const projection = order[x];
      const values = this.ReadValues(projection.reads);
      if (!values || SameValues(values, projection.values))
        continue;

      const output = projection.projection(...values);
      WritePath(this.snapshot, this.rootState, projection.output, output, false);
      Snapshot.Register(this.snapshot, output);
      // Its own output is one of its reads, so the output it just wrote isn't a change
      projection.values = projection.readsOutput ? this.ReadValues(projection.reads) : values;
    }
  }

  Commit() {
    const nextSnapshot = Snapshot.Get(this.snapshot, this.rootState, this.resolver) as {[key: string]: any};

    const currentKeys = new Set(Object.keys(this.commitedSnapshot));
    const nextKeys = Object.keys(nextSnapshot);

    let diff: JsonDiffResult = [];
    for (let x = 0; x < nextKeys.length; x++) {
      currentKeys.delete(nextKeys[x]);
      diff = JsonDiff(nextSnapshot[nextKeys[x]], this.commitedSnapshot[nextKeys[x]], nextKeys[x], diff);
    }

    for (let key of currentKeys)
      diff.push({
        type: "write",
        path: [key],
        value: undefined
      });

    this.commitedSnapshot = nextSnapshot;
    return diff;
  }

  public Snapshot(path: string) {
    const [routePath, propertyPath] = SplitRouteAndPath(path);
    const routeState = ReadPath(this.rootState, routePath);
    const routeSnapshot = Snapshot.Get(this.snapshot, routeState, undefined, ToSnapshotPath(routePath));
    const snapshot = ReadPath(routeSnapshot, propertyPath);
    return snapshot;
  }

  /**
   * Finds the route instance for a route path (the portion of a path before the last `/`), creating it (and any missing
   * parent instances) from the matching definition on first use.
   * @returns The deepest route instance, or the root route for a root path or a route no definition matches
   */
  private GetRouteInstance(routePath: string) {
    let route = this.routeCache.get(routePath);
    if (route)
      return route;

    this.projectionOrder = undefined;
    const segments = RouteSegments(routePath);
    route = segments.length === 0 ? this.rootRoute : FindRoute(this.rootRoute.childRoutes, this.rootRoute.routeDefinitions, segments, 0, this.keyFunc) ?? this.rootRoute;
    this.routeCache.set(routePath, route);
    return route;
  }

  /**
   * Snapshots of the values at each path, read through the route's root object so keyed
   * values resolve through their own copy.
   * @returns The values, or undefined when any of them is missing
   */
  private ReadValues(paths: string[]) {
    const values = new Array(paths.length);
    for (let x = 0; x < paths.length; x++) {
      const [route, property] = SplitRouteAndPath(paths[x]);
      const [routeState, found] = ReadPathFound(this.rootState, route);
      if (!found)
        return undefined;

      const routeSnapshot = routeState && Snapshot.Get(this.snapshot, routeState, this.resolver, ToSnapshotPath(route));
      const [readSnapshot, snapshotFound] = ReadPathFound(routeSnapshot, property);
      if (!snapshotFound)
        return undefined;

      values[x] = readSnapshot;
    }

    return values;
  }
}

function SameValues(values: any[], lastValues: any[] | undefined) {
  if (!lastValues)
    return false;

  for (let x = 0; x < values.length; x++)
    if (values[x] !== lastValues[x])
      return false;

  return true;
}

/**
 * Whether a read and a projection output overlap: same route, and one dot path contains the
 * other. A read of the route's root object (`/channel/1/`) overlaps every output in that route,
 * but not those of its child routes, which a snapshot of the route doesn't include.
 */
function PathsOverlap(read: string, output: string) {
  const [readRoute, readProperty] = SplitRouteAndPath(read);
  const [outputRoute, outputProperty] = SplitRouteAndPath(output);
  return readRoute === outputRoute && (
    readProperty === "" ||
    readProperty === outputProperty ||
    readProperty.startsWith(`${outputProperty}.`) ||
    outputProperty.startsWith(`${readProperty}.`)
  );
}

function CollectProjections(route: IRoute, byRoute: Map<string, IProjection[]>) {
  for (let x = 0; x < route.projections.length; x++) {
    const [outputRoute] = SplitRouteAndPath(route.projections[x].output);
    let projections = byRoute.get(outputRoute);
    projections || byRoute.set(outputRoute, projections = []);
    projections.push(route.projections[x]);
  }

  for (let x = 0; x < route.childRoutes.length; x++)
    CollectProjections(route.childRoutes[x], byRoute);
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

  function Visit(projection: IProjection, stack: string[]) {
    if (state.get(projection) === "done") return;
    if (state.get(projection) === "visiting")
      throw new Error(`DiffTree projection cycle detected: ${stack.concat(projection.output).join(" -> ")}`);

    state.set(projection, "visiting");
    for (let x = 0; x < projection.reads.length; x++) {
      const read = projection.reads[x];
      const candidates = byRoute.get(SplitRouteAndPath(read)[0]);
      for (let y = 0; candidates && y < candidates.length; y++)
        if (candidates[y] !== projection && PathsOverlap(read, candidates[y].output))
          Visit(candidates[y], stack.concat(projection.output));
    }

    state.set(projection, "done");
    order.push(projection);
  }

  for (const projections of byRoute.values())
    for (let x = 0; x < projections.length; x++)
      Visit(projections[x], []);

  return order;
}

function FindRoute(routes: IRoute[], definitions: IRouteDefinitions | undefined, segments: string[], index: number, defaultKeyFunc: IKeyFunc | undefined): IRoute | undefined {
  let route = routes.find(r => PartsMatch(r.parts, segments, index));
  const created = !route;
  if (!route) {
    const match = MatchRouteDefinition(definitions, segments, index);
    if (!match)
      return undefined;

    const end = index + match.length;
    route = CreateRoute(segments.slice(index, end), `/${segments.slice(0, end).join("/")}/`, match.definition, defaultKeyFunc);
  }

  const nextIndex = index + route.parts.length;
  const result = nextIndex === segments.length ? route : FindRoute(route.childRoutes, route.routeDefinitions, segments, nextIndex, defaultKeyFunc);

  // Only keep a new instance when the full path resolved, so a bad child path creates nothing
  if (result && created)
    routes.push(route);

  return result;
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
    const { reads, projection } = definition.projections[key];
    const routeReads = reads.map(read => JoinPaths(routePath, read));
    const output = JoinPaths(routePath, `${PROJECTION_PREFIX}${key}`);
    projections.push({ key, reads: routeReads, projection, output, readsOutput: routeReads.some(read => PathsOverlap(read, output)) });
  }

  return {
    parts,
    projections,
    childRoutes: [],
    keyFunc: definition.keyFunc ?? defaultKeyFunc,
    routeDefinitions: definition.routes
  };
}

function PartsMatch(parts: string[], segments: string[], index: number) {
  if (parts.length > segments.length - index)
    return false;

  for (let x = 0; x < parts.length; x++)
    if (parts[x] !== segments[index + x])
      return false;

  return true;
}

function IsParam(part: string) {
  return part.startsWith("{") && part.endsWith("}");
}

function RouteSegments(route: string) {
  return route.split("/").filter(part => part !== "");
}
