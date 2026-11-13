import { IChannel, IConnectMessage, IHostRequest, ILocalLease, ISourcesMessage, IWorkerLease } from "./diffTree.types";
import { ObservableDiffTree } from "./observableDiffTree";
import { DiffTreeEndpoint } from "./diffTreeEndpoint";
import type { IDiffTreeEndpoint } from "./diffTreeEndpoint.types";

/** What a `DiffTreeHub` needs of a worker: a `Worker`, or anything shaped like one */
export interface IDiffTreeWorker {
  postMessage(message: any, transfer: Transferable[]): void;
  terminate(): void;
}

/**
 * Creates an endpoint's tree, on its first start and each restart: a worker hosting the tree
 * (`DiffTreeEndpoint.Host` in its entry), or the `ObservableDiffTree` itself, to run on this thread. What it
 * returns decides the key's kind, and a key's factory always returns the same kind.
 */
export type TreeFactory = () => IDiffTreeWorker | ObservableDiffTree;

/** Where a key's tree runs: in a worker (`"worker"`), or on this thread (`"local"`) */
export type TreeKind = "worker" | "local";

/** `DiffTreeHub.Register` options */
export interface IRegisterOptions {
  /**
   * Milliseconds to keep the tree after its last lease ends; a lease opened meanwhile keeps the
   * same tree. Omitted, the tree is released at once.
   */
  releaseDebounce?: number;
}

interface IEntry {
  endpoint: IDiffTreeEndpoint;
  factory: TreeFactory;
  options: IRegisterOptions;
  /** What the factory returns, known from the first start */
  kind?: TreeKind;
  /** While it runs: the worker, or for a tree on this thread the channel the hub hosts it on */
  worker?: IDiffTreeWorker;
  /** While a tree on this thread runs: the tree */
  tree?: ObservableDiffTree;
  /** Leases on this tree */
  leases: Set<PortLease | TreeLease>;
  /** The leases this tree holds on its sources while it runs */
  held: Map<string, PortLease>;
  timer?: ReturnType<typeof setTimeout>;
}

let nextServeId = 1;

abstract class Lease {
  released = false;

  constructor(readonly entry: IEntry, private release: (lease: PortLease | TreeLease) => void) { }

  get name() {
    return this.entry.endpoint.name;
  }

  get endpoint() {
    return this.entry.endpoint;
  }

  Release() {
    this.release(this as unknown as PortLease | TreeLease);
  }
}

/** A port to a tree, served by its `HostPublisher`: a store's lease on a worker, or a follower's on any tree */
class PortLease extends Lease implements IWorkerLease {
  port!: MessagePort;
  serveId = 0;
  callbacks: Array<(port: MessagePort) => void> = [];

  /** @param holder The tree following this one over the port, for a lease the hub holds */
  constructor(entry: IEntry, readonly holder: IEntry | undefined, release: (lease: PortLease | TreeLease) => void) {
    super(entry, release);
  }

  OnPort(callback: (port: MessagePort) => void) {
    return Add(this.callbacks, callback);
  }
}

/** The tree itself, for a store on its thread */
class TreeLease extends Lease implements ILocalLease {
  callbacks: Array<(tree: ObservableDiffTree) => void> = [];

  get tree() {
    return this.entry.tree!;
  }

  OnTree(callback: (tree: ObservableDiffTree) => void) {
    return Add(this.callbacks, callback);
  }
}

/**
 * Owns the app's trees by endpoint: one key is one tree in the app's dependency graph, running in a
 * worker or on this thread. The hub creates each one from its factory when it's first needed, hands
 * out leases on it, connects each tree to the ones it follows, re-creates one on request, and ends
 * each one when its last lease ends. It never carries data: posts go directly between each port's
 * two ends.
 *
 * - **`Register(endpoint, factory)`** records how to create a tree, and takes the trees it follows
 *   from the endpoint's definition (`DiffTreeEndpoint.Define`), each registered before it. It creates
 *   nothing.
 * - **The factory returns a worker or a tree.** A worker hosts its own tree (`DiffTreeEndpoint.Host` in its
 *   entry). A returned `ObservableDiffTree` runs on this thread: the hub hosts it with the same call,
 *   on a channel of its own. Either way, the hub manages it the same way. What the first start
 *   returns fixes the key's kind.
 * - **`Open`** leases a worker's tree, as a port, for a `StoreAsync`. **`OpenLocal`** leases a tree on
 *   this thread, as the tree, for a `StoreSync`. The leases are different types, so a store given the
 *   wrong one doesn't compile, and each throws for a key of the other kind: that's configuration to
 *   fix, not a state to recover from. The first lease starts the tree; a store owns its lease and
 *   releases it when it's destroyed. Any number of stores can be opened on one tree.
 * - **A tree is released when its last lease ends**, at once or after its `releaseDebounce`. A tree
 *   that must outlive every view is held by a store the app keeps.
 * - **A tree that follows others** holds a lease on each while it runs, and its `OnConnect` handlers
 *   (`DiffTreeEndpoint.Connect`) get a port to each source's tree, again whenever either restarts.
 * - **`Restart`** creates the tree again from its factory. The tree is the source of truth: every
 *   store on it starts over with the new tree, as when it first subscribed, and nothing a store
 *   wrote is written back. State that must outlive a restart belongs in a tree of its own that the
 *   restarted one follows.
 *
 * @example
 * const hub = new DiffTreeHub();
 * hub.Register(ledgerEndpoint, () => new Worker(new URL("./ledger-worker.ts", import.meta.url), { type: "module" }));
 * hub.Register(totalsEndpoint, () => new Worker(new URL("./totals-worker.ts", import.meta.url), { type: "module" }), { releaseDebounce: 5_000 });
 * hub.Register(budgetEndpoint, newBudgetTree);   // follows the ledger, on this thread
 *
 * const totals = new StoreAsync(hub.Open("totals"));       // starts totals, and the ledger for it
 * const budget = new StoreSync(hub.OpenLocal("budget"));
 * // teardown: each store releases its lease
 * totals.Destroy();
 * budget.Destroy();
 */
export class DiffTreeHub {
  private entries = new Map<string, IEntry>();

  /**
   * Records how to create an endpoint's tree. Creates nothing: the first lease does.
   * @param endpoint The endpoint's definition: its name, and the endpoints it follows (`sources`),
   *   each registered first.
   * @param factory Returns a worker hosting the tree, or the tree itself, to run on this thread; runs
   *   on every start.
   * @param options `releaseDebounce`: see `IRegisterOptions`.
   * @throws When the name is already registered, or a source isn't registered yet.
   */
  Register(endpoint: IDiffTreeEndpoint, factory: TreeFactory, options: IRegisterOptions = {}) {
    const name = endpoint.name;
    if (this.entries.has(name))
      throw new Error(`DiffTreeHub: ${name} is already registered.`);

    for (const source of endpoint.sources)
      if (!this.entries.has(source))
        throw new Error(`DiffTreeHub: ${name} follows ${source}, which isn't registered; register an endpoint's sources before it.`);

    this.entries.set(name, { endpoint, factory, options, leases: new Set(), held: new Map() });
  }

  /**
   * Opens a lease on a worker's tree, starting the worker when it isn't running. Give it to a
   * `StoreAsync`.
   * @throws When the name isn't registered, or its factory returns a tree to run on this thread.
   */
  Open(name: string): IWorkerLease {
    const entry = this.Entry(name);
    this.Run(entry, "worker");
    const lease = new PortLease(entry, undefined, lease => this.Release(lease));
    entry.leases.add(lease);
    this.Issue(lease);
    return lease;
  }

  /**
   * Opens a lease on a tree on this thread, creating the tree when it isn't running. Give it to a
   * `StoreSync`.
   * @throws When the name isn't registered, or its factory returns a worker.
   */
  OpenLocal(name: string): ILocalLease {
    const entry = this.Entry(name);
    this.Run(entry, "local");
    const lease = new TreeLease(entry, lease => this.Release(lease));
    entry.leases.add(lease);
    return lease;
  }

  /**
   * Ends a running tree and creates a new one from its factory, then re-issues every connection to
   * it: each worker lease gets a new port (`IWorkerLease.OnPort`), each tree lease the new tree
   * (`ILocalLease.OnTree`), each tree following it a new `jt-connect`, and the new tree new ports to
   * its own sources. The stores on it start over with the new tree. Does nothing when the tree isn't
   * running.
   * @throws When the name isn't registered, or the factory returns the other kind than it did before,
   *   or neither kind. Nothing is recovered: the tree stays ended.
   */
  Restart(name: string) {
    const entry = this.Entry(name);
    if (!entry.worker)
      return;

    entry.worker.terminate();
    entry.worker = undefined;
    entry.tree = undefined;
    this.Create(entry);

    // New leases on the sources first, so releasing the old ones doesn't release a source
    const old = Array.from(entry.held.values());
    entry.held = new Map();
    this.Hold(entry);
    old.forEach(lease => this.Release(lease));

    for (const lease of entry.leases)
      lease instanceof TreeLease ? lease.callbacks.slice().forEach(callback => callback(entry.tree!)) : this.Issue(lease);
  }

  /**
   * Ends the tree if it runs, ends every lease on it, releases its sources, and forgets it. `Open`
   * on the name throws after.
   * @throws When a registered endpoint follows it: unregister that one first.
   */
  Unregister(name: string) {
    const entry = this.entries.get(name);
    if (!entry)
      return;

    for (const other of this.entries.values())
      if (other.endpoint.sources.includes(name))
        throw new Error(`DiffTreeHub: ${other.endpoint.name} follows ${name}; unregister it first.`);

    this.entries.delete(name);
    for (const lease of Array.from(entry.leases))
      this.End(lease);

    this.Stop(entry);
  }

  /**
   * Unregisters every name, the last registered first, so each tree goes before its sources: every
   * tree is ended and every lease with it.
   */
  Destroy() {
    for (const name of Array.from(this.entries.keys()).reverse())
      this.Unregister(name);
  }

  /** Whether a registered tree is running */
  IsRunning(name: string) {
    return !!this.entries.get(name)?.worker;
  }

  /** Where a key's tree runs, known from its first start; `undefined` before it */
  KindOf(name: string): TreeKind | undefined {
    return this.entries.get(name)?.kind;
  }

  private Entry(name: string) {
    const entry = this.entries.get(name);
    if (!entry)
      throw new Error(`DiffTreeHub: ${name} isn't registered.`);

    return entry;
  }

  /**
   * Keeps a tree running for a new lease, starting it when it isn't. With a `kind`, a tree of the
   * other kind throws; one started for this check ends first.
   */
  private Run(entry: IEntry, kind?: TreeKind) {
    kind && this.Expect(entry, kind);
    clearTimeout(entry.timer);
    entry.timer = undefined;
    if (entry.worker)
      return;

    this.Start(entry);
    if (kind && entry.kind !== kind) {
      entry.leases.size === 0 && this.Stop(entry);
      this.Expect(entry, kind);
    }
  }

  /** Throws when the key is known to be of the other kind */
  private Expect(entry: IEntry, kind: TreeKind) {
    if (entry.kind && entry.kind !== kind)
      throw new Error(`DiffTreeHub: ${entry.endpoint.name} is ${Describe(entry.kind)}; open it with ${entry.kind === "local" ? "OpenLocal" : "Open"}.`);
  }

  private Start(entry: IEntry) {
    this.Create(entry);
    this.Hold(entry);
  }

  /** Opens the leases a tree holds on its sources, each one a port the hub gives it */
  private Hold(entry: IEntry) {
    for (const source of entry.endpoint.sources) {
      const sourceEntry = this.Entry(source);
      this.Run(sourceEntry);
      const lease = new PortLease(sourceEntry, entry, lease => this.Release(lease));
      sourceEntry.leases.add(lease);
      entry.held.set(source, lease);
      this.Issue(lease);
    }
  }

  /**
   * Runs the factory, checks what it returned, and wires it up to match: a worker as it is, a tree
   * hosted on a channel of its own on this thread. Then tells it its sources, before anything else
   * the hub sends.
   */
  private Create(entry: IEntry) {
    const name = entry.endpoint.name;
    const result = entry.factory();
    const kind: TreeKind | undefined = result instanceof ObservableDiffTree ? "local" : IsWorker(result) ? "worker" : undefined;
    if (!kind)
      throw new Error(`DiffTreeHub: ${name}'s factory returned neither a worker nor an ObservableDiffTree (an ObservableDiffTree from another copy of j-templates isn't one).`);

    if (entry.kind && entry.kind !== kind) {
      kind === "worker" && (result as IDiffTreeWorker).terminate();
      throw new Error(`DiffTreeHub: ${name}'s factory returned ${Describe(kind)} after ${Describe(entry.kind)}; a key's factory always returns one kind.`);
    }

    entry.kind = kind;
    if (kind === "worker")
      entry.worker = result as IDiffTreeWorker;
    else {
      entry.tree = result as ObservableDiffTree;
      entry.worker = HostLocal(entry.endpoint, entry.tree);
    }

    const sources: ISourcesMessage = { type: "jt-sources", sources: entry.endpoint.sources };
    entry.worker.postMessage(sources, []);
  }

  /** Serves a new channel for the lease on its tree, and gives the other end to its holder */
  private Issue(lease: PortLease) {
    const { port1, port2 } = new MessageChannel();
    lease.serveId = nextServeId++;
    const serve: IHostRequest = { type: "jt-serve", id: lease.serveId, port: port2 };
    lease.entry.worker!.postMessage(serve, [port2]);
    if (lease.holder) {
      const connect: IConnectMessage = { type: "jt-connect", source: lease.name, port: port1 };
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

  /** Ends a lease, and releases its tree when it was the last */
  private Release(lease: PortLease | TreeLease) {
    if (lease.released)
      return;

    this.End(lease);
    const entry = lease.entry;
    if (entry.leases.size > 0 || !entry.worker || !this.entries.has(entry.endpoint.name))
      return;

    const debounce = entry.options.releaseDebounce;
    if (debounce !== undefined && debounce > 0)
      entry.timer = setTimeout(() => this.Stop(entry), debounce);
    else
      this.Stop(entry);
  }

  /** Ends a lease without releasing its tree */
  private End(lease: PortLease | TreeLease) {
    if (lease.released)
      return;

    lease.released = true;
    lease.entry.leases.delete(lease);
    lease.callbacks = [];
    if (lease instanceof PortLease) {
      const unserve: IHostRequest = { type: "jt-unserve", id: lease.serveId };
      lease.entry.worker?.postMessage(unserve, []);
      lease.port?.close();
    }
  }

  /** Ends a tree and releases the leases it holds */
  private Stop(entry: IEntry) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.worker?.terminate();
    entry.worker = undefined;
    entry.tree = undefined;
    const held = Array.from(entry.held.values());
    entry.held.clear();
    held.forEach(lease => this.Release(lease));
  }
}

/**
 * Hosts a tree on this thread as a worker hosts its own: `DiffTreeEndpoint.Host` on one end of a
 * `MessageChannel`, with the other end as the hub's "worker". Terminating it stops the host and
 * closes both ends.
 */
function HostLocal(endpoint: IDiffTreeEndpoint, tree: ObservableDiffTree): IDiffTreeWorker {
  const { port1, port2 } = new MessageChannel();
  const stop = DiffTreeEndpoint.Host(endpoint, tree, port2 as unknown as IChannel);
  port2.start();
  return {
    postMessage: (message, transfer) => port1.postMessage(message, transfer),
    terminate: () => {
      stop();
      port1.close();
      port2.close();
    }
  };
}

function IsWorker(value: unknown): value is IDiffTreeWorker {
  return typeof (value as IDiffTreeWorker)?.postMessage === "function" && typeof (value as IDiffTreeWorker)?.terminate === "function";
}

function Describe(kind: TreeKind) {
  return kind === "local" ? "a tree on this thread" : "a worker";
}

function Add<T>(callbacks: T[], callback: T) {
  callbacks.push(callback);
  return () => {
    const index = callbacks.indexOf(callback);
    index >= 0 && callbacks.splice(index, 1);
  };
}
