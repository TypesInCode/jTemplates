import type { ObservableDiffTree } from "./observableDiffTree";
import type { IKeyFunc } from "./utils/diffTree.types";

/** A connection to another endpoint, recorded by the `remote` given to `DiffTreeEndpoint.Define` */
export interface IDiffTreeEndpointRemote {
  /** The source's name: its name in the `DiffTreeHub`, and its follow route's segment */
  source: string;
  /** The source's keyFunc, for its follow route */
  keyFunc?: IKeyFunc;
  /** The source's root keys followed, as the source's tree holds them; patterns included */
  roots: string[];
}

/**
 * Follows `roots` of `source`. Recorded on the endpoint being defined when it's called.
 * @returns Each root's path in the following tree, e.g. `{ entries: "/ledger/entries" }`.
 */
export type DiffTreeEndpointRemoteFunc = <const K extends string>(
  source: IDiffTreeEndpoint<object>,
  roots: readonly K[]
) => { readonly [P in K]: string };

/** `DiffTreeEndpoint.Define` options */
export interface IDiffTreeEndpointOptions {
  /** How the data published here is keyed. Endpoints that follow this one use it for their follow route. */
  keyFunc?: IKeyFunc;
  /**
   * Root keys held whole: "never diff this path". Local to each thing attached to the endpoint: the
   * tree hosting it marks itself with them (`DiffTreeEndpoint.Host`), and each store opened on
   * it holds them whole.
   */
  opaque?: readonly string[];
}

/**
 * An endpoint on a `DiffTreeHub`, defined: its name, how its data is keyed, the endpoints it follows and
 * the keys held whole. Plain data that drives the creation of what's attached to it: the hub's
 * registration, the tree that publishes it, the stores opened on it.
 */
export interface IDiffTreeEndpoint<C extends object = object> {
  readonly name: string;
  readonly keyFunc?: IKeyFunc;
  /** What `Define`'s callback returned: the paths `remote` gave, and anything else kept there */
  readonly config: C;
  /** One per source, in the order first followed */
  readonly remotes: readonly IDiffTreeEndpointRemote[];
  /** The sources' names, in the same order */
  readonly sources: readonly string[];
  /** Root keys held whole, by the tree and by every store opened on the endpoint */
  readonly opaque: readonly string[];
}

/**
 * Runs after a source's post is applied at its follow route in the following tree.
 * @param tree The following tree.
 * @param source The name of the source the post came from.
 */
export type DiffTreeEndpointFollowFunc = (tree: ObservableDiffTree, source: string) => void;

/**
 * Runs with each new port to a source, after the follow has moved to it: when the tree starts,
 * and again when the source restarts.
 * @param tree The following tree.
 * @param source The source's name.
 * @param port The port to the source, for reads besides the follow (a one-off `Once`, say).
 * @returns Optionally, what ends what it started; it runs before the next port's call.
 */
export type DiffTreeEndpointConnectFunc = (tree: ObservableDiffTree, source: string, port: MessagePort) => (() => void) | void;

/** `DiffTreeEndpoint.Host` and `DiffTreeEndpoint.Connect` options */
export interface IDiffTreeEndpointHostOptions {
  /**
   * Runs after each post from a source is applied. Default: run the projections and commit, so the
   * tree's own subscribers get the change at once. A tree that acts later (at the end of the turn,
   * say) does its own committing here instead.
   */
  onFollow?: DiffTreeEndpointFollowFunc;
  /**
   * Runs with each new port to a source, after the follow has moved to it. For a tree that reads
   * from a source besides what it follows; the port stays the follow's, so don't close it.
   */
  onConnect?: DiffTreeEndpointConnectFunc;
}
