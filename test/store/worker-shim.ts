import type { IChannel, IRouteDefinitions } from "../../src/Store/Diff";
import type { IDiffTreeWorker } from "../../src/Store/Diff/diffTreeHub";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { HostPublisher, IHost } from "../../src/Store/Diff/hostPublisher";

// jsdom has no Worker, and a real worker entry module (like defaultDiffTreeWorker.ts) can
// only be built by a bundler. This shim plays that role for tests: a pair of channels that
// deliver each message asynchronously, as a structured-cloned copy in a "message" event, as a
// real worker boundary would, with a HostPublisher serving a same-thread tree on one side.

const clone = (v: unknown, transfer?: Transferable[]) => (v === undefined ? v : structuredClone(v, { transfer: transfer as any }));

/** One end of a shim channel: an `EventTarget` whose `postMessage` reaches the other end */
export type ShimPort = EventTarget & {
  postMessage(data: unknown, transfer?: Transferable[]): void;
  start(): void;
  terminate(): void;
  /** Every message sent from this end, before delivery */
  sent: any[];
  terminated: boolean;
};

/** A pair of connected shim ports, like a `MessageChannel` */
export function CreateShimChannel(): [ShimPort, ShimPort] {
  const a = CreatePort();
  const b = CreatePort();
  a.postMessage = Sender(a, b);
  b.postMessage = Sender(b, a);
  return [a, b];
}

function CreatePort(): ShimPort {
  const port = new EventTarget() as ShimPort;
  port.sent = [];
  port.terminated = false;
  port.start = () => {};
  port.terminate = () => {
    port.terminated = true;
  };
  return port;
}

function Sender(from: ShimPort, to: ShimPort) {
  return (data: unknown, transfer?: Transferable[]) => {
    from.sent.push(data);
    const copy = clone(data, transfer);
    setTimeout(() => !from.terminated && !to.terminated && to.dispatchEvent(new MessageEvent("message", { data: copy })));
  };
}

/**
 * A `Worker` handle backed by a same-thread `ObservableDiffTree` served by a `HostPublisher`, for
 * use with `StoreAsync` in tests. Mirrors what a bundler-built worker entry file does, minus the
 * actual thread. `tree` is the worker's side, for tests of the worker's own commits.
 */
export function CreateShimWorker(keyFunc?: (val: any) => string, routes?: IRouteDefinitions, opaque?: readonly string[]) {
  const [main, worker] = CreateShimChannel();
  const tree = new ObservableDiffTree({ keyFunc, routes, opaque });
  const host: IHost = HostPublisher(tree, worker);
  // Terminating the worker ends what it serves, as a real worker's ports close with it
  main.terminate = () => {
    main.terminated = true;
    host.Stop();
  };
  return { worker: main, scope: worker, tree, host };
}

/** `CreateShimWorker`'s main-thread side alone, typed as a `Worker` */
export function CreateShimDiffWorker(keyFunc?: (val: any) => string, routes?: IRouteDefinitions, opaque?: readonly string[]): ShimPort & Worker {
  return CreateShimWorker(keyFunc, routes, opaque).worker as ShimPort & Worker;
}

/** Waits for every shim message already scheduled, and the ones they schedule, to be delivered */
export async function Settle(rounds = 4) {
  for (let x = 0; x < rounds; x++)
    await new Promise((resolve) => setTimeout(resolve));
}

/**
 * A worker on the calling thread, for a `DiffTreeHub`: `host` serves one end of a `MessageChannel` as
 * the worker's own channel, as a worker entry does (`DiffTreeEndpoint.Host(endpoint, tree, scope)`), and
 * the other end stands in for the `Worker` the hub posts to and terminates. Messages cross by
 * structured clone and ports transfer, as to a worker.
 * @param host Hosts the worker's tree on its channel; may return what stops it, run on terminate.
 */
export function CreateShimHost(host: (scope: IChannel) => (() => void) | void): IDiffTreeWorker {
  const { port1, port2 } = new MessageChannel();
  const stop = host(port2 as unknown as IChannel);
  port2.start();
  return {
    postMessage: (message: any, transfer: Transferable[]) => port1.postMessage(message, transfer),
    terminate: () => {
      stop && stop();
      port1.close();
      port2.close();
    }
  };
}

/** Waits until `check` passes, or fails with its error after `ms` */
export async function WaitFor(check: () => void, ms = 2000) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      return check();
    } catch (err) {
      if (Date.now() > end) throw err;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}
