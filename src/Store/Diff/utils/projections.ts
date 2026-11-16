import { JsonMaintainUnchanged, JsonType, SetOwnProperty } from "../../../Utils/json";
import { ISnapshotState, Snapshot } from "../../Tree/snapshot";
import { IKeyedState, IProjection, IReadSource, IRoute, IRouteSource, IWildcardMatch, IWildcardSource } from "./diffTree.types";
import { IsWildcardPath, PROJECTION_PREFIX, PropertiesOverlap, RouteAndProperty, RouteMatches, SplitRouteAndPath } from "./paths";
import { RouteInstances } from "./routes";
import { ExpandWildcardPath, KeyUnchanged, ReadPath, ReadSnapshot, Remove, RouteState, WritePath } from "./state";

function WalkChanges(start: any, change: any, callback: (change: any) => boolean) {
  if (start === change)
    return;

  const lastType = JsonType(start);
  const nextType = JsonType(change);

  switch (nextType) {
    case "array": {
      if (lastType === "array") {
        for (let x = 0; x < change.length; x++)
          WalkChanges(x < start.length ? start[x] : undefined, change[x], callback)
      }
      else
        for (let x = 0; x < change.length; x++)
          WalkChanges(undefined, change[x], callback);

      break;
    }
    case "object": {
      if (!callback(change)) {
        const keys = Object.keys(change);
        if (lastType === "object")
          for (let x = 0; x < keys.length; x++)
            WalkChanges(Object.hasOwn(start, keys[x]) ? start[keys[x]] : undefined, change[keys[x]], callback);
        else
          for (let x = 0; x < keys.length; x++)
            WalkChanges(undefined, change[keys[x]], callback);
      }
      break;
    }
  }
}

/** Runs the projections of a DiffTree's route instances against its state */
export class Projections {
  // Every projection of every route instance, dependencies first, as of `orderVersion`
  private order: IProjection[] | undefined;
  private orderVersion = -1;

  constructor(private snapshot: ISnapshotState, private rootState: object, private routes: RouteInstances) { }

  /**
   * Runs every projection of every route instance, dependencies first. A projection is skipped
   * when no route it reads through changed since its last run, when a read's parent is missing,
   * or when every read value is the same as its last run. Outputs are written to
   * `$projection_<key>` in their route without a diff, and are their own snapshots, so they're
   * never changed in place. Instead, each part of an output with no changes from the last one
   * written is replaced by the last one's object (JsonMaintainUnchanged): unchanged parts keep
   * their identity, so the projections and readers using them are skipped and `Commit` passes
   * over them. An output with no changes at all isn't written.
   * @throws When projections depend on each other in a cycle
   */
  Run() {
    // Rebuilt once after any number of instances were created or deleted
    if (this.order === undefined || this.orderVersion !== this.routes.version) {
      this.order = OrderProjections(this.routes.root);
      this.orderVersion = this.routes.version;
    }

    const order = this.order;
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
        const last = ReadPath(this.rootState, projection.output);

        const next = projection.projection(...values)
        // The last output is its own snapshot, so it's never changed and its parts can be shared
        output = JsonMaintainUnchanged(next, last);

        if (projection.keyFunc) {
          let nextMap: { [key: string]: any } = {};
          let candidateKeys = new Set<string>();
          WalkChanges(last, output, function (change) {
            const key = projection.keyFunc(change);
            if (key) {
              if (Object.hasOwn(nextMap, key))
                throw new Error("Duplicate keys found in projection output");

              nextMap[key] = change;
              return true;
            }

            return false;
          });

          WalkChanges(output, last, function (change) {
            const key = projection.keyFunc(change);
            if (key) {
              candidateKeys.add(key);
              return true;
            }

            return false;
          });

          for (let key in nextMap) {
            candidateKeys.delete(key);
            WritePath(this.snapshot, this.rootState, `${projection.output}_${key}`, nextMap[key]);
            Snapshot.Register(this.snapshot, nextMap[key]);
          }

          // The output is a path, e.g. `/$projection_out`: a promoted root is a property of its route
          const [route, property] = RouteAndProperty(projection.output);
          const state = RouteState(this.rootState, route);
          for (let key of candidateKeys)
            Remove(this.snapshot, state, `${property}_${key}`);
        }

        // An output with no changes leaves the last one in place, so the projections reading it
        // see the same objects and are skipped
        if (projection.values !== undefined && output === last) {
          projection.values = values;
          continue;
        }
      }

      WritePath(this.snapshot, this.rootState, projection.output, output);
      Snapshot.Register(this.snapshot, output);

      if (projection.readsOutput) {
        // Its own output is one of its reads, so the output it just wrote isn't a change
        const read = projection.sources;
        projection.values = this.ReadValues(projection.reads, projection.sources = new Array(projection.reads.length), read);
      }
      else {
        projection.values = values;
        this.RefreshSources(projection.sources, SplitRouteAndPath(projection.output)[0]);
      }
    }
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
        if (source.version !== this.routes.version)
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
   * state again, so a key written with a new value is a change too (see KeyUnchanged).
   */
  private SourceUnchanged(source: IRouteSource) {
    if (source.key === undefined)
      return Snapshot.Peek(this.snapshot, source.state) === source.snapshot;

    return KeyUnchanged(this.snapshot, source.state, source.key, source.snapshot);
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
   * Snapshots of the values at each path.
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

      const [value, found, source] = ReadSnapshot(this.snapshot, this.rootState, paths[x]);
      sources[x] = source;
      if (!found)
        return undefined;

      values[x] = value;
    }

    return values;
  }

  /**
   * Reads every route a wildcard path matches. While no route instance was added or removed since
   * the last read, the matches are the same, and a match whose route has the same snapshot keeps
   * the value it read.
   */
  private ReadWildcard(path: string, previous: IWildcardSource | undefined): IWildcardSource {
    const version = this.routes.version;
    if (previous && previous.version === version) {
      const matches = previous.matches.map(match =>
        this.SourceUnchanged(match) ? match : this.ReadMatch(match.segment, match.path));
      return { version, matches };
    }

    const paths = ExpandWildcardPath(this.rootState, path);
    const matches: IWildcardMatch[] = [];
    for (const segment in paths)
      matches.push(this.ReadMatch(segment, paths[segment]));

    return { version, matches };
  }

  private ReadMatch(segment: string, path: string): IWildcardMatch {
    const [value, found, source] = ReadSnapshot(this.snapshot, this.rootState, path);
    // An expanded path's route exists, so a source is always found
    return { ...source!, segment, path, value, found };
  }
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
    // A new output keeps every part of the last one with no changes (see Run)
    const entry = last && last.value === value ? last : { value, output: JsonMaintainUnchanged(projection.projection(value, key), last?.output) };

    entries.set(key, entry);
    changed ||= entry !== last && entry.output !== last?.output;
    if (entry.output !== undefined)
      SetOwnProperty(output, key, entry.output);
  }

  // A key that's gone changes the output unless it was left out of it
  for (const [key, last] of state.entries)
    if (!entries.has(key) && last.output !== undefined)
      changed = true;

  state.entries = entries;
  return changed ? output : UNCHANGED;
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
