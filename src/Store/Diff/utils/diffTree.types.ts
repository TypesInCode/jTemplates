export type IProjectionDefinitions = {
  [key: string]: {
    /**
     * Paths relative to the route, or from the root when starting with `/`. One route segment may
     * end in `*` to read every matching route, e.g. `child/row_*` + `/name`, which passes an object
     * keyed by matched segment.
     */
    reads: string[],
    projection: { (...reads: any): any }
  }
}

export type IProjection = {
  key: string,
  reads: string[],
  projection: { (...reads: any): any},
  /** Where the output is written: `$projection_<key>` in the route, e.g. `/channel/1/$projection_count` */
  output: string,
  /** Whether a read covers the projection's own output, e.g. a read of the route's root object */
  readsOutput: boolean,
  /** The read values from the last run, compared by reference to skip the next one */
  values?: any[]
}

export type IKeyFunc = { (val: any): string | undefined };

export type IRouteDefinition = {
  projections: IProjectionDefinitions,
  keyFunc?: IKeyFunc,
  routes?: IRouteDefinitions
};

export type IRouteDefinitions = {
  [route: string]: IRouteDefinition
};

export type IRoute = {
  /** The instance's full route path from the tree root, e.g. `/channel/1/` */
  path: string;
  parts: string[];
  projections: IProjection[];
  childRoutes: IRoute[];
  keyFunc?: IKeyFunc;
  routeDefinitions?: IRouteDefinitions;
};
