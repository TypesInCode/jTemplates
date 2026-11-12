import { DiffTreePublisher } from "./diffTreePublisher";
import { IChannel, IDiffMethod, IHostMessage, IHostRequest, MESSAGE_PREFIX } from "./diffTree.types";
import { ListenForConnections } from "./onConnect";

/** A `HostPublisher`: the channels it serves */
export interface IHost {
  /**
   * Serves another channel, such as a `MessagePort` the worker was given.
   * @returns A function that stops serving it, ends its subscriptions, and closes it.
   */
  Serve(channel: IChannel): () => void;
  /** Stops serving every channel and ends their subscriptions */
  Stop(): void;
}

/**
 * Serves a `DiffTreePublisher` over channels: the worker's own (`self`) and any `MessagePort` given
 * to `Serve`. On each channel it answers the framework's `jt-` messages and leaves every other
 * message to the app's own listeners; it never takes `onmessage`.
 *
 * - `jt-batch`: runs the calls, then projections, commits, and posts `jt-ack` with the batch's id
 *   after the commit's posts. When a call throws, the calls after it and the projections are
 *   skipped, what the batch applied is still committed, and the ack carries the error: only that
 *   batch fails.
 * - `jt-subscribe` / `jt-unsubscribe`: a subscription for the channel. Its first state and every
 *   commit are posted as `jt-post`, then `jt-subscribed` once the first state is out.
 * - `jt-disconnect`: ends every subscription on the channel.
 * - `jt-markopaque`: see `DiffTree.MarkOpaque`.
 * - `jt-serve` / `jt-unserve`: from a `WorkerHub`, a lease's port to serve, or to stop serving.
 *
 * The worker's own work commits on the same publisher, and its commits reach every subscriber
 * without a round trip.
 *
 * @example
 * // worker entry
 * const tree = new DiffTreePublisher(keyFunc, routes);
 * HostPublisher(tree, self);
 * tree.WritePath("results", compute());
 * tree.RunProjections();
 * tree.Commit();
 */
export function HostPublisher(publisher: DiffTreePublisher, scope: IChannel): IHost {
  const served = new Map<IChannel, () => void>();
  /** Lease ports a `WorkerHub` asked this host to serve, by id */
  const leases = new Map<number, () => void>();

  function Serve(channel: IChannel) {
    const existing = served.get(channel);
    if (existing)
      return existing;

    const subscriptions = new Map<number, () => void>();
    const listener = (event: MessageEvent) => {
      const message = event.data as IHostRequest;
      if (!IsRequest(message))
        return;

      switch (message.type) {
        case "jt-batch": {
          const error = RunBatch(publisher, message.calls);
          Post(channel, error === undefined ? { type: "jt-ack", id: message.id } : { type: "jt-ack", id: message.id, error });
          break;
        }
        case "jt-subscribe": {
          const sub = message.sub;
          let error: unknown;
          try {
            subscriptions.set(sub, publisher.Subscribe(
              { roots: message.roots, form: message.form as any, group: channel },
              (delivery: any) => Post(channel, { type: "jt-post", sub, ...delivery }),
            ));
          }
          catch (err) {
            error = err;
          }

          Post(channel, error === undefined ? { type: "jt-subscribed", sub } : { type: "jt-subscribed", sub, error });
          break;
        }
        case "jt-unsubscribe":
          subscriptions.get(message.sub)?.();
          subscriptions.delete(message.sub);
          break;
        case "jt-disconnect":
          publisher.Disconnect(channel);
          subscriptions.clear();
          break;
        case "jt-markopaque":
          publisher.MarkOpaque(message.keys);
          break;
        case "jt-serve":
          leases.set(message.id, Serve(message.port));
          break;
        case "jt-unserve":
          leases.get(message.id)?.();
          leases.delete(message.id);
          break;
      }
    };

    channel.addEventListener("message", listener);
    channel.start?.();
    const stop = () => {
      if (served.get(channel) !== stop)
        return;

      served.delete(channel);
      channel.removeEventListener("message", listener);
      publisher.Disconnect(channel);
      subscriptions.clear();
      channel !== scope && channel.close?.();
    };
    served.set(channel, stop);
    return stop;
  }

  Serve(scope);
  // A hub's jt-connect ports can arrive before the worker's OnConnect handlers are registered
  ListenForConnections(scope);
  return {
    Serve,
    Stop() {
      for (const stop of Array.from(served.values()))
        stop();
    },
  };
}

/**
 * Applies a batch, runs projections and commits. A failed call skips the rest and the
 * projections; what was applied is committed either way.
 * @returns The batch's error, or undefined
 */
function RunBatch(publisher: DiffTreePublisher, calls: readonly IDiffMethod[]) {
  let error: unknown;
  try {
    for (let x = 0; x < calls.length; x++)
      RunMethod(publisher, calls[x]);

    publisher.RunProjections();
  }
  catch (err) {
    error = err;
  }

  try {
    publisher.Commit();
  }
  catch (err) {
    error ??= err;
  }

  return error;
}

function RunMethod(publisher: DiffTreePublisher, call: IDiffMethod) {
  const args = call.arguments;
  switch (call.method) {
    case "writepath": return publisher.WritePath(args[0], args[1]);
    case "splicepath": return publisher.SplicePath(args[0], args[1], args[2], args[3]);
    case "pushpath": return publisher.PushPath(args[0], args[1]);
    case "patchpath": return publisher.PatchPath(args[0], args[1]);
    default: throw new Error(`Unknown DiffTreePublisher method: ${(call as IDiffMethod).method}`);
  }
}

function IsRequest(message: unknown): message is IHostRequest {
  return typeof (message as IHostRequest)?.type === "string" && (message as IHostRequest).type.startsWith(MESSAGE_PREFIX);
}

/** Posts a message; an `error` that can't be cloned is sent as its text */
function Post(channel: IChannel, message: IHostMessage) {
  if (!("error" in message) || message.error === undefined)
    return channel.postMessage(message);

  try {
    channel.postMessage(message);
  }
  catch {
    channel.postMessage({ ...message, error: String(message.error) });
  }
}
