import { describe, it, expect, afterEach } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { CreateShimDiffWorker } from "./worker-shim";

// Opaque roots over a worker: the worker's DiffTree has the keys in its own config, so it posts
// each one as a single whole write, and the store holds it whole. A store never marks a tree.

function drawing(label = "a") {
  return {
    label,
    nodes: [{ id: "n1", rect: { x: 0, y: 0 } }, { id: "n2", rect: { x: 10, y: 0 } }],
  };
}

function isNode(value: any) {
  return ObservableNode.Snapshot(value) !== undefined;
}

describe("StoreAsync opaque roots", () => {
  const stores: StoreAsync[] = [];
  afterEach(() => {
    stores.splice(0).forEach((s) => s.Destroy());
  });

  /** A store over a shim worker, recording the batches sent and the diffs posted back */
  function CreateStore(opaque: string[]) {
    // The tree writes the keys whole from its own config: a store never marks a tree
    const worker = CreateShimDiffWorker(undefined, undefined, opaque);
    const store = new StoreAsync(worker, { opaque });
    stores.push(store);

    // What the store sent, and the diffs the worker posted back
    const sent = worker.sent;
    const diffs: any[][] = [];
    worker.addEventListener("message", (event) => {
      const data = (event as MessageEvent).data;
      data?.type === "jt-post" && data.diff.length > 0 && diffs.push(data.diff);
    });

    return { store, sent, diffs };
  }

  it("sends the tree nothing about its opaque keys: it subscribes, then writes", async () => {
    const { store, sent } = CreateStore(["view"]);
    await store.Write(drawing(), "view");
    expect(sent.map((m: any) => m.type)).to.deep.eq(["jt-subscribe", "jt-batch"]);
  });

  it("reads an opaque root as a raw value, never proxied", async () => {
    const { store } = CreateStore(["view"]);
    await store.Write(drawing(), "view");
    const view = store.Get<any>("view");
    expect(isNode(view)).to.eq(false);
    expect(view.nodes[1].rect.x).to.eq(10);
    expect(store.Get("view")).to.eq(view);
  });

  it("gets a change inside an opaque root as one whole write", async () => {
    const { store, diffs } = CreateStore(["view"]);
    await store.Write(drawing(), "view");
    const first = store.Get<any>("view");

    await store.Write(20, "view.nodes.1.rect.x");
    expect(diffs.length).to.eq(2);
    expect(diffs[1].length).to.eq(1);
    expect(diffs[1][0].path).to.deep.eq(["view"]);
    expect(store.Get<any>("view")).not.to.eq(first);
    expect(store.Get<any>("view").nodes[1].rect.x).to.eq(20);
  });
});
