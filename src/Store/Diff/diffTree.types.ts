import type { JsonDiffResult } from "../../Utils/json";

/** A `DiffTreePublisher` method call in a `jt-batch` */
export interface IDiffMethod {
  /** The method to call */
  method: "writepath" | "patchpath" | "pushpath" | "splicepath";
  /** Arguments for the method call */
  arguments: Array<any>;
}

export type IDiffMethodBatch = IDiffMethod[];

/**
 * How a `DiffTreePublisher` delivers a commit to a subscription:
 * - `"diff"`: the commit's diff records for the matching roots (`IDiffPost`), which a store applies.
 * - `"snapshot"`: each matching root that changed, whole, as last committed (`ISnapshotUpdate`), which
 *   another tree writes.
 */
export type DeliveryForm = "diff" | "snapshot";

/** A subscription to a `DiffTreePublisher` */
export interface ISubscribeOptions {
  /**
   * The root keys it receives: exact keys, and patterns ending in `*` (`task_*`). Omitted, every
   * root. With a `keyFunc`, include the entity roots the received roots refer to.
   */
  roots?: readonly string[];
  /** How it's delivered; `"diff"` when omitted */
  form?: DeliveryForm;
  /** A group `DiffTreePublisher.Disconnect` ends it with, e.g. the channel it came from */
  group?: unknown;
}

/** A `"diff"` delivery */
export interface IDiffPost {
  /** The commit it comes from; on the delivery made on subscribing, the last commit's */
  seq: number;
  /** The commit's records for the matching roots; on subscribing, a `write` per matching committed root */
  diff: JsonDiffResult;
}

/** A `"snapshot"` delivery */
export interface ISnapshotUpdate {
  /** The commit it comes from; on the delivery made on subscribing, the last commit's */
  seq: number;
  /** Each matching root that changed, as committed, or on subscribing every matching committed root: shared with the tree, so read-only */
  roots: { [key: string]: unknown };
  /** Matching roots deleted by the commit */
  deleted: string[];
}

/**
 * A channel between threads: a `Worker`, a `MessagePort`, or a worker's own `self`. Messages are
 * read with `addEventListener`, never `onmessage`, so other messages can share the channel.
 */
export interface IChannel {
  postMessage(message: any, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: any) => void): void;
  removeEventListener(type: "message", listener: (event: any) => void): void;
  /** A `MessagePort` delivers nothing to `addEventListener` until it's started */
  start?(): void;
  /** A `MessagePort` is closed when it's no longer served */
  close?(): void;
}

/** A `jt-` message a client (a `StoreAsync`, `Subscribe`, `Once`) sends to a `HostPublisher` */
export type IHostRequest =
  /** Runs the calls, then projections, commits, and answers with a `jt-ack` */
  | { type: "jt-batch", id: number, calls: IDiffMethodBatch }
  /** Subscribes; the first state is posted, then `jt-subscribed` */
  | { type: "jt-subscribe", sub: number, roots?: readonly string[], form: DeliveryForm }
  | { type: "jt-unsubscribe", sub: number }
  /** Ends every subscription on the channel */
  | { type: "jt-disconnect" }
  /** See `DiffTree.MarkOpaque` */
  | { type: "jt-markopaque", keys: readonly string[] }
  /** From a `WorkerHub`, on the worker's own channel: serve `port`, a lease's channel, as `id` */
  | { type: "jt-serve", id: number, port: MessagePort }
  /** From a `WorkerHub`: stop serving lease `id`, ending its subscriptions */
  | { type: "jt-unserve", id: number };

/**
 * From a `WorkerHub` to a consumer worker, on its own channel: a port to `source`'s tree, for its
 * `OnConnect` handler. Sent when the consumer starts, and again when either worker restarts.
 */
export interface IConnectMessage {
  type: "jt-connect";
  source: string;
  port: MessagePort;
}

/**
 * A lease on a worker a `WorkerHub` owns: a port to it, served by its `HostPublisher`. The worker
 * runs while it has leases. A `StoreAsync` given a lease follows its port across restarts.
 */
export interface IWorkerLease {
  /** The worker's registered name */
  readonly name: string;
  /** The current port to the worker; replaced when the worker restarts */
  readonly port: MessagePort;
  readonly released: boolean;
  /**
   * Calls back with the new port each time the worker restarts.
   * @returns A function that removes the callback.
   */
  OnPort(callback: (port: MessagePort) => void): () => void;
  /** Ends the lease: its subscriptions end and its port closes. The last one releases the worker. */
  Release(): void;
}

/** A `jt-` message a `HostPublisher` posts to its clients */
export type IHostMessage =
  /** A delivery for subscription `sub` */
  | ({ type: "jt-post", sub: number } & (IDiffPost | ISnapshotUpdate))
  /** Batch `id` was applied and committed, after the commit's posts; `error` when it failed */
  | { type: "jt-ack", id: number, error?: unknown }
  /** Subscription `sub`'s first state has been posted (none when no root matched); `error` when subscribing failed */
  | { type: "jt-subscribed", sub: number, error?: unknown };

/** The prefix of every message the framework sends on a channel */
export const MESSAGE_PREFIX = "jt-";
