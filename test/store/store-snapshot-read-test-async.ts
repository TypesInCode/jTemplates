import { describe, it, expect, afterEach } from "vitest";
import { StoreAsync, IStoreAsyncOptions } from "../../src/Store/Store/storeAsync";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { CreateShimWorker, Settle, WaitFor } from "./worker-shim";

// `GetSnapshot(key)` on a StoreAsync: the case it's for (store-snapshot-read.md, "Use case").
// A demand root read as plain data must be subscribed by that read, wake its reader on each post
// the worker's commits bring into it, and be released after its last reader goes.

const GRACE = 20;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A scope that counts its evaluations, read once */
function reader<T>(fn: () => T) {
  let runs = 0;
  const scope = ObservableScope.Create(() => {
    runs++;
    return fn();
  });
  ObservableScope.Value(scope);
  return {
    value: () => ObservableScope.Value(scope),
    runs: () => runs,
    destroy: () => ObservableScope.Destroy(scope),
  };
}

describe("StoreAsync GetSnapshot", () => {
  const stores: StoreAsync[] = [];
  afterEach(() => {
    stores.splice(0).forEach((store) => store.Destroy());
  });

  /** A tree holding `counts` and `type:a`, and a store receiving `counts` and demanding `type:*` */
  function Setup(options: IStoreAsyncOptions = {}) {
    const shim = CreateShimWorker();
    shim.tree.WritePath("counts", 1);
    shim.tree.WritePath("type:a", { members: { m1: { n: 1 }, m2: { n: 2 } } });
    shim.tree.Commit();
    const store = new StoreAsync(shim.worker as any, { roots: ["counts"], demand: ["type:*"], demandDebounce: GRACE, ...options });
    stores.push(store);
    return { tree: shim.tree, store };
  }

  it("delivers commits inside a roots root to a snapshot reader", async () => {
    const shim = CreateShimWorker();
    shim.tree.WritePath("doc", { a: { n: 1 }, b: { n: 1 } });
    shim.tree.Commit();
    const store = new StoreAsync(shim.worker as any);
    stores.push(store);
    await WaitFor(() => expect(store.Get<any>("doc")?.a.n).toBe(1));
    const r = reader(() => store.GetSnapshot<any>("doc")?.a.n);
    const before = store.GetSnapshot<any>("doc");

    shim.tree.WritePath("doc.a.n", 2);
    shim.tree.Commit();

    await WaitFor(() => expect(r.value()).toBe(2));
    expect(store.GetSnapshot<any>("doc").b).toBe(before.b);
    r.destroy();
  });

  it("subscribes a demand root when a scope reads its snapshot", async () => {
    const { tree, store } = Setup();
    const r = reader(() => store.GetSnapshot<any>("type:a")?.members.m1.n);
    expect(r.value()).toBe(undefined);

    await WaitFor(() => expect(r.value()).toBe(1));
    expect(tree.SubscriberCount("type:a")).toBe(1);
    r.destroy();
  });

  it("wakes the reader on a commit inside the demand root, once per post", async () => {
    const { tree, store } = Setup();
    const r = reader(() => store.GetSnapshot<any>("type:a"));
    await WaitFor(() => expect(r.value()?.members.m1.n).toBe(1));
    const runs = r.runs();

    tree.WritePath("type:a.members.m1.n", 5);
    tree.WritePath("type:a.members.m2.n", 6);
    tree.Commit();

    await WaitFor(() => expect(r.value().members.m2.n).toBe(6));
    expect(r.value().members.m1.n).toBe(5);
    expect(r.runs()).toBe(runs + 1);
    r.destroy();
  });

  it("releases the demand root after its last snapshot reader goes", async () => {
    const { tree, store } = Setup();
    const r = reader(() => store.GetSnapshot<any>("type:a")?.members.m1.n);
    await WaitFor(() => expect(r.value()).toBe(1));

    r.destroy();
    await sleep(GRACE * 3);
    await Settle();

    expect(tree.SubscriberCount("type:a")).toBe(0);
    expect(store.GetSnapshot("type:a")).toBe(undefined);
  });
});
