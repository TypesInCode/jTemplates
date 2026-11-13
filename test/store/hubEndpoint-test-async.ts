import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { afterEach, describe, expect, it } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { HubEndpoint } from "../../src/Store/Diff/hubEndpoint";
import { DiffTreeHub } from "../../src/Store/Diff/diffTreeHub";
import { CreateShimHost, WaitFor } from "./worker-shim";

// Endpoints on a DiffTreeHub of same-thread workers: a counter source, and a doubling endpoint
// that follows it.

const counterEndpoint = HubEndpoint.Define("counter");

const doubledEndpoint = HubEndpoint.Define("doubled", remote => ({
  counter: remote(counterEndpoint, ["count", "$projection_described"])
}));

function NewCounterTree() {
  const tree = new ObservableDiffTree(counterEndpoint.keyFunc, {
    "/": { projections: { described: { reads: ["count"], projection: (n: number) => `n=${n}` } } }
  });
  tree.WritePath("count", 0);
  tree.RunProjections();
  tree.Commit();
  return tree;
}

function NewDoubledTree() {
  const { counter } = doubledEndpoint.config;
  return new ObservableDiffTree(doubledEndpoint.keyFunc, {
    "/": {
      projections: {
        doubled: { reads: [counter.count], projection: (n: number) => n * 2 },
        // A source's projection output is followed like any root
        echo: { reads: [counter.$projection_described], projection: (d: string) => `echo ${d}` }
      }
    },
    ...HubEndpoint.FollowRoutes(doubledEndpoint)
  });
}

let hub: DiffTreeHub;

function CreateHub() {
  hub = new DiffTreeHub();
  hub.Register(counterEndpoint, () => CreateShimHost(scope => HubEndpoint.Host(counterEndpoint, NewCounterTree(), scope)));
  hub.Register(doubledEndpoint, () => CreateShimHost(scope => HubEndpoint.Host(doubledEndpoint, NewDoubledTree(), scope)));
  return hub;
}

afterEach(() => hub?.Destroy());

describe("HubEndpoint.Define", () => {
  it("records each remote as it's called, with its paths", () => {
    expect(doubledEndpoint.sources).toEqual(["counter"]);
    expect(doubledEndpoint.remotes).toEqual([
      { source: "counter", keyFunc: undefined, roots: ["count", "$projection_described"] }
    ]);
    expect(doubledEndpoint.config.counter).toEqual({
      count: "/counter/count",
      $projection_described: "/counter/$projection_described"
    });
  });

  it("merges a second remote to the same source", () => {
    const store = HubEndpoint.Define("twice", remote => ({
      a: remote(counterEndpoint, ["count"]),
      b: remote(counterEndpoint, ["count", "label"])
    }));
    expect(store.remotes).toEqual([{ source: "counter", keyFunc: undefined, roots: ["count", "label"] }]);
  });

  it("carries the source's keyFunc to the stores that follow it", () => {
    const keyFunc = (v: { id?: string }) => v?.id;
    const keyed = HubEndpoint.Define("keyed", undefined, { keyFunc });
    const follower = HubEndpoint.Define("follower", remote => ({ k: remote(keyed, ["rows", "o_*"]) }));
    expect(follower.remotes[0].keyFunc).toBe(keyFunc);
  });

  it("refuses a name that isn't one route segment, and a store that follows itself", () => {
    expect(() => HubEndpoint.Define("a/b")).toThrow("one route segment");
    const self = HubEndpoint.Define("self");
    expect(() => HubEndpoint.Define("self", remote => ({ s: remote(self, ["x"]) }))).toThrow("can't follow itself");
  });
});

describe("HubEndpoint.Connect", () => {
  it("follows the source's roots and projections across workers", async () => {
    CreateHub();
    const counter = new StoreAsync(hub.Open(counterEndpoint.name));
    const doubled = new StoreAsync(hub.Open(doubledEndpoint.name));
    await WaitFor(() => expect(doubled.Get("$projection_echo")).toBe("echo n=0"));
    expect(doubled.Get("$projection_doubled")).toBe(0);

    void counter.Write(21, "count");
    await WaitFor(() => expect(doubled.Get("$projection_doubled")).toBe(42));
    expect(doubled.Get("$projection_echo")).toBe("echo n=21");
    counter.Destroy();
    doubled.Destroy();
  });

  it("is never posted on: the follow route stays in the tree", async () => {
    CreateHub();
    const doubled = new StoreAsync(hub.Open(doubledEndpoint.name));
    await WaitFor(() => expect(doubled.Get("$projection_doubled")).toBe(0));
    expect(doubled.Get("counter")).toBeUndefined();
    expect(doubled.Get("count")).toBeUndefined();
    doubled.Destroy();
  });
});

describe("StoreAsync", () => {
  it("shares one worker between stores, and releases its lease when destroyed", async () => {
    CreateHub();
    const a = new StoreAsync(hub.Open(doubledEndpoint.name));
    const b = new StoreAsync(hub.Open(doubledEndpoint.name));
    const writer = new StoreAsync(hub.Open(counterEndpoint.name));
    void writer.Write(5, "count");
    await WaitFor(() => {
      expect(a.Get("$projection_doubled")).toBe(10);
      expect(b.Get("$projection_doubled")).toBe(10);
    });

    a.Destroy();
    expect(hub.IsRunning("doubled")).toBe(true);
    void writer.Write(6, "count");
    await WaitFor(() => expect(b.Get("$projection_doubled")).toBe(12));
    writer.Destroy();
    // b's worker still holds counter as its source
    expect(hub.IsRunning("counter")).toBe(true);
    b.Destroy();
    expect(hub.IsRunning("doubled")).toBe(false);
    expect(hub.IsRunning("counter")).toBe(false);
  });
});

describe("opaque", () => {
  // An endpoint whose projection output is held whole, read from one definition by both sides
  const viewEndpoint = HubEndpoint.Define("view", undefined, { opaque: ["$projection_view"] });
  type View = { n: number; items: number[] };

  function NewViewTree() {
    const tree = new ObservableDiffTree(viewEndpoint.keyFunc, {
      "/": { projections: { view: { reads: ["n"], projection: (n: number) => ({ n, items: [n, n + 1] }) } } }
    });
    // Not marked here: hosting it marks the endpoint's opaque keys
    tree.WritePath("n", 1);
    tree.RunProjections();
    tree.Commit();
    return tree;
  }

  function CreateViewHub() {
    hub = new DiffTreeHub();
    hub.Register(viewEndpoint, () => CreateShimHost(scope => HubEndpoint.Host(viewEndpoint, NewViewTree(), scope)));
    return hub;
  }

  it("is recorded on the definition", () => {
    expect(viewEndpoint.opaque).toEqual(["$projection_view"]);
    expect(counterEndpoint.opaque).toEqual([]);
  });

  it("is marked on the tree by Host, and held whole by every StoreAsync, replaced on each change", async () => {
    CreateViewHub();
    const store = new StoreAsync(hub.Open(viewEndpoint.name));
    await WaitFor(() => expect(store.Get<View>("$projection_view")).toBeDefined());
    const first = store.Get<View>("$projection_view")!;
    // The raw value, not a proxy
    expect(ObservableNode.Unwrap(first)).toBe(first);

    void store.Write(2, "n");
    await WaitFor(() => expect(store.Get<View>("$projection_view")?.n).toBe(2));
    const next = store.Get<View>("$projection_view")!;
    expect(next).not.toBe(first);
    expect(next).toEqual({ n: 2, items: [2, 3] });
    // The old value is left as it was: a reader that kept it sees no change inside it
    expect(first).toEqual({ n: 1, items: [1, 2] });
    store.Destroy();
  });

  it("can be replaced for one store, which then holds the key as any other", async () => {
    CreateViewHub();
    const whole = new StoreAsync(hub.Open(viewEndpoint.name));
    const diffed = new StoreAsync(hub.Open(viewEndpoint.name), undefined, { opaque: [] });
    await WaitFor(() => expect(diffed.Get<View>("$projection_view")).toBeDefined());
    const view = diffed.Get<View>("$projection_view")!;
    expect(ObservableNode.Unwrap(view)).not.toBe(view);

    void whole.Write(5, "n");
    await WaitFor(() => expect(diffed.Get<View>("$projection_view")?.n).toBe(5));
    expect([...diffed.Get<View>("$projection_view")!.items]).toEqual([5, 6]);
    whole.Destroy();
    diffed.Destroy();
  });
});
