/**
 * Path strings. A path is a route and a property path: `/channel/1/value.item` is the property
 * path `value.item` in the route `/channel/1/`. A path without a route (`value.item`) is in the
 * root route.
 */

export const ROOT_ROUTE = "/";
export const PROJECTION_PREFIX = "$projection_";

export const ROUTE_DELIMETER = "/";
export const PROP_DELIMETER = ".";
export const WILDCARD = "*";

export function SplitRouteAndPath(path: string) {
  const lastSlash = path.lastIndexOf(ROUTE_DELIMETER);
  const route = path.slice(0, lastSlash + 1);
  const propertyPath = path.slice(lastSlash + 1);

  return [route, propertyPath] as const;
}

/**
 * A path's route and property path. Only a path starting with `/` has a route: any other path
 * is a property path from the root.
 */
export function RouteAndProperty(path: string) {
  return path.startsWith(ROUTE_DELIMETER) ? SplitRouteAndPath(path) : ["", path] as const;
}

export function JoinPaths(basePath: string, targetPath: string) {
  if (targetPath.startsWith(ROUTE_DELIMETER))
    return targetPath;

  if (basePath === '')
    return `/${targetPath}`;

  return basePath.concat(targetPath);
}

/** A route's segments: `/channel/1/` is `channel` and `1` */
export function RouteSegments(route: string) {
  return route.split(ROUTE_DELIMETER).filter(part => part !== "");
}

/** Whether `path` is `basePath` or a property below it: `/a.b` is within `/a`, `/ab` isn't */
export function IsPathWithin(path: string, basePath: string) {
  return path.startsWith(basePath) && (path.length === basePath.length || path[basePath.length] === PROP_DELIMETER);
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
 * Throws when a read path's wildcard is invalid: more than one wildcard segment, a `*` that
 * doesn't end its segment, or a `*` in the property path.
 */
export function ValidateWildcardPath(path: string) {
  const [route, property] = SplitRouteAndPath(path);
  const wildcards = route.split(ROUTE_DELIMETER).filter(part => part.includes(WILDCARD));
  if (property.includes(WILDCARD) || wildcards.length > 1 || wildcards.some(part => part.indexOf(WILDCARD) !== part.length - 1))
    throw new Error(`Invalid wildcard read ${path}: only one route segment may end in ${WILDCARD}.`);
}

/**
 * Whether a read and a projection output overlap: the read's route matches the output's (see
 * `RouteMatches` for wildcards), and one dot path contains the other. A read of the route's root
 * object (`/channel/1/`) overlaps every output in that route, but not those of its child routes,
 * which a snapshot of the route doesn't include.
 */
export function PathsOverlap(read: string, output: string) {
  const [readRoute, readProperty] = SplitRouteAndPath(read);
  const [outputRoute, outputProperty] = SplitRouteAndPath(output);
  return RouteMatches(readRoute, outputRoute) && PropertiesOverlap(readProperty, outputProperty);
}

/** Whether a read's property path and an output's in a matching route overlap; see `PathsOverlap` */
export function PropertiesOverlap(readProperty: string, outputProperty: string) {
  return readProperty === "" || IsPathWithin(readProperty, outputProperty) || IsPathWithin(outputProperty, readProperty);
}
