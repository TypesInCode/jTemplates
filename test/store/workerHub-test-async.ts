import { describe, it, expect, afterEach } from "vitest";
import type { IRouteDefinitions } from "../../src/Store/Diff";
import { WorkerHub } from "../../src/Store/Diff/workerHub";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import { HostPublisher } from "../../src/Store/Diff/hostPublisher";
import { OnConnect } from "../../src/Store/Diff/onConnect";
import { Subscribe } from "../../src/Store/Diff/channelClient";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { CreateShimChannel, CreateShimWorker, Settle } from "./worker-shim";

// WorkerHub over shim workers: leases, release, connections, restarts, and stores that follow a
// lease across a restart.

type Shim = ReturnType<typeof CreateShimWorker>;

/** Waits until `check` passes, or fails after `ms` */
async function WaitFor(check: () => void, ms = 1000) {
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

const deriveRoutes: IRouteDefinitions = {
  "/": { projections: { count: { reads: ["/engine/list"], projection: (list: any) => list?.length ?? 0 } } },
};

describe("WorkerHub", () => {
  let hub: WorkerHub;
  const stores: StoreAsync[] = [];
  afterEach(() => {
    stores.splice(0).forEach((store) => store.Destroy());
    hub?.Destroy();
  });

  /** Registers shim workers, recording each one a factory creates */
  function Setup() {
    hub = new WorkerHub();
    const created: Record<string, Shim[]> = {};
    const latest = (name: string) => created[name][created[name].length - 1];

    /** The engine: a source whose starting intent writes `list` */
    const engine = (list: unknown[] = [1, 2], options = {}) =>
      hub.Register("engine", () => {
        const shim = CreateShimWorker();
        (created.engine ??= []).push(shim);
        shim.tree.WritePath("list", list);
        shim.tree.Commit();
        return shim.worker as any;
      }, options);

    /** The trace: a consumer that derives `$projection_count` from the engine's list, in a route */
    const trace = (options = {}) =>
      hub.Register("trace", () => {
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

      store.Destroy();
      lease.Release();
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

  describe("connections", () => {
    it("a consumer gets its port when it starts, and derives from the source", async () => {
      const { latest, engine, trace, Store } = Setup();
      engine([1, 2, 3]);
      trace();
      hub.Connect("trace", "engine");
      const store = Store(hub.Open("trace"));
      expect(hub.IsRunning("engine")).toBe(true);
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(3));
      expect(store.Has("list")).toBe(false);

      latest("engine").tree.PushPath("list", [4]);
      latest("engine").tree.Commit();
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(4));
    });

    it("Connect on a running consumer sends its port at once", async () => {
      const { engine, trace, Store } = Setup();
      engine();
      trace();
      const store = Store(hub.Open("trace"));
      expect(hub.IsRunning("engine")).toBe(false);
      hub.Connect("trace", "engine");
      expect(hub.IsRunning("engine")).toBe(true);
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(2));
    });

    it("releasing a consumer releases its source, unless another lease holds it", () => {
      const { engine, trace } = Setup();
      engine();
      trace();
      hub.Connect("trace", "engine");
      const app = hub.Open("engine");
      const lease = hub.Open("trace");
      lease.Release();
      expect(hub.IsRunning("trace")).toBe(false);
      expect(hub.IsRunning("engine")).toBe(true);

      hub.Open("trace").Release();
      app.Release();
      expect(hub.IsRunning("engine")).toBe(false);
    });

    it("a Connect that makes a cycle throws, and so does a name that isn't registered", () => {
      const { engine, trace } = Setup();
      engine();
      trace();
      hub.Connect("trace", "engine");
      expect(() => hub.Connect("engine", "trace")).toThrow(/cycle/);
      expect(() => hub.Connect("engine", "engine")).toThrow(/cycle/);
      expect(() => hub.Connect("trace", "missing")).toThrow(/isn't registered/);
      expect(() => hub.Open("missing")).toThrow(/isn't registered/);
      expect(() => engine()).toThrow(/already registered/);
    });
  });

  describe("restarts", () => {
    it("restarting a source gives its consumers a new port, and they derive from the new source", async () => {
      const { created, engine, trace, Store } = Setup();
      let list = [1, 2];
      hub.Register("engine", () => {
        const shim = CreateShimWorker();
        (created.engine ??= []).push(shim);
        shim.tree.WritePath("list", list);
        shim.tree.Commit();
        return shim.worker as any;
      });
      trace();
      hub.Connect("trace", "engine");
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
      hub.Connect("trace", "engine");
      const store = Store(hub.Open("trace"));
      await WaitFor(() => expect(store.Get("$projection_count")).toBe(3));

      hub.Restart("trace");
      expect(created.trace.length).toBe(2);
      expect(created.engine.length).toBe(1);
      await WaitFor(() => expect(created.trace[1].tree.Committed("$projection_count")).toBe(3));
      await WaitFor(() => expect(created.engine[0].tree.SubscriberCount("list")).toBe(1));
    });

    it("a store over a lease follows a restart: readers kept, written roots reseeded, missing roots deleted", async () => {
      const { latest, engine, Store } = Setup();
      engine([1, 2]);
      const store = Store(hub.Open("engine"));
      await store.Write({ text: "draft" }, "query");
      await WaitFor(() => expect(store.Get<any>("list").toJSON()).toEqual([1, 2]));
      latest("engine").tree.WritePath("old", 1);
      latest("engine").tree.Commit();
      await WaitFor(() => expect(store.Get("old")).toBe(1));
      const query = store.Get<any>("query");

      hub.Restart("engine");
      await WaitFor(() => expect(latest("engine").tree.Committed("query")).toEqual({ text: "draft" }));
      await WaitFor(() => expect(store.Has("old") && store.Get("old") === undefined).toBe(true));
      expect(store.Get<any>("query")).toBe(query);
      expect(store.Get<any>("list").toJSON()).toEqual([1, 2]);

      await store.Write({ text: "next" }, "query");
      expect(latest("engine").tree.Committed("query")).toEqual({ text: "next" });
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

    it("Unregister of a source ends a consumer's connection to it", () => {
      const { engine, trace } = Setup();
      engine();
      trace();
      hub.Connect("trace", "engine");
      hub.Open("trace");
      hub.Unregister("engine");
      expect(hub.IsRunning("trace")).toBe(true);
      hub.Restart("trace");
      expect(hub.IsRunning("trace")).toBe(true);
    });

    it("Destroy unregisters every name", () => {
      const { latest, engine, trace } = Setup();
      engine();
      trace();
      hub.Connect("trace", "engine");
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
    store.Reconnect(second.worker, { reseed: true });
    await write;
    expect(second.tree.Committed("a")).toBe(1);
    expect(second.tree.Committed("b")).toBe(2);
    expect(store.Get("b")).toBe(2);
    store.Destroy();
  });

  it("reseeds keyed entities as the store reads them", async () => {
    const keyFunc = (value: any) => value?._id;
    const first = CreateShimWorker(keyFunc);
    const store = new StoreAsync(first.worker, keyFunc);
    await store.Write([{ _id: "t1", v: 1 }], "list");
    await store.Patch("t1", { v: 2 });

    const second = CreateShimWorker(keyFunc);
    store.Reconnect(second.worker, { reseed: true });
    await store.Flush();
    await Settle();
    expect(second.tree.Committed("t1")).toEqual({ _id: "t1", v: 2 });
    expect(store.Get<any>("list").toJSON()).toEqual([{ _id: "t1", v: 2 }]);
    store.Destroy();
  });
});

describe("OnConnect", () => {
  it("keeps a port that arrives before the handler, and cleans up when a new one arrives", async () => {
    const [hubSide, scope] = CreateShimChannel();
    HostPublisher(new DiffTreePublisher(), scope);
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
