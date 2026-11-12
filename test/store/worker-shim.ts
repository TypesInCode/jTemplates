import type { IRouteDefinitions } from "../../src/Store/Diff";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import { HostPublisher, IHost } from "../../src/Store/Diff/hostPublisher";

// jsdom has no Worker, and a real worker entry module (like defaultDiffTreeWorker.ts) can
// only be built by a bundler. This shim plays that role for tests: a pair of channels that
// deliver each message asynchronously, as a structured-cloned copy in a "message" event, as a
// real worker boundary would, with a HostPublisher serving a same-thread tree on one side.

const clone = (v: unknown) => (v === undefined ? v : structuredClone(v));

/** One end of a shim channel: an `EventTarget` whose `postMessage` reaches the other end */
export type ShimPort = EventTarget & {
  postMessage(data: unknown): void;
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
  return (data: unknown) => {
    from.sent.push(data);
    const copy = clone(data);
    setTimeout(() => !from.terminated && !to.terminated && to.dispatchEvent(new MessageEvent("message", { data: copy })));
  };
}

/**
 * A `Worker` handle backed by a same-thread `DiffTreePublisher` served by a `HostPublisher`, for
 * use with `StoreAsync` in tests. Mirrors what a bundler-built worker entry file does, minus the
 * actual thread. `tree` is the worker's side, for tests of the worker's own commits.
 */
export function CreateShimWorker(keyFunc?: (val: any) => string, routes?: IRouteDefinitions) {
  const [main, worker] = CreateShimChannel();
  const tree = new DiffTreePublisher(keyFunc, routes);
  const host: IHost = HostPublisher(tree, worker);
  return { worker: main, scope: worker, tree, host };
}

/** `CreateShimWorker`'s main-thread side alone, typed as a `Worker` */
export function CreateShimDiffWorker(keyFunc?: (val: any) => string, routes?: IRouteDefinitions): ShimPort & Worker {
  return CreateShimWorker(keyFunc, routes).worker as ShimPort & Worker;
}

/** Waits for every shim message already scheduled, and the ones they schedule, to be delivered */
export async function Settle(rounds = 4) {
  for (let x = 0; x < rounds; x++)
    await new Promise((resolve) => setTimeout(resolve));
}
