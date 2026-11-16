/** A projection of the values at one or more paths, rerun when any of them changes */
export type IReadsProjectionDefinition = {
  /**
   * Paths relative to the route, or from the root when starting with `/`. One route segment may
   * end in `*` to read every matching route, e.g. `child/row_*` + `/name`, which passes an object
   * keyed by matched segment.
   */
  reads: string[],
  projection: { (...reads: any): any },
  /**
   * Promotes keyed values of the output to roots of their own: each outermost value this returns
   * a key for is held at `<output>_<key>` (e.g. `$projection_people_111`) as the same object the
   * output holds, so a subscriber can follow it alone. A key appears at most once in an output.
   */
  keyFunc?: { (obj: any): string | undefined }
};

/**
 * A projection of each entry of one keyed record, by key. Its output is a record with the same
 * keys: an entry whose value is the same as on the last run keeps its output without a call, and
 * an entry the projection returns undefined for is left out.
 */
export type IKeyedProjectionDefinition = {
  reads?: never,
  /**
   * The record, relative to the route or from the root when starting with `/`; no wildcard. When
   * left out, the route's own state, without its projections' outputs. A missing record reads as
   * an empty one.
   */
  read?: string,
  projection: { (entry: any, key: string): any },
  /**
   * Promotes keyed values of the output to roots of their own: each outermost value this returns
   * a key for is held at `<output>_<key>` (e.g. `$projection_people_111`) as the same object the
   * output holds, so a subscriber can follow it alone. A key appears at most once in an output.
   */
  keyFunc?: { (obj: any): string | undefined }
};

export type IProjectionDefinition = IReadsProjectionDefinition | IKeyedProjectionDefinition;

export type IProjectionDefinitions = {
  [key: string]: IProjectionDefinition
}

/**
 * A keyed projection's state: each key's value and output from its last run, kept for a key
 * left out of the output too, so it isn't called again while its value is the same.
 */
export type IKeyedState = {
  entries: Map<string, { value: any, output: any }>,
  /** Whether it reads its route's own state, which leaves out the route's projection outputs */
  routeState: boolean
};

/**
 * A route a read resolved through on its last full read: its path, raw state and the snapshot read
 * from it. A read of a property path reads only the route state's `key`, the path's first segment,
 * and `snapshot` is that key's; a read of the whole route has no `key`, and `snapshot` is the route's.
 */
export type IRouteSource = { route: string, state: object, key?: string, snapshot: any };

/** A route a wildcard read matched: the segment, the path read in it, and what was read */
export type IWildcardMatch = IRouteSource & { segment: string, path: string, value: any, found: boolean };

/** A wildcard read's matches, and the tree's route version, which changes when a route instance may have been added or removed */
export type IWildcardSource = { version: number, matches: IWildcardMatch[] };

/** What a read resolved through on its last full read */
export type IReadSource = IRouteSource | IWildcardSource;

export type IProjection = {
  key: string,
  reads: string[],
  projection: { (...reads: any): any},
  /** Where the output is written: `$projection_<key>` in the route, e.g. `/channel/1/$projection_count` */
  output: string,
  /** Whether a read covers the projection's own output, e.g. a read of the route's root object */
  readsOutput: boolean,
  /** The read values from the last run, compared by reference to skip the next one */
  values?: any[],
  /**
   * What each read resolved through on the last full read; undefined for a read that didn't
   * resolve. While every route still has the same cached snapshot, no read can have changed.
   */
  sources?: (IReadSource | undefined)[],
  /** Set for a keyed projection, whose one read is the record it maps */
  keyed?: IKeyedState,
  keyFunc?: { (obj: any): string | undefined }
}

export type IKeyFunc = { (val: any): string | undefined };

export type IRouteDefinition = {
  projections: IProjectionDefinitions,
  keyFunc?: IKeyFunc,
  routes?: IRouteDefinitions,
  /**
   * A follow route: it holds another tree's roots, written only by `ApplyDiff` from a subscription
   * to that tree, under the source's own keys. It has no projections of its own, so a source's
   * projection output (`$projection_<key>`) is held as it is, and any other write to it throws.
   * Projections elsewhere read it as any route. See `FollowRoutes`.
   */
  follow?: boolean
};

export type IRouteDefinitions = {
  [route: string]: IRouteDefinition
};

export type IRoute = {
  /** The instance's full route path from the tree root, e.g. `/channel/1/` */
  path: string;
  parts: string[];
  projections: IProjection[];
  /** Child instances by their own segments joined with `/`, e.g. `channel/1`, in creation order */
  childRoutes: Map<string, IRoute>;
  /** How many segments each child definition's pattern spans, in definition order, without repeats */
  childPartCounts: number[];
  keyFunc?: IKeyFunc;
  routeDefinitions?: IRouteDefinitions;
  /** A follow route, written only by `ApplyDiff`; see `IRouteDefinition.follow` */
  follow: boolean;
};
