import { IConnectMessage, IHostRequest, IWorkerLease } from "./diffTree.types";

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
  /** The sources this worker is connected to */
  sources: string[];
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
 * - **`Register`** records how to create a worker; it creates nothing.
 * - **`Open`** returns a lease, a `MessagePort` the worker's `HostPublisher` serves. The first
 *   lease creates the worker. Give the lease to a `StoreAsync`, and release it in teardown.
 * - **A worker is released when its last lease ends**, at once or after its `releaseDebounce`.
 *   A worker that must outlive every view is held by a lease the app keeps.
 * - **`Connect(consumer, source)`**: while the consumer runs, it holds a lease on the source, and
 *   its `OnConnect` handler gets the port.
 * - **`Restart`** re-creates a worker and re-issues every port to it.
 *
 * @example
 * const hub = new WorkerHub();
 * hub.Register("engine", () => new Worker(engineUrl, { type: "module" }));
 * hub.Register("trace", () => new Worker(traceUrl, { type: "module" }), { releaseDebounce: 5_000 });
 * hub.Connect("trace", "engine");
 * const lease = hub.Open("trace");          // starts trace, and engine for it
 * const store = new StoreAsync(lease, keyFunc);
 * // teardown
 * store.Destroy();
 * lease.Release();
 */
export class WorkerHub {
  private entries = new Map<string, IEntry>();

  /**
   * Records how to create a worker. Creates nothing: the first lease does.
   * @param factory Creates the worker and sends it its starting intent; runs on every start.
   * @throws When the name is already registered.
   */
  Register(name: string, factory: WorkerFactory, options: IWorkerOptions = {}) {
    if (this.entries.has(name))
      throw new Error(`WorkerHub: ${name} is already registered.`);

    this.entries.set(name, { name, factory, options, leases: new Set(), sources: [], held: new Map() });
  }

  /**
   * Opens a lease on a worker, creating the worker when it isn't running.
   * @throws When the name isn't registered.
   */
  Open(name: string): IWorkerLease {
    return this.Lease(this.Entry(name), undefined);
  }

  /**
   * While `consumer` runs, it holds a lease on `source`, and its `OnConnect(source, …)` handler
   * gets the lease's port: when it starts, and again whenever either worker restarts.
   * @throws When either isn't registered, or the connection would make a cycle.
   */
  Connect(consumer: string, source: string) {
    const from = this.Entry(consumer);
    const to = this.Entry(source);
    if (from.sources.includes(source))
      return;

    if (consumer === source || this.Reaches(to, consumer))
      throw new Error(`WorkerHub: connecting ${consumer} to ${source} makes a cycle; workers holding leases on each other are never released.`);

    from.sources.push(source);
    from.worker && from.held.set(source, this.Lease(to, from));
  }

  /**
   * Terminates a running worker, creates a new one from its factory, and re-issues every port to
   * it: each lease gets a new port (`IWorkerLease.OnPort`), each connected consumer a new
   * `jt-connect`, and the worker its own connections. Does nothing when the worker isn't running.
   * @throws When the name isn't registered.
   */
  Restart(name: string) {
    const entry = this.Entry(name);
    if (!entry.worker)
      return;

    entry.worker.terminate();
    entry.worker = entry.factory();

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
   * Terminates the worker if it runs, ends every lease on it and every connection to or from it,
   * and forgets it. `Open` on the name throws after.
   */
  Unregister(name: string) {
    const entry = this.entries.get(name);
    if (!entry)
      return;

    this.entries.delete(name);
    for (const other of this.entries.values()) {
      const index = other.sources.indexOf(name);
      if (index >= 0) {
        other.sources.splice(index, 1);
        const held = other.held.get(name);
        other.held.delete(name);
        held && this.End(held);
      }
    }

    for (const lease of Array.from(entry.leases))
      this.End(lease);

    this.Stop(entry);
  }

  /** Unregisters every name: every worker is terminated and every lease ended */
  Destroy() {
    for (const name of Array.from(this.entries.keys()))
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

  /** Whether `entry`'s connections lead to `name` */
  private Reaches(entry: IEntry, name: string): boolean {
    return entry.sources.some(source => source === name || this.Reaches(this.Entry(source), name));
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
    entry.worker = entry.factory();
    for (const source of entry.sources)
      entry.held.set(source, this.Lease(this.Entry(source), entry));
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
