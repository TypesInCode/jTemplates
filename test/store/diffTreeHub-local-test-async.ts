import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { afterEach, describe, expect, it } from "vitest";
import { DiffTreeEndpoint } from "../../src/Store/Diff/diffTreeEndpoint";
import type { IDiffTreeEndpoint } from "../../src/Store/Diff/diffTreeEndpoint.types";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { DiffTreeHub } from "../../src/Store/Diff/diffTreeHub";
import { CreateShimHost, WaitFor } from "./worker-shim";

// A DiffTreeHub with trees of both kinds: a counter in a (same-thread) worker, a tally on the main thread
// that follows it, and an echo worker that follows the tally. Every tree file only builds its tree:
// the workers and the hub host them with the same DiffTreeEndpoint.Host.

const counterEndpoint = DiffTreeEndpoint.Define("counter");

const tallyEndpoint = DiffTreeEndpoint.Define("tally", remote => ({
  counter: remote(counterEndpoint, ["count"])
}));

const echoEndpoint = DiffTreeEndpoint.Define("echo", remote => ({
  tally: remote(tallyEndpoint, ["$projection_tripled", "note"])
}));

function NewCounterTree() {
  const tree = new ObservableDiffTree();
  tree.WritePath("count", 0);
  tree.Commit();
  return tree;
}

let tallies = 0;

/** The tally's tree: its factory returns the tree, so the hub runs it on this thread */
function NewTallyTree() {
  tallies++;
  const { counter } = tallyEndpoint.config;
  const tree = new ObservableDiffTree(tallyEndpoint.keyFunc, {
    "/": { projections: { tripled: { reads: [counter.count], projection: (n?: number) => n === undefined ? undefined : n * 3 } } },
    ...DiffTreeEndpoint.FollowRoutes(tallyEndpoint)
  });
  tree.WritePath("note", "");
  tree.WritePath(`started${tallies}`, true);
  tree.Commit();
  return tree;
}

function NewEchoTree() {
  const { tally } = echoEndpoint.config;
  return new ObservableDiffTree(echoEndpoint.keyFunc, {
    "/": { projections: { echo: { reads: [tally.$projection_tripled, tally.note], projection: (t?: number, note?: string) => `${t}:${note}` } } },
    ...DiffTreeEndpoint.FollowRoutes(echoEndpoint)
  });
}

/** A worker hosting a tree, as a worker entry does: the same `Host` the hub calls for a local tree */
function InWorker(endpoint: IDiffTreeEndpoint, newTree: () => ObservableDiffTree) {
  return () => CreateShimHost(scope => DiffTreeEndpoint.Host(endpoint, newTree(), scope));
}

let hub: DiffTreeHub;

function CreateHub() {
  hub = new DiffTreeHub();
  hub.Register(counterEndpoint, InWorker(counterEndpoint, NewCounterTree));
  hub.Register(tallyEndpoint, NewTallyTree);
  hub.Register(echoEndpoint, InWorker(echoEndpoint, NewEchoTree));
  return hub;
}

afterEach(() => hub?.Destroy());

describe("DiffTreeHub.Register", () => {
  it("takes the sources from the definition, each registered first", () => {
    hub = new DiffTreeHub();
    expect(() => hub.Register(tallyEndpoint, NewTallyTree)).toThrow(/counter, which isn't registered/);
    hub.Register(counterEndpoint, InWorker(counterEndpoint, NewCounterTree));
    hub.Register(tallyEndpoint, NewTallyTree);
    expect(hub.IsRunning("tally")).toBe(false);
    expect(hub.KindOf("tally")).toBeUndefined();
  });
});

describe("the kind of a key", () => {
  it("is what its factory returns, known from its first start", () => {
    CreateHub();
    const counter = hub.Open("counter");
    const tally = hub.OpenLocal("tally");
    expect(hub.KindOf("counter")).toBe("worker");
    expect(hub.KindOf("tally")).toBe("local");
    counter.Release();
    tally.Release();
  });

  it("throws when a key is opened as the other kind, before its first start and after", () => {
    CreateHub();
    // Before: the factory runs, and what it returned decides
    expect(() => hub.OpenLocal("counter")).toThrow("counter is a worker; open it with Open");
    expect(() => hub.Open("tally")).toThrow("tally is a tree on this thread; open it with OpenLocal");
    // After: the kind is known, and nothing runs
    expect(() => hub.OpenLocal("counter")).toThrow("open it with Open");
    expect(() => hub.Open("tally")).toThrow("open it with OpenLocal");
  });

  it("ends a tree started only to find it's the other kind, and the sources it leased", () => {
    CreateHub();
    expect(() => hub.Open("tally")).toThrow("open it with OpenLocal");
    expect(hub.IsRunning("tally")).toBe(false);
    expect(hub.IsRunning("counter")).toBe(false);
  });

  it("isn't a tree when the factory's ObservableDiffTree comes from another copy of j-templates", () => {
    hub = new DiffTreeHub();
    const copy = DiffTreeEndpoint.Define("copy");
    // What a second copy's publisher looks like here: the same shape, another class
    hub.Register(copy, () => Object.create(Object.getPrototypeOf({ Subscribe() { }, Commit() { } })) as never);
    expect(() => hub.OpenLocal("copy")).toThrow("from another copy of j-templates");
  });

  it("throws when a factory returns neither, or changes kind on a restart", () => {
    hub = new DiffTreeHub();
    const odd = DiffTreeEndpoint.Define("odd");
    hub.Register(odd, () => ({}) as never);
    expect(() => hub.Open("odd")).toThrow("neither a worker nor an ObservableDiffTree");

    const fickle = DiffTreeEndpoint.Define("fickle");
    let starts = 0;
    hub.Register(fickle, () => (starts++ === 0 ? new ObservableDiffTree() : CreateShimHost(() => { })));
    const lease = hub.OpenLocal("fickle");
    expect(() => hub.Restart("fickle")).toThrow("returned a worker after a tree on this thread");
    void lease;
  });

  it("is checked at compile time by the stores' constructors", () => {
    CreateHub();
    // Never called: tsc checks that each store refuses the other kind's lease
    const wrong = () => {
      // @ts-expect-error a synchronous store needs a tree on this thread
      new StoreSync(hub.Open("counter"));
      // @ts-expect-error a StoreAsync needs a worker's tree
      new StoreAsync(hub.OpenLocal("tally"));
    };
    void wrong;
  });
});

describe("a tree on this thread", () => {
  it("is started by its first lease and followed into by the hub, as a worker's is", async () => {
    CreateHub();
    const tally = new StoreSync(hub.OpenLocal("tally"));
    // The hub leased its source for it
    expect(hub.IsRunning("tally")).toBe(true);
    expect(hub.IsRunning("counter")).toBe(true);
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(0));

    const counter = new StoreAsync(hub.Open("counter"));
    void counter.Write(4, "count");
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(12));
    // The follow route is the tree's own: never delivered to the store
    expect(tally.Get("count")).toBeUndefined();

    counter.Destroy();
    expect(hub.IsRunning("counter")).toBe(true);
    tally.Destroy();
    expect(hub.IsRunning("tally")).toBe(false);
    expect(hub.IsRunning("counter")).toBe(false);
  });

  it("is shared by every store opened on it, each write seen by all before Write returns", () => {
    CreateHub();
    const a = new StoreSync(hub.OpenLocal("tally"));
    const b = new StoreSync(hub.OpenLocal("tally"));
    a.Write("from a", "note");
    expect(b.Get("note")).toBe("from a");
    b.Write("from b", "note");
    expect(a.Get("note")).toBe("from b");
    a.Destroy();
    expect(hub.IsRunning("tally")).toBe(true);
    b.Destroy();
    expect(hub.IsRunning("tally")).toBe(false);
  });

  it("is a source a worker can follow, the same way", async () => {
    CreateHub();
    const tally = new StoreSync(hub.OpenLocal("tally"));
    const echo = new StoreAsync(hub.Open("echo"));
    await WaitFor(() => expect(echo.Get("$projection_echo")).toBe("0:"));

    tally.Write("hi", "note");
    await WaitFor(() => expect(echo.Get("$projection_echo")).toBe("0:hi"));
    const counter = new StoreAsync(hub.Open("counter"));
    void counter.Write(2, "count");
    // counter → tally (this thread) → echo (a worker)
    await WaitFor(() => expect(echo.Get("$projection_echo")).toBe("6:hi"));

    // The echo worker's lease keeps the tally running without any store on it
    tally.Destroy();
    expect(hub.IsRunning("tally")).toBe(true);
    counter.Destroy();
    echo.Destroy();
    expect(hub.IsRunning("tally")).toBe(false);
    expect(hub.IsRunning("counter")).toBe(false);
  });

  it("moves its stores to the new tree on a restart, deleting the roots gone", async () => {
    CreateHub();
    tallies = 0;
    const tally = new StoreSync(hub.OpenLocal("tally"));
    expect(tally.Get("started1")).toBe(true);
    tally.Write("before", "note");

    hub.Restart("tally");
    expect(tally.Get("started2")).toBe(true);
    expect(tally.Has("started1") && tally.Get("started1") === undefined).toBe(true);
    // A new tree, from its factory: the note was the old tree's
    expect(tally.Get("note")).toBe("");
    // And it's followed into again, over the ports the hub gave it
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(0));
    tally.Destroy();
  });

  it("follows a source that restarts, on the port the hub re-issues", async () => {
    CreateHub();
    const tally = new StoreSync(hub.OpenLocal("tally"));
    const counter = new StoreAsync(hub.Open("counter"));
    void counter.Write(5, "count");
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(15));

    // The new worker starts from its seed, and the tally follows it there
    hub.Restart("counter");
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(0));
    void counter.Write(1, "count");
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(3));
    counter.Destroy();
    tally.Destroy();
  });
});

describe("a StoreSync on a tree on this thread", () => {
  it("holds the endpoint's opaque keys whole, and one store can diff them instead", () => {
    hub = new DiffTreeHub();
    const boxEndpoint = DiffTreeEndpoint.Define("box", undefined, { opaque: ["box"] });
    hub.Register(boxEndpoint, () => new ObservableDiffTree());
    const whole = new StoreSync(hub.OpenLocal("box"));
    // Holding fewer keys whole than the tree is local to the store; holding more needs the tree told
    const diffed = new StoreSync(hub.OpenLocal("box"), { opaque: [] });
    whole.Write({ n: 1, items: [1] }, "box");
    const first = whole.Get<{ n: number }>("box")!;
    expect(ObservableNode.Unwrap(first)).toBe(first);
    const node = diffed.Get<{ n: number }>("box")!;
    expect(ObservableNode.Unwrap(node)).not.toBe(node);

    diffed.Write({ n: 2, items: [1] }, "box");
    expect(whole.Get("box")).not.toBe(first);
    expect(first).toEqual({ n: 1, items: [1] });
    // The tree writes the root whole, so the store that diffs it gets a new node for it
    const next = diffed.Get<{ n: number }>("box")!;
    expect(ObservableNode.Unwrap(next)).not.toBe(next);
    expect(next.n).toBe(2);
    whole.Destroy();
    diffed.Destroy();
  });

  it("holds only its roots, and stops changing once destroyed", () => {
    CreateHub();
    const notes = new StoreSync(hub.OpenLocal("tally"), { roots: ["note"] });
    const writer = new StoreSync(hub.OpenLocal("tally"));
    writer.Write("one", "note");
    expect(notes.Get("note")).toBe("one");
    expect(notes.Has(`started${tallies}`)).toBe(false);

    notes.Destroy();
    writer.Write("two", "note");
    expect(notes.Get("note")).toBe("one");
    writer.Destroy();
    expect(hub.IsRunning("tally")).toBe(false);
  });

  it("over its own tree, stops changing once destroyed", () => {
    const store = new StoreSync();
    store.Write(1, "n");
    store.Tree.WritePath("n", 2);
    store.Tree.Commit();
    expect(store.Get("n")).toBe(2);
    store.Destroy();
    store.Tree.WritePath("n", 3);
    store.Tree.Commit();
    expect(store.Get("n")).toBe(2);
  });
});

describe("DiffTreeEndpoint.Host's onFollow", () => {
  it("runs after each source's post in place of the commit, with the source's name", async () => {
    hub = new DiffTreeHub();
    hub.Register(counterEndpoint, InWorker(counterEndpoint, NewCounterTree));
    const followed: string[] = [];
    let tree!: ObservableDiffTree;
    hub.Register(tallyEndpoint, () => CreateShimHost(scope => {
      tree = NewTallyTree();
      return DiffTreeEndpoint.Host(tallyEndpoint, tree, scope, { onFollow: (t, source) => {
        followed.push(source);
        // Acts at the end of the turn, as a tree that batches its work does
        queueMicrotask(() => {
          t.RunProjections();
          t.Commit();
        });
      } });
    }));
    const tally = new StoreAsync(hub.Open("tally"));
    await WaitFor(() => expect(tally.Get("$projection_tripled")).toBe(0));
    expect(followed[0]).toBe("counter");
    expect(tree.Committed("$projection_tripled")).toBe(0);
    tally.Destroy();
  });
});

describe("a restarted worker tree", () => {
  it("is the source of truth: its stores start over with it, and nothing they wrote is written back", async () => {
    CreateHub();
    const counter = new StoreAsync(hub.Open("counter"));
    await counter.Write(5, "count");
    expect(counter.Get("count")).toBe(5);
    const readers = new StoreAsync(hub.Open("counter"));
    await WaitFor(() => expect(readers.Get("count")).toBe(5));

    hub.Restart("counter");
    // Every store on it gets the new tree's state, as when it first subscribed
    await WaitFor(() => {
      expect(counter.Get("count")).toBe(0);
      expect(readers.Get("count")).toBe(0);
    });
    // And writes to the new tree as before
    await counter.Write(2, "count");
    await WaitFor(() => expect(readers.Get("count")).toBe(2));
    counter.Destroy();
    readers.Destroy();
  });

  it("rejects a write the old tree hadn't acknowledged, and doesn't send it again", async () => {
    CreateHub();
    const counter = new StoreAsync(hub.Open("counter"));
    await WaitFor(() => expect(counter.Get("count")).toBe(0));

    const write = counter.Write(7, "count");
    // Let the batch go out: it's sent a few microtasks after the write, and acknowledged a round trip later
    for (let x = 0; x < 5; x++) await Promise.resolve();
    hub.Restart("counter");
    await expect(write).rejects.toThrow("counter restarted before this change was acknowledged");
    await WaitFor(() => expect(counter.Get("count")).toBe(0));
    // Still writes after
    await counter.Write(3, "count");
    expect(counter.Get("count")).toBe(3);
    counter.Destroy();
  });
});
