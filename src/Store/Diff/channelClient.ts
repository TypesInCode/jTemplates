import { IChannel, IDiffMethodBatch, IDiffPost, IHostMessage, ISnapshotUpdate, ISubscribeOptions } from "./diffTree.types";

/** Ids are unique across clients, so several can share one channel */
let nextId = 1;

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
  private batches = new Map<number, { resolve(): void, reject(error: unknown): void }>();
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
    const id = nextId++;
    return new Promise((resolve, reject) => {
      this.batches.set(id, { resolve, reject });
      this.channel.postMessage({ type: "jt-batch", id, calls });
    });
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
 * Subscribes to the tree a `HostPublisher` serves on a channel, such as a port to another worker.
 * The deliveries are the same as `DiffTreePublisher.Subscribe`'s, but they arrive asynchronously:
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
 * all have one, otherwise the commit that adds the last. See `DiffTreePublisher.Once`.
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
