import { describe, it, expect, afterEach } from "vitest";
import { DiffTreeHub } from "../../src/Store/Diff/diffTreeHub";
import { DiffTreeEndpoint } from "../../src/Store/Diff/diffTreeEndpoint";
import { StoreAsync, IStoreAsyncOptions } from "../../src/Store/Store/storeAsync";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { CreateShimWorker, Settle, WaitFor } from "./worker-shim";

// StoreAsync's demand roots (store-demand-roots.md): a root matching `demand` is subscribed on its
// own while a reactive scope reads it or a Hold holds it, and released a grace period after.

const GRACE = 20;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A reactive reader of `fn`, read once */
function reader<T>(fn: () => T) {
  const scope = ObservableScope.Create(fn);
  ObservableScope.Value(scope);
  return {
    value: () => ObservableScope.Value(scope),
    destroy: () => ObservableScope.Destroy(scope),
  };
}

describe("StoreAsync demand roots", () => {
  const stores: StoreAsync[] = [];
  let hub: DiffTreeHub | undefined;
  afterEach(() => {
    stores.splice(0).forEach((store) => store.Destroy());
    hub?.Destroy();
    hub = undefined;
  });

  /** A tree holding `counts`, `type:a` and `type:b`, and a store receiving `counts` and demanding `type:*` */
  function Setup(options: IStoreAsyncOptions = {}) {
    const shim = CreateShimWorker();
    shim.tree.WritePath("counts", 2);
    shim.tree.WritePath("type:a", { n: 1 });
    shim.tree.WritePath("type:b", { n: 2 });
    shim.tree.Commit();
    const store = new StoreAsync(shim.worker as any, { roots: ["counts"], demand: ["type:*"], demandDebounce: GRACE, ...options });
    stores.push(store);
    /** The subscribe messages the store sent for `key` */
    const subscribes = (key: string) =>
      shim.worker.sent.filter((m: any) => m?.type === "jt-subscribe" && m.roots?.includes(key)).length;
    /** Whether the worker posted anything about `key` */
    const posted = (key: string) =>
      shim.scope.sent.some((m: any) => m?.type === "jt-post" && m.diff?.some((r: any) => r.path[0] === key));
    return { shim, tree: shim.tree, store, subscribes, posted };
  }

  it("receives its roots as before, and no demand root until one is read", async () => {
    const { store, tree, posted } = Setup();
    await WaitFor(() => expect(store.Get("counts")).toBe(2));
    await Settle();
    expect(tree.SubscriberCount("type:a")).toBe(0);
    expect(posted("type:a")).toBe(false);
    expect(posted("type:b")).toBe(false);
  });

  it("subscribes a root alone when a scope reads it, and fills it from its first post", async () => {
    const { store, tree, posted } = Setup();
    const r = reader(() => store.Get<any>("type:a")?.n);
    expect(r.value()).toBe(undefined);
    await WaitFor(() => expect(r.value()).toBe(1));
    expect(tree.SubscriberCount("type:a")).toBe(1);
    expect(tree.SubscriberCount("type:b")).toBe(0);
    expect(posted("type:b")).toBe(false);
    r.destroy();
  });

  it("delivers a read root's commits, and not those of a root no one reads", async () => {
    const { store, tree, posted } = Setup();
    const r = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r.value()).toBe(1));
    tree.WritePath("type:a", { n: 5 });
    tree.WritePath("type:b", { n: 6 });
    tree.Commit();
    await WaitFor(() => expect(r.value()).toBe(5));
    await Settle();
    expect(posted("type:b")).toBe(false);
    expect(store.Has("type:b")).toBe(false);
    r.destroy();
  });

  it("releases a root after the grace period once its last reader goes, and deletes it", async () => {
    const { store, tree } = Setup();
    const r1 = reader(() => store.Get<any>("type:a")?.n);
    const r2 = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r1.value()).toBe(1));
    r1.destroy();
    await sleep(GRACE * 3);
    expect(tree.SubscriberCount("type:a")).toBe(1);
    r2.destroy();
    await Settle();
    expect(tree.SubscriberCount("type:a")).toBe(1);
    await WaitFor(() => expect(tree.SubscriberCount("type:a")).toBe(0));
    expect(store.Get("type:a")).toBe(undefined);
    // A commit after the release isn't received
    tree.WritePath("type:a", { n: 9 });
    tree.Commit();
    await Settle();
    expect(store.Get("type:a")).toBe(undefined);
  });

  it("keeps a root a reader comes back to within the grace period, without subscribing again", async () => {
    const { store, tree, subscribes } = Setup();
    const r1 = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r1.value()).toBe(1));
    r1.destroy();
    await Settle(1);
    const r2 = reader(() => store.Get<any>("type:a")?.n);
    expect(r2.value()).toBe(1);
    await sleep(GRACE * 3);
    expect(tree.SubscriberCount("type:a")).toBe(1);
    expect(subscribes("type:a")).toBe(1);
    r2.destroy();
  });

  it("subscribes again to a root read after its release, and fills it again", async () => {
    const { store, tree, subscribes } = Setup();
    const r1 = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r1.value()).toBe(1));
    r1.destroy();
    await WaitFor(() => expect(tree.SubscriberCount("type:a")).toBe(0));
    tree.WritePath("type:a", { n: 3 });
    tree.Commit();
    const r2 = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r2.value()).toBe(3));
    expect(subscribes("type:a")).toBe(2);
    r2.destroy();
  });

  it("never subscribes a root read and dropped before the next microtask", async () => {
    const { store, subscribes } = Setup();
    reader(() => store.Get("type:a")).destroy();
    await Settle();
    expect(subscribes("type:a")).toBe(0);
  });

  it("neither subscribes nor keeps a root read outside a scope", async () => {
    const { store, subscribes } = Setup();
    expect(store.Get("type:a")).toBe(undefined);
    await Settle();
    expect(subscribes("type:a")).toBe(0);
  });

  it("subscribes a held root until every hold is released", async () => {
    const { store, tree } = Setup();
    const release1 = store.Hold("type:a");
    const release2 = store.Hold("type:a");
    await WaitFor(() => expect(store.Get<any>("type:a")?.n).toBe(1));
    release1();
    release1();
    await sleep(GRACE * 3);
    expect(tree.SubscriberCount("type:a")).toBe(1);
    release2();
    await WaitFor(() => expect(tree.SubscriberCount("type:a")).toBe(0));
    expect(store.Get("type:a")).toBe(undefined);
  });

  it("holds a roots root by doing nothing, and refuses a key it neither receives nor demands", async () => {
    const { store, subscribes } = Setup();
    const release = store.Hold("counts");
    release();
    expect(() => store.Hold("other")).toThrow();
    await Settle();
    expect(subscribes("counts")).toBe(1);
  });

  it("treats a key roots and demand both name as a roots root", async () => {
    const { store, tree, subscribes } = Setup({ roots: ["counts", "type:a"] });
    await WaitFor(() => expect(store.Get<any>("type:a")?.n).toBe(1));
    const r = reader(() => store.Get<any>("type:a")?.n);
    await Settle();
    expect(subscribes("type:a")).toBe(1);
    r.destroy();
    await sleep(GRACE * 3);
    expect(store.Get<any>("type:a")?.n).toBe(1);
    expect(tree.SubscriberCount("type:a")).toBe(1);
  });

  it("releases at the next flush with no grace period", async () => {
    const { store, tree } = Setup({ demandDebounce: 0 });
    const r = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r.value()).toBe(1));
    r.destroy();
    await WaitFor(() => expect(tree.SubscriberCount("type:a")).toBe(0));
  });

  it("needs roots to demand anything", () => {
    const shim = CreateShimWorker();
    expect(() => new StoreAsync(shim.worker as any, { demand: ["type:*"] })).toThrow();
  });

  it("ends its demand subscriptions when destroyed", async () => {
    const { store, tree } = Setup();
    const r = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r.value()).toBe(1));
    store.Destroy();
    await WaitFor(() => expect(tree.SubscriberCount("type:a")).toBe(0));
    r.destroy();
    await sleep(GRACE * 3);
  });

  it("follows a restarted worker: a held root is subscribed on the new tree and takes its state", async () => {
    hub = new DiffTreeHub();
    const endpoint = DiffTreeEndpoint.Define("demand-engine");
    const created: ReturnType<typeof CreateShimWorker>[] = [];
    hub.Register(endpoint, () => {
      const shim = CreateShimWorker();
      created.push(shim);
      shim.tree.WritePath("counts", created.length);
      shim.tree.WritePath("type:a", { n: created.length * 10 });
      shim.tree.Commit();
      return shim.worker as any;
    });
    const store = new StoreAsync(hub.Open("demand-engine"), { roots: ["counts"], demand: ["type:*"], demandDebounce: GRACE });
    stores.push(store);
    const r = reader(() => store.Get<any>("type:a")?.n);
    await WaitFor(() => expect(r.value()).toBe(10));
    hub.Restart("demand-engine");
    await WaitFor(() => expect(r.value()).toBe(20));
    expect(created[1].tree.SubscriberCount("type:a")).toBe(1);
    expect(store.Get("counts")).toBe(2);
    r.destroy();
  });
});
