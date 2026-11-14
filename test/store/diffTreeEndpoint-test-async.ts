import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { afterEach, describe, expect, it } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { DiffTreeEndpoint } from "../../src/Store/Diff/diffTreeEndpoint";
import { DiffTreeHub } from "../../src/Store/Diff/diffTreeHub";
import { CreateShimChannel, CreateShimHost, WaitFor } from "./worker-shim";

// Endpoints on a DiffTreeHub of same-thread workers: a counter source, and a doubling endpoint
// that follows it.

const counterEndpoint = DiffTreeEndpoint.Define("counter");

const doubledEndpoint = DiffTreeEndpoint.Define("doubled", remote => ({
  counter: remote(counterEndpoint, ["count", "$projection_described"])
}));

function NewCounterTree() {
  const tree = new ObservableDiffTree({
    endpoint: counterEndpoint,
    routes: { "/": { projections: { described: { reads: ["count"], projection: (n: number) => `n=${n}` } } } }
  });
  tree.WritePath("count", 0);
  tree.RunProjections();
  tree.Commit();
  return tree;
}

function NewDoubledTree() {
  const { counter } = doubledEndpoint.config;
  return new ObservableDiffTree({
    endpoint: doubledEndpoint,
    routes: {
      "/": {
        projections: {
          doubled: { reads: [counter.count], projection: (n: number) => n * 2 },
          // A source's projection output is followed like any root
          echo: { reads: [counter.$projection_described], projection: (d: string) => `echo ${d}` }
        }
      }
    }
  });
}

let hub: DiffTreeHub;

function CreateHub() {
  hub = new DiffTreeHub();
  hub.Register(counterEndpoint, () => CreateShimHost(scope => DiffTreeEndpoint.Host(counterEndpoint, NewCounterTree(), scope)));
  hub.Register(doubledEndpoint, () => CreateShimHost(scope => DiffTreeEndpoint.Host(doubledEndpoint, NewDoubledTree(), scope)));
  return hub;
}

afterEach(() => hub?.Destroy());

describe("DiffTreeEndpoint.Define", () => {
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
    const store = DiffTreeEndpoint.Define("twice", remote => ({
      a: remote(counterEndpoint, ["count"]),
      b: remote(counterEndpoint, ["count", "label"])
    }));
    expect(store.remotes).toEqual([{ source: "counter", keyFunc: undefined, roots: ["count", "label"] }]);
  });

  it("carries the source's keyFunc to the stores that follow it", () => {
    const keyFunc = (v: { id?: string }) => v?.id;
    const keyed = DiffTreeEndpoint.Define("keyed", undefined, { keyFunc });
    const follower = DiffTreeEndpoint.Define("follower", remote => ({ k: remote(keyed, ["rows", "o_*"]) }));
    expect(follower.remotes[0].keyFunc).toBe(keyFunc);
  });

  it("refuses a name that isn't one route segment, and a store that follows itself", () => {
    expect(() => DiffTreeEndpoint.Define("a/b")).toThrow("one route segment");
    const self = DiffTreeEndpoint.Define("self");
    expect(() => DiffTreeEndpoint.Define("self", remote => ({ s: remote(self, ["x"]) }))).toThrow("can't follow itself");
  });
});

describe("an ObservableDiffTree built from an endpoint", () => {
  it("takes the endpoint's keyFunc, and a follow route per source", () => {
    const keyFunc = (v: { id?: string }) => v?.id;
    const keyed = DiffTreeEndpoint.Define("keyed", remote => ({ counter: remote(counterEndpoint, ["count"]) }), { keyFunc });
    const tree = new ObservableDiffTree({ endpoint: keyed });
    expect(tree.Endpoint).toBe(keyed);
    tree.WritePath("rows", [{ id: "a", n: 1 }]);
    tree.Commit();
    expect(tree.Committed("a")).toEqual({ id: "a", n: 1 });
    tree.ApplyDiff([{ type: "write", path: ["count"], value: 3 }], DiffTreeEndpoint.FollowRoute("counter"));
    expect(tree.Snapshot("/counter/count")).toBe(3);
  });

  it("refuses a keyFunc of its own: the endpoint's is the tree's", () => {
    const keyFunc = (v: { id?: string }) => v?.id;
    expect(() => new ObservableDiffTree({ endpoint: counterEndpoint, keyFunc })).toThrow("counter gives the tree its keyFunc");
  });

  it("refuses a route of its own at a source's follow route", () => {
    expect(() => new ObservableDiffTree({
      endpoint: doubledEndpoint,
      routes: { "/counter": { projections: {} } }
    })).toThrow("/counter is doubled's follow route");
  });

  it("is the tree Host takes for the endpoint: not one built from another, nor from none when it follows sources", () => {
    const [, scope] = CreateShimChannel();
    expect(() => DiffTreeEndpoint.Host(counterEndpoint, NewDoubledTree(), scope)).toThrow("was built from doubled");
    expect(() => DiffTreeEndpoint.Host(doubledEndpoint, new ObservableDiffTree(), scope)).toThrow("no follow routes");
    // A tree with no sources to follow needs nothing from the endpoint but its keyFunc
    DiffTreeEndpoint.Host(counterEndpoint, new ObservableDiffTree(), scope)();
  });
});

describe("DiffTreeEndpoint.Connect", () => {
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
  it("throws for a keyFunc in the options over a lease: the endpoint's is the store's", () => {
    CreateHub();
    const lease = hub.Open(counterEndpoint.name);
    expect(() => new StoreAsync(lease, { keyFunc: (v: any) => v?.id })).toThrow("counter gives the store its keyFunc");
    lease.Release();
  });

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
  // A projection output held whole: the config the tree and its stores share, as a file both import
  const viewEndpoint = DiffTreeEndpoint.Define("view");
  const viewConfig = { opaque: ["$projection_view"] };
  type View = { n: number; items: number[] };

  function NewViewTree() {
    const tree = new ObservableDiffTree({
      endpoint: viewEndpoint,
      routes: { "/": { projections: { view: { reads: ["n"], projection: (n: number) => ({ n, items: [n, n + 1] }) } } } },
      ...viewConfig
    });
    tree.WritePath("n", 1);
    tree.RunProjections();
    tree.Commit();
    return tree;
  }

  function CreateViewHub() {
    hub = new DiffTreeHub();
    hub.Register(viewEndpoint, () => CreateShimHost(scope => DiffTreeEndpoint.Host(viewEndpoint, NewViewTree(), scope)));
    return hub;
  }

  it("is marked on the tree by its config, and held whole by a StoreAsync given it, replaced on each change", async () => {
    CreateViewHub();
    const store = new StoreAsync(hub.Open(viewEndpoint.name), viewConfig);
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

  it("is left out by a store not given it, which then holds the key as any other", async () => {
    CreateViewHub();
    const whole = new StoreAsync(hub.Open(viewEndpoint.name), viewConfig);
    const diffed = new StoreAsync(hub.Open(viewEndpoint.name));
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
