import { IChannel, IDiffMethodBatch, IDiffPost, IHostMessage, ISnapshotUpdate, ISubscribeOptions } from "./diffTree.types";

/** Ids are unique across clients, so several can share one channel */
let nextId = 1;

/** A batch sent and not yet acknowledged */
interface IPendingBatch {
  calls: IDiffMethodBatch;
  resolve(): void;
  reject(error: unknown): void;
}

interface IClientSubscription {
  callback: (delivery: any) => void;
  onSubscribed?: (error?: unknown) => void;
}

/**
 * The client side of a `HostPublisher` channel: it sends batches and subscriptions, and routes
 * the host's posts and acks back by id. Messages for ids it didn't send are left alone, so
 * other clients and the app's own messages share the channel.
 */
export class ChannelClient {
  private subscriptions = new Map<number, IClientSubscription>();
  private batches = new Map<number, IPendingBatch>();
  private listener = (event: MessageEvent) => this.Receive(event.data as IHostMessage);

  constructor(private channel: IChannel) {
    channel.addEventListener("message", this.listener);
    channel.start?.();
  }

  /**
   * Sends a batch of calls.
   * @returns A promise that resolves on the batch's `jt-ack`, after the commit's posts have been
   *   delivered, or rejects with the batch's error.
   */
  Batch(calls: IDiffMethodBatch): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      this.batches.set(id, { calls, resolve, reject });
      this.channel.postMessage({ type: "jt-batch", id, calls });
    });
  }

  /** Rejects the batches waiting for an ack with `error`; this client stops waiting for them */
  RejectBatches(error: unknown) {
    const batches = Array.from(this.batches.values());
    this.batches.clear();
    batches.forEach(batch => batch.reject(error));
  }

  /** See `DiffTree.MarkOpaque` */
  MarkOpaque(keys: readonly string[]) {
    this.channel.postMessage({ type: "jt-markopaque", keys });
  }

  /**
   * Subscribes to the host's tree. Deliveries arrive as the host posts them.
   * @param onSubscribed Called once the host has posted the first state, with its error when
   *   subscribing failed.
   * @returns The subscription's id.
   */
  Subscribe(options: ISubscribeOptions, callback: (delivery: any) => void, onSubscribed?: (error?: unknown) => void): number {
    const sub = nextId++;
    this.subscriptions.set(sub, { callback, onSubscribed });
    this.channel.postMessage({ type: "jt-subscribe", sub, roots: options.roots, form: options.form ?? "diff" });
    return sub;
  }

  Unsubscribe(sub: number) {
    if (this.subscriptions.delete(sub))
      this.channel.postMessage({ type: "jt-unsubscribe", sub });
  }

  /**
   * Ends this client's subscriptions and stops listening. Batches waiting for an ack are left
   * unsettled. The channel stays open.
   */
  Destroy() {
    for (const sub of Array.from(this.subscriptions.keys()))
      this.Unsubscribe(sub);

    this.batches.clear();
    this.channel.removeEventListener("message", this.listener);
  }

  private Receive(message: IHostMessage) {
    switch (message?.type) {
      case "jt-post":
        this.subscriptions.get(message.sub)?.callback(message);
        break;
      case "jt-ack": {
        const batch = this.batches.get(message.id);
        if (!batch)
          break;

        this.batches.delete(message.id);
        "error" in message && message.error !== undefined ? batch.reject(message.error) : batch.resolve();
        break;
      }
      case "jt-subscribed": {
        const subscription = this.subscriptions.get(message.sub);
        if (!subscription)
          break;

        if ("error" in message && message.error !== undefined)
          this.subscriptions.delete(message.sub);

        subscription.onSubscribed?.(message.error);
        break;
      }
    }
  }
}

/**
 * A subscription to a tree served on a channel that outlives the channel: when the tree is
 * replaced (a restarted worker, given on a new port), `Connect` subscribes to the new one, and its
 * first state also deletes the roots this subscription delivered that the new tree doesn't hold. A
 * subscriber that applies every delivery, a store or a tree, then holds the new tree's state, and
 * a wildcard read of it reads nothing the old tree left behind.
 *
 * - The first state after a reconnect is one delivery: the new tree's roots, then a `delete` record
 *   (in the `"diff"` form) or a `deleted` key (in the `"snapshot"` form) for each root gone, so
 *   nothing applied in between holds both. With no roots in the new tree, it's the deletes alone.
 * - A root is delivered while it was written by the last delivery that touched it, and gone once a
 *   delivery deletes it, as a `HostPublisher`'s deliveries say.
 *
 * @example
 * const engine = new ChannelSubscription({ roots: ["run", "$projection_*"] }, (post, first) => {
 *   tree.ApplyDiff(post.diff, "/engine/");
 *   tree.RunProjections();
 *   tree.Commit();
 * });
 * OnConnect("engine", port => engine.Connect(port));
 */
export class ChannelSubscription {
  /** The source's root keys delivered and not deleted */
  private delivered = new Set<string>();
  private client?: ChannelClient;
  private ownClient = false;
  private sub?: number;

  /**
   * @param options The roots, and the form, as `ObservableDiffTree.Subscribe` takes them.
   * @param callback Each delivery, and whether it's the first state of a `Connect`.
   */
  constructor(private options: ISubscribeOptions, private callback: (delivery: any, first: boolean) => void) { }

  /**
   * Subscribes over a channel, or a client of one, in place of the last: the first state arrives
   * as one delivery, with the deletes for the roots the last tree had and this one hasn't.
   * @param onSubscribed Called once the first state is out, with the error when subscribing failed.
   * @returns What ends this connection's subscription.
   */
  Connect(channel: IChannel | ChannelClient, onSubscribed?: (error?: unknown) => void): () => void {
    this.Stop();
    const client = this.client = channel instanceof ChannelClient ? channel : new ChannelClient(channel);
    this.ownClient = !(channel instanceof ChannelClient);
    const previous = this.delivered;
    this.delivered = new Set();
    const snapshot = this.options.form === "snapshot";
    // After a tree that delivered something, the first state waits for jt-subscribed to take the deletes
    const hold = previous.size > 0;
    let first: any;
    let subscribed = false;
    const sub = this.sub = client.Subscribe(this.options, delivery => {
      if (subscribed || !hold) {
        this.Track(delivery, snapshot);
        this.callback(delivery, !subscribed);
        return;
      }

      first = delivery;
    }, error => {
      subscribed = true;
      if (error === undefined && hold) {
        const delivery = first ?? (snapshot ? { seq: 0, roots: {}, deleted: [] } : { seq: 0, diff: [] });
        this.Track(delivery, snapshot);
        for (const key of previous)
          if (!this.delivered.has(key))
            snapshot ? delivery.deleted.push(key) : delivery.diff.push({ type: "delete", path: [key] });

        (first !== undefined || (snapshot ? delivery.deleted.length > 0 : delivery.diff.length > 0)) && this.callback(delivery, true);
      }

      onSubscribed?.(error);
    });
    return () => this.sub === sub && this.Stop();
  }

  /** Ends the subscription on the current channel; what it delivered is kept for the next `Connect` */
  Stop() {
    if (this.client && this.sub !== undefined)
      this.ownClient ? this.client.Destroy() : this.client.Unsubscribe(this.sub);

    this.client = undefined;
    this.sub = undefined;
  }

  private Track(delivery: any, snapshot: boolean) {
    if (snapshot) {
      for (const key of Object.keys(delivery.roots))
        this.delivered.add(key);

      for (const key of delivery.deleted)
        this.delivered.delete(key);

      return;
    }

    for (const record of (delivery as IDiffPost).diff) {
      const key = String(record.path[0]);
      record.type === "delete" && record.path.length === 1 ? this.delivered.delete(key) : this.delivered.add(key);
    }
  }
}

/**
 * Subscribes to the tree a `HostPublisher` serves on a channel, such as a port to another worker.
 * The deliveries are the same as `ObservableDiffTree.Subscribe`'s, but they arrive asynchronously:
 * the first state as the host's first post, then each commit. Values are structured-cloned copies.
 * @returns A function that ends the subscription.
 */
export function Subscribe(channel: IChannel, options: ISubscribeOptions & { form: "snapshot" }, callback: (update: ISnapshotUpdate) => void): () => void;
export function Subscribe(channel: IChannel, options: ISubscribeOptions & { form?: "diff" }, callback: (post: IDiffPost) => void): () => void;
export function Subscribe(channel: IChannel, options: ISubscribeOptions, callback: (delivery: any) => void): () => void {
  const client = new ChannelClient(channel);
  client.Subscribe(options, callback, error => error !== undefined && client.Destroy());
  return () => client.Destroy();
}

/**
 * Waits on a channel for the first delivery in which every key has a value: at once when they
 * all have one, otherwise the commit that adds the last. See `ObservableDiffTree.Once`.
 * @param keys Exact root keys; no patterns.
 * @param options `signal` cancels the wait, rejecting with its reason.
 * @returns Each key's value.
 */
export function Once(channel: IChannel, keys: readonly string[], options: { signal?: AbortSignal } = {}): Promise<{ [key: string]: unknown }> {
  const { signal } = options;
  return new Promise((resolve, reject) => {
    if (keys.some(key => key.endsWith("*")))
      return reject(new Error(`Once takes exact keys, not patterns: ${keys.join(", ")}`));

    if (signal?.aborted)
      return reject(signal.reason);

    // Updates carry only the roots that changed, so the values seen so far are kept
    const values: { [key: string]: unknown } = {};
    const client = new ChannelClient(channel);
    const onAbort = () => {
      finish();
      reject(signal!.reason);
    };
    const finish = () => {
      client.Destroy();
      signal?.removeEventListener("abort", onAbort);
    };

    client.Subscribe({ roots: keys, form: "snapshot" }, (update: ISnapshotUpdate) => {
      Object.assign(values, update.roots);
      for (const key of update.deleted)
        delete values[key];

      if (keys.every(key => values[key] !== undefined)) {
        finish();
        resolve(Object.fromEntries(keys.map(key => [key, values[key]])));
      }
    }, error => {
      if (error !== undefined) {
        finish();
        reject(error);
      }
    });

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
