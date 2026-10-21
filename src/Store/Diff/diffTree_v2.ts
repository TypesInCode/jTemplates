import { JsonDiff } from '../../Utils/json';
import { Snapshot } from '../Tree/snapshot';
import { ApplyValueToPath, JoinPaths, ReadPath, SplitRouteAndPath } from './utils/diffTree.utils';

type IProjectionDefinitions = {
  [key: string]: {
    reads: string[],
    projection: { (...reads: any): any }
  }
}

type IProjection = {
  key: string,
  reads: string[],
  projection: { (...reads: any): any}
}

type IKeyFunc = { (val: any): string | undefined };

type IRouteDefinition = {
  projections: IProjectionDefinitions,
  keyFunc?: IKeyFunc,
  routes?: IRouteDefinitions
};

type IRouteDefinitions = {
  [route: string]: IRouteDefinition
};

type IRoute = {
  parts: string[];
  projections: IProjection[];
  childRoutes: IRoute[];
  keyFunc?: IKeyFunc;
  routeDefinitions?: IRouteDefinitions;
};

const ROOT_ROUTE = "/";

export class DiffTree {
  private rootRoute: IRoute;
  private commitedSnapshot: any;

  constructor(
    private keyFunc?: IKeyFunc,
    private routeDefinitions: IRouteDefinitions = {},
    private rootState = {},
    private snapshot = Snapshot.Create()
  ) {
    if (!Object.hasOwn(this.routeDefinitions, ROOT_ROUTE))
      this.routeDefinitions = { ...this.routeDefinitions, [ROOT_ROUTE]: { projections: {} } };

    this.rootRoute = CreateRoute([], ROOT_ROUTE, this.routeDefinitions[ROOT_ROUTE], this.keyFunc);
    // Every other pattern in the map is a child of the root route
    this.rootRoute.routeDefinitions = this.routeDefinitions;
  }

  WritePath(path: string, value: any) {
    const [routePath] = SplitRouteAndPath(path);
    const route = this.GetRouteInstance(routePath);
    // Keyed entities are local to the route written to; a key starting with "/" is a route path from the root
    const otherWrites = ApplyValueToPath(this.snapshot, this.rootState, route.keyFunc, routePath, path, value);
    for (let x = 0; x < otherWrites.length; x++)
      this.GetRouteInstance(SplitRouteAndPath(otherWrites[x].path)[0]);
  }

  /**
   * Reads the raw value at a path, root (`value.prop`) or routed (`/channel/1/value.prop`).
   * @returns The value, or undefined when any segment of the path doesn't exist
   */
  ReadPath(path: string) {
    return ReadPath(this.rootState, path);
  }

  Commit() {
    const nextSnapshot = Snapshot.Get(this.snapshot, this.rootState);
    const diff = JsonDiff(nextSnapshot, this.commitedSnapshot);
    this.commitedSnapshot = nextSnapshot;
    return diff;
  }

  /**
   * Finds the route instance for a route path (the portion of a path before the last `/`), creating it (and any missing
   * parent instances) from the matching definition on first use.
   * @returns The deepest route instance, or the root route for a root path or a route no definition matches
   */
  private GetRouteInstance(routePath: string) {
    const segments = RouteSegments(routePath);
    if (segments.length === 0)
      return this.rootRoute;

    return FindRoute(this.rootRoute.childRoutes, this.rootRoute.routeDefinitions, segments, 0, this.keyFunc) ?? this.rootRoute;
  }
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
    projections.push({ key, reads: reads.map(read => JoinPaths(routePath, read)), projection });
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
