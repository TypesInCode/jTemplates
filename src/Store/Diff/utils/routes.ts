import { IKeyFunc, IKeyedProjectionDefinition, IProjection, IProjectionDefinition, IRoute, IRouteDefinition, IRouteDefinitions } from "./diffTree.types";
import { IsWildcardPath, JoinPaths, PathsOverlap, PROJECTION_PREFIX, ROOT_ROUTE, ROUTE_DELIMETER, RouteSegments, ValidateWildcardPath } from "./paths";

/**
 * A DiffTree's route instances: one per route path a definition matches, created from the
 * definition on first use, each with its own projections and keyFunc.
 */
export class RouteInstances {
  readonly root: IRoute;
  /**
   * Changes whenever an instance may have been created or removed, so the projection order can
   * tell it needs rebuilding and a wildcard read that its matches may have changed
   */
  version = 0;
  // Each route path looked up, by the instance it found; cleared below a deleted route
  private cache = new Map<string, IRoute>();

  constructor(private keyFunc: IKeyFunc | undefined, definitions: IRouteDefinitions) {
    if (!Object.hasOwn(definitions, ROOT_ROUTE))
      definitions = { ...definitions, [ROOT_ROUTE]: { projections: {} } };

    this.root = CreateRoute([], ROOT_ROUTE, definitions[ROOT_ROUTE], keyFunc);
    // Every other pattern in the map is a child of the root route
    this.root.routeDefinitions = definitions;
    this.root.childPartCounts = PartCounts(definitions);
    // Both spellings of the root route, so the first lookup of either isn't taken for a new instance
    this.cache.set("", this.root);
    this.cache.set(ROOT_ROUTE, this.root);
  }

  /**
   * Finds the route instance for a route path (the portion of a path before the last `/`), creating it (and any missing
   * parent instances) from the matching definition on first use.
   * @returns The deepest route instance matched by a definition, or the root route when none matches
   */
  Get(routePath: string) {
    let route = this.cache.get(routePath);
    if (route)
      return route;

    this.version++;
    const segments = RouteSegments(routePath);
    route = segments.length === 0 ? this.root : FindRoute(this.root, segments, 0, this.keyFunc) ?? this.root;
    this.cache.set(routePath, route);
    return route;
  }

  /**
   * Removes every instance at or below a route.
   * @param route A full, non-root route path, e.g. `/channel/1/`
   */
  Delete(route: string) {
    RemoveRouteInstances(this.root, route);
    for (const cachedPath of this.cache.keys())
      if (cachedPath.startsWith(route))
        this.cache.delete(cachedPath);

    this.version++;
  }
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
  const follow = definition.follow === true;
  if (follow && Object.keys(definition.projections).length > 0)
    throw new Error(`Invalid follow route ${routePath}: a follow route holds another tree's roots and has no projections of its own.`);

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
    routeDefinitions: definition.routes,
    follow
  };
}

/** A source's keyFunc when it has none: a follow route doesn't take the tree's. */
const NoKey: IKeyFunc = () => undefined;

/**
 * The follow routes for the trees a tree follows, one per source by name: `/<name>/`, holding the
 * source's roots under their own keys, each keyed entity at its home in the route (its key is
 * joined to the route, so it can't meet the tree's own). Give each source's keyFunc: the trees that
 * pass data identify it the same way, or a slot holding an entity elsewhere in the source keeps its
 * first value here. Merge them into the tree's route definitions; a tree built from an endpoint
 * (`IObservableDiffTreeConfig.endpoint`) has its sources' added for it.
 * @example
 * const tree = new ObservableDiffTree({ routes: {
 *   "/": { projections: { ... } },
 *   ...FollowRoutes({ project: entityKey, engine: undefined }),
 * } });
 * // a subscription to the project's tree applies its posts at /project/
 * subscription.Connect(port); // callback: post => tree.ApplyDiff(post.diff, "/project/")
 */
export function FollowRoutes(sources: { [name: string]: IKeyFunc | undefined }): IRouteDefinitions {
  const definitions: IRouteDefinitions = {};
  for (const name of Object.keys(sources)) {
    if (name === "" || name.includes(ROUTE_DELIMETER) || IsParam(name))
      throw new Error(`Invalid follow route name ${name}: one route segment, not a parameter.`);

    // A route without a keyFunc takes the tree's: a source without one is given one that keys nothing
    definitions[`${ROUTE_DELIMETER}${name}`] = { projections: {}, keyFunc: sources[name] ?? NoKey, follow: true };
  }

  return definitions;
}

/** Whether a projection definition is a keyed projection: it has no `reads` */
function IsKeyedDefinition(definition: IProjectionDefinition): definition is IKeyedProjectionDefinition {
  return definition.reads === undefined;
}

function IsParam(part: string) {
  return part.startsWith("{") && part.endsWith("}");
}
