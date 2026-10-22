export type IProjectionDefinitions = {
  [key: string]: {
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
  parts: string[];
  projections: IProjection[];
  childRoutes: IRoute[];
  keyFunc?: IKeyFunc;
  routeDefinitions?: IRouteDefinitions;
};
