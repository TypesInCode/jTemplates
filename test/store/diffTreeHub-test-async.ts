import { describe, it, expect, afterEach } from "vitest";
import type { IRouteDefinitions } from "../../src/Store/Diff";
import { DiffTreeHub } from "../../src/Store/Diff/diffTreeHub";
import { HubEndpoint } from "../../src/Store/Diff/hubEndpoint";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { HostPublisher } from "../../src/Store/Diff/hostPublisher";
import { OnConnect } from "../../src/Store/Diff/onConnect";
import { Subscribe } from "../../src/Store/Diff/channelClient";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { CreateShimChannel, CreateShimWorker, Settle, WaitFor } from "./worker-shim";

// DiffTreeHub over shim workers: leases, release, connections, restarts, and stores that follow a
// lease across a restart. The trace worker wires its connection by hand (OnConnect), to test what
// HubEndpoint.Connect is built on; hubEndpoint-test-async.ts tests the endpoint's own wiring.

type Shim = ReturnType<typeof CreateShimWorker>;

const engineEndpoint = HubEndpoint.Define("engine");
const traceEndpoint = HubEndpoint.Define("trace", (remote) => ({ engine: remote(engineEndpoint, ["list"]) }));

const deriveRoutes: IRouteDefinitions = {
  "/": { projections: { count: { reads: ["/engine/list"], projection: (list: any) => list?.length ?? 0 } } },
};

describe("DiffTreeHub", () => {
  let hub: DiffTreeHub;
  const stores: StoreAsync[] = [];
  afterEach(() => {
    stores.splice(0).forEach((store) => store.Destroy());
    hub?.Destroy();
  });

  /** Registers shim workers, recording each one a factory creates */
  function Setup() {
    hub = new DiffTreeHub();
    const created: Record<string, Shim[]> = {};
    const latest = (name: string) => created[name][created[name].length - 1];

    /** The engine: a source whose starting intent writes `list` */
    const engine = (list: unknown[] = [1, 2], options = {}) =>
      hub.Register(engineEndpoint, () => {
        const shim = CreateShimWorker();
        (created.engine ??= []).push(shim);
        shim.tree.WritePath("list", list);
        shim.tree.Commit();
        return shim.worker as any;
      }, options);

    /** The trace: reads from the engine, and derives `$projection_count` from its list in a route */
    const trace = (options = {}) =>
      hub.Register(traceEndpoint, () => {
        const shim = CreateShimWorker(undefined, deriveRoutes);
        (created.trace ??= []).push(shim);
        OnConnect("engine", (port) => {
          shim.tree.DeleteRoute("/engine/");
          return Subscribe(port, { roots: ["list"], form: "snapshot" }, (update) => {
            for (const key in update.roots) shim.tree.WritePath(`/engine/${key}`, update.roots[key]);
            for (const key of update.deleted) shim.tree.WritePath(`/engine/${key}`, undefined);
            shim.tree.RunProjections();
            shim.tree.Commit();
          });
        }, shim.scope);
        return shim.worker as any;
      }, options);

    const Store = (lease: any) => {
      const store = new StoreAsync(lease);
      stores.push(store);
      return store;
    };

    return { created, latest, engine, trace, Store };
  }

  describe("leases", () => {
    it("Register creates nothing; the first Open creates the worker", () => {
      const { created, engine } = Setup();
      engine();
      expect(created.engine).toBeUndefined();
      expect(hub.IsRunning("engine")).toBe(false);
      hub.Open("engine");
      expect(created.engine.length).toBe(1);
      hub.Open("engine");
      expect(created.engine.length).toBe(1);
    });

    it("a store over a lease reads the worker's tree, and releasing the lease ends its subscriptions", async () => {
      const { latest, engine, Store } = Setup();
      engine();
      const keep = hub.Open("engine");
      const lease = hub.Open("engine");
      const store = Store(lease);
      await WaitFor(() => expect(store.Get<any>("list").toJSON()).toEqual([1, 2]));
      expect(latest("engine").tree.SubscriberCount("list")).toBe(0);

      // The store owns its lease
      store.Destroy();
      expect(lease.released).toBe(true);
      expect(hub.IsRunning("engine")).toBe(true);
      keep.Release();
    });

    it("the last Release terminates the worker at once without a debounce", () => {
      const { latest, engine } = Setup();
      engine();
      const a = hub.Open("engine");
      const b = hub.Open("engine");
      a.Release();
      a.Release();
      expect(hub.IsRunning("engine")).toBe(true);
      b.Release();
      expect(hub.IsRunning("engine")).toBe(false);
      expect(latest("engine").worker.terminated).toBe(true);
    });

    it("with releaseDebounce, terminates after it; an Open meanwhile keeps the same worker", async () => {
      const { created, engine } = Setup();
      engine([1], { releaseDebounce: 30 });
      hub.Open("engine").Release();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(hub.IsRunning("engine")).toBe(true);
      const lease = hub.Open("engine");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(hub.IsRunning("engine")).toBe(true);
      expect(created.engine.length).toBe(1);

      lease.Release();
      await WaitFor(() => expect(hub.IsRunning("engine")).toBe(false));
    });

    it("the factory runs again for an Open after the worker was released", () => {
      const { created, engine } = Setup();
      engine();
      hub.Open("engine").Release();
      hub.Open("engine");
      expect(created.engine.length).toBe(2);
    });
  });

  describe("sources", () => {
    it("a consumer gets its port when it starts, and derives from the source", async () => {
      const { latest, engine, trace, Store } = Setup();
      engine([1, 2, 3]);
      trace();
      const store = Store(hub.Open("trace"));
      expect(hub.IsRunning("engine")).toBe(true);
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(3));
      expect(store.Has("list")).toBe(false);

      latest("engine").tree.PushPath("list", [4]);
      latest("engine").tree.Commit();
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(4));
    });

    it("releasing a consumer releases its source, unless another lease holds it", () => {
      const { engine, trace } = Setup();
      engine();
      trace();
      const app = hub.Open("engine");
      const lease = hub.Open("trace");
      lease.Release();
      expect(hub.IsRunning("trace")).toBe(false);
      expect(hub.IsRunning("engine")).toBe(true);

      hub.Open("trace").Release();
      app.Release();
      expect(hub.IsRunning("engine")).toBe(false);
    });

    it("an endpoint's sources, from its definition, are registered before it; a name isn't registered twice", () => {
      const { engine, trace } = Setup();
      expect(() => trace()).toThrow(/trace follows engine, which isn't registered; register an endpoint's sources before it/);
      engine();
      trace();
      expect(() => engine()).toThrow(/already registered/);
      expect(() => hub.Open("missing")).toThrow(/isn't registered/);
    });
  });

  describe("restarts", () => {
    it("restarting a source gives its consumers a new port, and they derive from the new source", async () => {
      const { created, engine, trace, Store } = Setup();
      let list = [1, 2];
      hub.Register(engineEndpoint, () => {
        const shim = CreateShimWorker();
        (created.engine ??= []).push(shim);
        shim.tree.WritePath("list", list);
        shim.tree.Commit();
        return shim.worker as any;
      });
      trace();
      const store = Store(hub.Open("trace"));
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(2));

      list = [1, 2, 3, 4, 5];
      hub.Restart("engine");
      expect(created.engine.length).toBe(2);
      expect(created.engine[0].worker.terminated).toBe(true);
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(5));
      expect(created.trace.length).toBe(1);
      void engine;
    });

    it("restarting a consumer gives it its connections again", async () => {
      const { created, engine, trace, Store } = Setup();
      engine([1, 2, 3]);
      trace();
      const store = Store(hub.Open("trace"));
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(3));

      hub.Restart("trace");
      expect(created.trace.length).toBe(2);
      expect(created.engine.length).toBe(1);
      await WaitFor(() => expect(created.trace[1].tree.Committed("$projection_count")).toBe(3));
      await WaitFor(() => expect(created.engine[0].tree.SubscriberCount("list")).toBe(1));
    });

    it("a store over a lease starts over with a restarted tree: readers kept, nothing written back, missing roots deleted", async () => {
      const { latest, engine, Store } = Setup();
      engine([1, 2]);
      const store = Store(hub.Open("engine"));
      await WaitFor(() => expect(store.Get<any>("list").toJSON()).toEqual([1, 2]));
      await store.Write([3], "list");
      await store.Write({ text: "draft" }, "query");
      const list = store.Get<any>("list");

      hub.Restart("engine");
      // The new tree's state, as when the store first subscribed: its seed, and nothing the store wrote
      await WaitFor(() => expect(store.Has("query") && store.Get("query") === undefined).toBe(true));
      expect(latest("engine").tree.Committed("query")).toBeUndefined();
      expect(store.Get<any>("list")).toBe(list);
      expect(store.Get<any>("list").toJSON()).toEqual([1, 2]);

      await store.Write({ text: "next" }, "query");
      expect(latest("engine").tree.Committed("query")).toEqual({ text: "next" });
    });

    it("a store over a lease rejects the changes the old tree hadn't acknowledged, and sends them nowhere", async () => {
      const { latest, engine, Store } = Setup();
      engine([1, 2]);
      const store = Store(hub.Open("engine"));
      await WaitFor(() => expect(store.Get<any>("list").toJSON()).toEqual([1, 2]));

      const write = store.Write(7, "count");
      // The batch goes out a microtask after the change; its ack is a round trip later
      for (let x = 0; x < 5; x++) await Promise.resolve();
      hub.Restart("engine");
      await expect(write).rejects.toThrow("engine restarted before this change was acknowledged");
      await Settle();
      expect(latest("engine").tree.Committed("count")).toBeUndefined();

      await store.Write(3, "count");
      expect(store.Get("count")).toBe(3);
    });

    it("Restart does nothing for a worker that isn't running", () => {
      const { created, engine } = Setup();
      engine();
      hub.Restart("engine");
      expect(created.engine).toBeUndefined();
    });
  });

  describe("Unregister and Destroy", () => {
    it("Unregister terminates the worker, ends its leases, and makes Open throw", () => {
      const { latest, engine } = Setup();
      engine();
      const lease = hub.Open("engine");
      hub.Unregister("engine");
      expect(lease.released).toBe(true);
      expect(latest("engine").worker.terminated).toBe(true);
      expect(() => hub.Open("engine")).toThrow(/isn't registered/);
    });

    it("Unregister of a tree another follows throws; unregistering the follower first releases it", () => {
      const { engine, trace } = Setup();
      engine();
      trace();
      hub.Open("trace");
      expect(() => hub.Unregister("engine")).toThrow(/trace follows engine; unregister it first/);
      expect(hub.IsRunning("engine")).toBe(true);
      hub.Unregister("trace");
      expect(hub.IsRunning("engine")).toBe(false);
      hub.Unregister("engine");
    });

    it("Destroy unregisters every name", () => {
      const { latest, engine, trace } = Setup();
      engine();
      trace();
      hub.Open("trace");
      hub.Destroy();
      expect(latest("engine").worker.terminated).toBe(true);
      expect(latest("trace").worker.terminated).toBe(true);
      expect(() => hub.Open("trace")).toThrow(/isn't registered/);
    });
  });
});

describe("StoreAsync.Reconnect", () => {
  it("sends unacknowledged batches again, and they settle on the new channel", async () => {
    const first = CreateShimWorker();
    const second = CreateShimWorker();
    const store = new StoreAsync(first.worker);
    await store.Write(1, "a");
    first.worker.terminate();

    const write = store.Write(2, "b");
    await Settle();
    store.Reconnect(second.worker);
    await write;
    expect(second.tree.Committed("b")).toBe(2);
    expect(store.Get("b")).toBe(2);
    store.Destroy();
  });

  it("writes nothing else back: the new tree's state is the store's", async () => {
    const keyFunc = (value: any) => value?._id;
    const first = CreateShimWorker(keyFunc);
    const store = new StoreAsync(first.worker, keyFunc);
    await store.Write([{ _id: "t1", v: 1 }], "list");
    const second = CreateShimWorker(keyFunc);
    second.tree.WritePath("other", true);
    second.tree.Commit();

    store.Reconnect(second.worker);
    await WaitFor(() => expect(store.Get("other")).toBe(true));
    expect(second.tree.Committed("list")).toBeUndefined();
    expect(store.Has("list") && store.Get("list") === undefined).toBe(true);
    store.Destroy();
  });
});

describe("OnConnect", () => {
  it("throws for a source the hub didn't list, once the list has arrived", async () => {
    const [hubSide, scope] = CreateShimChannel();
    HostPublisher(new ObservableDiffTree(), scope);
    hubSide.postMessage({ type: "jt-sources", sources: ["engine"] });
    await Settle();
    expect(() => OnConnect("results", () => {}, scope)).toThrow(/results isn't a source this worker was registered with \(sources: engine\)/);
    expect(() => OnConnect("engine", () => {}, scope)).not.toThrow();
  });

  it("checks a handler registered before the list when it arrives, as an uncaught error", async () => {
    const [hubSide, scope] = CreateShimChannel();
    // jsdom swallows a listener's exception; in a worker it's the worker's uncaught error
    const errors: unknown[] = [];
    const addEventListener = scope.addEventListener.bind(scope);
    scope.addEventListener = ((type: string, listener: any) =>
      addEventListener(type, (event: Event) => {
        try {
          listener(event);
        } catch (err) {
          errors.push(err);
        }
      })) as any;
    HostPublisher(new ObservableDiffTree(), scope);
    OnConnect("results", () => {}, scope);
    hubSide.postMessage({ type: "jt-sources", sources: [] });
    await Settle();
    expect(String(errors[0])).toMatch(/results isn't a source this worker was registered with \(sources: none\)/);
  });

  it("the hub tells each worker its sources first, on every start", async () => {
    const hub = new DiffTreeHub();
    const workers: ReturnType<typeof CreateShimWorker>[] = [];
    hub.Register(engineEndpoint, () => CreateShimWorker().worker as any);
    hub.Register(traceEndpoint, () => {
      const shim = CreateShimWorker();
      workers.push(shim);
      return shim.worker as any;
    });
    hub.Open("trace");
    hub.Restart("trace");
    for (const shim of workers) {
      expect(shim.worker.sent[0]).toEqual({ type: "jt-sources", sources: ["engine"] });
      expect(shim.worker.sent[1].type).toBe("jt-connect");
    }
    hub.Destroy();
  });

  it("keeps a port that arrives before the handler, and cleans up when a new one arrives", async () => {
    const [hubSide, scope] = CreateShimChannel();
    HostPublisher(new ObservableDiffTree(), scope);
    const first = new MessageChannel();
    hubSide.postMessage({ type: "jt-connect", source: "engine", port: first.port2 }, [first.port2]);
    await Settle();

    const events: string[] = [];
    let count = 0;
    const stop = OnConnect("engine", () => {
      const n = ++count;
      events.push(`port ${n}`);
      return () => events.push(`cleanup ${n}`);
    }, scope);
    expect(events).toEqual(["port 1"]);

    const second = new MessageChannel();
    hubSide.postMessage({ type: "jt-connect", source: "engine", port: second.port2 }, [second.port2]);
    await Settle();
    expect(events).toEqual(["port 1", "cleanup 1", "port 2"]);

    stop();
    expect(events).toEqual(["port 1", "cleanup 1", "port 2", "cleanup 2"]);
    first.port1.close();
    second.port1.close();
  });
});
