import { ChannelSubscription } from "./channelClient";
import type { IChannel, IDiffPost } from "./diffTree.types";
import type { ObservableDiffTree } from "./observableDiffTree";
import { HostPublisher } from "./hostPublisher";
import type {
  DiffTreeEndpointFollowFunc,
  DiffTreeEndpointRemoteFunc,
  IDiffTreeEndpoint,
  IDiffTreeEndpointHostOptions,
  IDiffTreeEndpointOptions,
  IDiffTreeEndpointRemote
} from "./diffTreeEndpoint.types";
import { OnConnect } from "./onConnect";
import type { IRouteDefinitions } from "./utils/diffTree.types";
import { FollowRoutes as CreateFollowRoutes } from "./utils/routes";

// An endpoint on a hub, defined once, and the functions that build its tree and host it: `FollowRoutes`
// for its routes, and `Host` to serve it and connect it to the endpoint's sources, the same for a
// worker's tree (the worker calls it) and one on the main thread (`DiffTreeHub` calls it). Imports only
// the Diff modules, never the Store barrel (which reads `window`), so every side imports the same
// definition: the main thread to register it and open stores on it, the tree that publishes it, and
// the endpoints that follow it.

/**
 * DiffTree endpoints: an endpoint is a key in a `DiffTreeHub`, and one tree in the app's dependency graph.
 * `Define` describes it once, as plain data, and everything attached to it is derived from that: the
 * hub's registration (`DiffTreeHub.Register`), the tree's follow routes (`FollowRoutes`), its hosting
 * (`Host`), and the stores opened on it (`StoreAsync`, `StoreSync`).
 *
 * @example
 * // ledger-endpoint.ts and totals-endpoint.ts: imported by the main thread and the workers
 * export const ledgerEndpoint = DiffTreeEndpoint.Define("ledger");
 * export const totalsEndpoint = DiffTreeEndpoint.Define("totals", remote => ({
 *   ledger: remote(ledgerEndpoint, ["entries"])      // { entries: "/ledger/entries" }
 * }));
 *
 * // totals-tree.ts
 * export function newTotalsTree() {
 *   return new ObservableDiffTree(totalsEndpoint.keyFunc, {
 *     "/": { projections: { totals: { reads: [totalsEndpoint.config.ledger.entries], projection: categoryTotals } } },
 *     ...DiffTreeEndpoint.FollowRoutes(totalsEndpoint)
 *   });
 * }
 *
 * // totals-worker.ts
 * DiffTreeEndpoint.Host(totalsEndpoint, newTotalsTree(), self);
 */
export namespace DiffTreeEndpoint {
  /**
   * Defines an endpoint. `remote(source, roots)`, given to `build`, records a connection when it's
   * called and returns each root's path in the following tree. It takes the source's definition,
   * so an endpoint can only follow one defined before it, and the source's `keyFunc` comes with it.
   * Roots are the source's tree keys as they are: `"$projection_summary"` follows a projection
   * output, and `"o_*"` follows keyed entities.
   *
   * @example
   * const totalsEndpoint = DiffTreeEndpoint.Define("totals", remote => ({
   *   ledger: remote(ledgerEndpoint, ["entries"])     // { entries: "/ledger/entries" }
   * }));
   * hub.Register(totalsEndpoint, () => new Worker(new URL("./totals-worker.ts", import.meta.url), { type: "module" }));
   * @param name The endpoint's name: its key in the `DiffTreeHub`, and the segment of its follow route
   *   in a tree that follows it.
   * @param build Returns the endpoint's config, the paths `remote` gave included.
   * @param options `keyFunc`, and the `opaque` root keys held whole.
   * @returns The endpoint's definition: plain data.
   * @throws When `name` isn't one route segment (or is a parameter, `{id}`), or the endpoint follows itself.
   */
  export function Define<C extends object = {}>(
    name: string,
    build: (remote: DiffTreeEndpointRemoteFunc) => C = () => ({}) as C,
    options: IDiffTreeEndpointOptions = {}
  ): IDiffTreeEndpoint<C> {
    if (name === "" || name.includes("/") || (name.startsWith("{") && name.endsWith("}")))
      throw new Error(`DiffTreeEndpoint: invalid name ${name}, one route segment, not a parameter.`);

    const remotes = new Map<string, IDiffTreeEndpointRemote>();
    const remote: DiffTreeEndpointRemoteFunc = (source, roots) => {
      if (source.name === name)
        throw new Error(`DiffTreeEndpoint: ${name} can't follow itself.`);

      let spec = remotes.get(source.name);
      if (!spec) {
        spec = { source: source.name, keyFunc: source.keyFunc, roots: [] };
        remotes.set(source.name, spec);
      }

      for (let x = 0; x < roots.length; x++)
        spec.roots.includes(roots[x]) || spec.roots.push(roots[x]);

      const route = FollowRoute(source.name);
      return Object.fromEntries(roots.map(root => [root, route + root])) as never;
    };

    const config = build(remote);
    return {
      name,
      keyFunc: options.keyFunc,
      config,
      remotes: Array.from(remotes.values()),
      sources: Array.from(remotes.keys()),
      opaque: [...(options.opaque ?? [])]
    };
  }

  /**
   * Where a source's roots are held in a tree that follows it: `/<source>/`. Fixed by
   * `FollowRoutes`, which defines a follow route at `/<source>` for each source.
   * @param source The source endpoint's name.
   */
  export function FollowRoute(source: string) {
    return `/${source}/`;
  }

  /**
   * The follow routes for an endpoint's sources, each with the source's keyFunc, to merge into the
   * route definitions of the tree that hosts it.
   * @example
   * new ObservableDiffTree(endpoint.keyFunc, { "/": { projections }, ...DiffTreeEndpoint.FollowRoutes(endpoint) });
   * @param endpoint The endpoint the tree is registered as.
   * @returns Route definitions, one per source.
   */
  export function FollowRoutes(endpoint: IDiffTreeEndpoint): IRouteDefinitions {
    return CreateFollowRoutes(Object.fromEntries(endpoint.remotes.map(remote => [remote.source, remote.keyFunc])));
  }

  /**
   * Hosts an endpoint's tree on a channel: marks the endpoint's `opaque` keys on it, serves it to
   * stores and followers (`HostPublisher`), and follows the endpoint's sources into it (`Connect`). A
   * worker entry calls it on its own channel; a `DiffTreeHub` calls it for a tree on the main thread,
   * on a channel it creates. So every tree is hosted the same way, and a tree file only builds the
   * tree.
   *
   * @example
   * // totals-worker.ts
   * DiffTreeEndpoint.Host(totalsEndpoint, newTotalsTree(), self);
   *
   * // a tree that acts on what it follows at the end of the turn, and commits then
   * DiffTreeEndpoint.Host(traceEndpoint, tree.publisher, self, { onFollow: () => tree.received() });
   * @param endpoint The endpoint the tree is registered as.
   * @param tree The tree, with the endpoint's follow routes (`FollowRoutes`).
   * @param scope The channel the hub posts to: the worker's own; `globalThis` when omitted.
   * @param options `onFollow`: what runs after each source's post is applied. `onConnect`: what
   *   runs with each new port to a source.
   * @returns A function that stops following the sources and serving the tree.
   */
  export function Host(
    endpoint: IDiffTreeEndpoint,
    tree: ObservableDiffTree,
    scope: IChannel = globalThis as any,
    options: IDiffTreeEndpointHostOptions = {}
  ): () => void {
    tree.MarkOpaque(endpoint.opaque);
    const host = HostPublisher(tree, scope);
    const stop = Connect(endpoint, tree, scope, options);
    return () => {
      stop();
      host.Stop();
    };
  }

  /**
   * The following part of `Host`: follows each of an endpoint's sources into `tree`, over the ports
   * the `DiffTreeHub` posts to `scope` (`OnConnect`). A `ChannelSubscription` per source applies each
   * post at the source's follow route, then `onFollow` runs. When a source restarts, the hub gives a
   * new port, and the subscription moves to it: the roots the new source doesn't hold are deleted.
   * Call it alone only for a tree served some other way.
   *
   * @example
   * const tree = new ObservableDiffTree(endpoint.keyFunc, { "/": { projections }, ...DiffTreeEndpoint.FollowRoutes(endpoint) });
   * HostPublisher(tree, self);
   * DiffTreeEndpoint.Connect(endpoint, tree, self);
   * @param endpoint The endpoint whose sources are followed.
   * @param tree The tree, with the endpoint's follow routes (`FollowRoutes`).
   * @param scope The channel the hub posts to: the worker's own; `globalThis` when omitted.
   * @param options `onFollow`: what runs after each post is applied; by default the projections run
   *   and the tree commits. `onConnect`: what runs with each new port to a source, after the
   *   follow has moved to it.
   * @returns A function that stops following every source.
   */
  export function Connect(
    endpoint: IDiffTreeEndpoint,
    tree: ObservableDiffTree,
    scope: IChannel = globalThis as any,
    options: IDiffTreeEndpointHostOptions = {}
  ): () => void {
    const onFollow = options.onFollow ?? Commit;
    const stops = endpoint.remotes.map(remote => {
      const follow = Follower(remote, tree, onFollow);
      return OnConnect(remote.source, port => {
        const stopFollow = follow.Connect(port);
        const stopMore = options.onConnect?.(tree, remote.source, port);
        return () => {
          typeof stopMore === "function" && stopMore();
          stopFollow();
        };
      }, scope);
    });

    return () => stops.forEach(stop => stop());
  }

  /** Applies a source's posts at its follow route, over the ports `Connect` gives it */
  function Follower(remote: IDiffTreeEndpointRemote, tree: ObservableDiffTree, onFollow: DiffTreeEndpointFollowFunc) {
    const route = FollowRoute(remote.source);
    return new ChannelSubscription({ roots: remote.roots }, (post: IDiffPost) => {
      tree.ApplyDiff(post.diff, route);
      onFollow(tree, remote.source);
    });
  }

  function Commit(tree: ObservableDiffTree) {
    tree.RunProjections();
    tree.Commit();
  }
}
