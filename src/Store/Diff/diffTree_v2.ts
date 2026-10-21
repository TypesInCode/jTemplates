import { Snapshot } from '../Tree/snapshot';
import { ApplyValueToPath } from './utils/diffTree.utils';

type IProjectionDefinitions = {
  [key: string]: {
    reads: string[],
    projection: { (...reads: any): any }
  }
}

type IProjection = {
  reads: string[],
  projection: { (...reads: any): any}
}

type IRouteDefinitions = {
  [route: string]: {
    projections: IProjectionDefinitions,
    routes?: IRouteDefinitions
  }
};

type IRoute = {
  parts: string[];
  projections: IProjection[];
  childRoutes: IRoute[];
};

export class DiffTree {
  private routes: IRoute[];

  constructor(
    private keyFunc?: { (val: any): string | undefined },
    private routeDefinitions?: IRouteDefinitions, // TODO: Implement routes
    private routeBase = "",
    private rootState = Object.create(null),
    private snapshot = Snapshot.Create()
  ) { }

  WritePath(path: string, value: any) {
    ApplyValueToPath(this.snapshot, this.rootState, this.keyFunc, this.routeBase, path, value);
  }
}
