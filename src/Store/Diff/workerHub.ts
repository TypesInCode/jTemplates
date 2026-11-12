import { IConnectMessage, IHostRequest, ISourcesMessage, IWorkerLease } from "./diffTree.types";

/** What a `WorkerHub` needs of a worker: a `Worker`, or anything shaped like one */
export interface IHubWorker {
  postMessage(message: any, transfer: Transferable[]): void;
  terminate(): void;
}

/** Creates a worker, and sends it its starting intent: runs on the first start and each restart */
export type WorkerFactory = () => IHubWorker;

/** `WorkerHub.Register` options */
export interface IWorkerOptions {
  /**
   * Registered workers this one reads from. While it runs, it holds a lease on each, and its
   * `OnConnect(source, …)` handler gets a port to the source's tree: one way, from the source to
   * this worker. Each must be registered first.
   */
  sources?: readonly string[];
  /**
   * Milliseconds to keep the worker after its last lease ends; a lease opened meanwhile keeps
   * the same worker. Omitted, the worker is released at once.
   */
  releaseDebounce?: number;
}

interface IEntry {
  name: string;
  factory: WorkerFactory;
  options: IWorkerOptions;
  worker?: IHubWorker;
  /** Leases on this worker */
  leases: Set<Lease>;
  /** The workers this one reads from */
  sources: readonly string[];
  /** The leases this worker holds on its sources while it runs */
  held: Map<string, Lease>;
  timer?: ReturnType<typeof setTimeout>;
}

let nextServeId = 1;

class Lease implements IWorkerLease {
  port!: MessagePort;
  released = false;
  serveId = 0;
  callbacks: Array<(port: MessagePort) => void> = [];

  constructor(readonly entry: IEntry, readonly holder: IEntry | undefined, private release: (lease: Lease) => void) { }

  get name() {
    return this.entry.name;
  }

  OnPort(callback: (port: MessagePort) => void) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      index >= 0 && this.callbacks.splice(index, 1);
    };
  }

  Release() {
    this.release(this);
  }
}

/**
 * Owns the app's workers on the main thread, by name. It creates each one from its factory when
 * it's first needed, hands out channels to it as leases, connects workers to each other, re-creates
 * one on request, and terminates each one when its last lease ends. It never carries data: posts
 * go directly between each port's two ends.
 *
 * - **`Register`** records how to create a worker, and the workers it reads from (`sources`, each
 *   registered before it); it creates nothing.
 * - **`Open`** returns a lease, a `MessagePort` the worker's `HostPublisher` serves. The first
 *   lease creates the worker. Give the lease to a `StoreAsync`, and release it in teardown.
 * - **A worker is released when its last lease ends**, at once or after its `releaseDebounce`.
 *   A worker that must outlive every view is held by a lease the app keeps.
 * - **A worker with `sources`** holds a lease on each while it runs, and its `OnConnect` handler
 *   gets a port to each source's tree.
 * - **`Restart`** re-creates a worker and re-issues every port to it.
 *
 * @example
 * const hub = new WorkerHub();
 * hub.Register("engine", () => new Worker(engineUrl, { type: "module" }));
 * hub.Register("trace", () => new Worker(traceUrl, { type: "module" }), { sources: ["engine"], releaseDebounce: 5_000 });
 * const lease = hub.Open("trace");          // starts trace, and engine for it
 * const store = new StoreAsync(lease, keyFunc);
 * // teardown
 * store.Destroy();
 * lease.Release();
 */
export class WorkerHub {
  private entries = new Map<string, IEntry>();

  /**
   * Records how to create a worker, and the workers it reads from. Creates nothing: the first
   * lease does.
   * @param factory Creates the worker and sends it its starting intent; runs on every start.
   * @param options `sources`: registered workers it reads from; `releaseDebounce`: see `IWorkerOptions`.
   * @throws When the name is already registered, or a source isn't registered yet.
   */
  Register(name: string, factory: WorkerFactory, options: IWorkerOptions = {}) {
    if (this.entries.has(name))
      throw new Error(`WorkerHub: ${name} is already registered.`);

    const sources = Array.from(new Set(options.sources ?? []));
    for (const source of sources)
      if (!this.entries.has(source))
        throw new Error(`WorkerHub: ${name} reads from ${source}, which isn't registered; register a worker's sources before it.`);

    this.entries.set(name, { name, factory, options, leases: new Set(), sources, held: new Map() });
  }

  /**
   * Opens a lease on a worker, creating the worker when it isn't running.
   * @throws When the name isn't registered.
   */
  Open(name: string): IWorkerLease {
    return this.Lease(this.Entry(name), undefined);
  }

  /**
   * Terminates a running worker, creates a new one from its factory, and re-issues every port to
   * it: each lease gets a new port (`IWorkerLease.OnPort`), each worker reading from it a new
   * `jt-connect`, and the worker new ports to its own sources. Does nothing when the worker isn't running.
   * @throws When the name isn't registered.
   */
  Restart(name: string) {
    const entry = this.Entry(name);
    if (!entry.worker)
      return;

    entry.worker.terminate();
    this.Create(entry);

    // New leases on the sources first, so releasing the old ones doesn't release a source
    const old = Array.from(entry.held.values());
    entry.held = new Map();
    for (const source of entry.sources)
      entry.held.set(source, this.Lease(this.Entry(source), entry));
    old.forEach(lease => this.Release(lease));

    for (const lease of entry.leases)
      this.Issue(lease);
  }

  /**
   * Terminates the worker if it runs, ends every lease on it, releases its sources, and forgets
   * it. `Open` on the name throws after.
   * @throws When a registered worker reads from it: unregister that one first.
   */
  Unregister(name: string) {
    const entry = this.entries.get(name);
    if (!entry)
      return;

    for (const other of this.entries.values())
      if (other.sources.includes(name))
        throw new Error(`WorkerHub: ${other.name} reads from ${name}; unregister it first.`);

    this.entries.delete(name);
    for (const lease of Array.from(entry.leases))
      this.End(lease);

    this.Stop(entry);
  }

  /**
   * Unregisters every name, the last registered first, so each worker goes before its sources:
   * every worker is terminated and every lease ended.
   */
  Destroy() {
    for (const name of Array.from(this.entries.keys()).reverse())
      this.Unregister(name);
  }

  /** Whether a registered worker is running */
  IsRunning(name: string) {
    return !!this.entries.get(name)?.worker;
  }

  private Entry(name: string) {
    const entry = this.entries.get(name);
    if (!entry)
      throw new Error(`WorkerHub: ${name} isn't registered.`);

    return entry;
  }

  private Lease(entry: IEntry, holder: IEntry | undefined) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.worker || this.Start(entry);
    const lease = new Lease(entry, holder, lease => this.Release(lease));
    entry.leases.add(lease);
    this.Issue(lease);
    return lease;
  }

  private Start(entry: IEntry) {
    this.Create(entry);
    for (const source of entry.sources)
      entry.held.set(source, this.Lease(this.Entry(source), entry));
  }

  /** Creates the worker, and tells it its sources before anything else the hub sends */
  private Create(entry: IEntry) {
    const worker = entry.worker = entry.factory();
    const sources: ISourcesMessage = { type: "jt-sources", sources: entry.sources };
    worker.postMessage(sources, []);
  }

  /** Serves a new channel for the lease on its worker, and gives the other end to its holder */
  private Issue(lease: Lease) {
    const { port1, port2 } = new MessageChannel();
    lease.serveId = nextServeId++;
    const serve: IHostRequest = { type: "jt-serve", id: lease.serveId, port: port2 };
    lease.entry.worker!.postMessage(serve, [port2]);
    if (lease.holder) {
      const connect: IConnectMessage = { type: "jt-connect", source: lease.entry.name, port: port1 };
      lease.holder.worker!.postMessage(connect, [port1]);
      return;
    }

    const old = lease.port;
    lease.port = port1;
    if (old) {
      old.close();
      for (const callback of lease.callbacks.slice())
        callback(port1);
    }
  }

  /** Ends a lease, and releases its worker when it was the last */
  private Release(lease: Lease) {
    if (lease.released)
      return;

    this.End(lease);
    const entry = lease.entry;
    if (entry.leases.size > 0 || !entry.worker || !this.entries.has(entry.name))
      return;

    const debounce = entry.options.releaseDebounce;
    if (debounce !== undefined && debounce > 0)
      entry.timer = setTimeout(() => this.Stop(entry), debounce);
    else
      this.Stop(entry);
  }

  /** Ends a lease without releasing its worker */
  private End(lease: Lease) {
    if (lease.released)
      return;

    lease.released = true;
    lease.entry.leases.delete(lease);
    const unserve: IHostRequest = { type: "jt-unserve", id: lease.serveId };
    lease.entry.worker?.postMessage(unserve, []);
    lease.port?.close();
    lease.callbacks = [];
  }

  /** Terminates a worker and releases the leases it holds */
  private Stop(entry: IEntry) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
    if (!entry.worker)
      return;

    entry.worker.terminate();
    entry.worker = undefined;
    const held = Array.from(entry.held.values());
    entry.held.clear();
    held.forEach(lease => this.Release(lease));
  }
}
