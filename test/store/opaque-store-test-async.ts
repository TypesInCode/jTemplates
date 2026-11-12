import { describe, it, expect, afterEach } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { CreateShimDiffWorker } from "./worker-shim";

// Opaque roots over a worker: the store sends its opaque keys to the worker's DiffTree ahead
// of the first change, so the worker posts each one as a single whole write.

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
    const worker = CreateShimDiffWorker();
    const batches: any[][] = [];
    const postMessage = worker.postMessage.bind(worker);
    worker.postMessage = (data: any) => {
      batches.push(data);
      postMessage(data);
    };

    const store = new StoreAsync(worker, undefined, { opaque });
    stores.push(store);

    const diffs: any[][] = [];
    const onmessage = worker.onmessage!;
    worker.onmessage = (event: MessageEvent) => {
      diffs.push(event.data);
      onmessage.call(worker, event);
    };

    return { store, batches, diffs };
  }

  it("sends its opaque keys first, in the batch with the first change", async () => {
    const { store, batches } = CreateStore(["view"]);
    await store.Write(drawing(), "view");
    expect(batches.length).to.eq(1);
    expect(batches[0][0]).to.deep.eq({ method: "markopaque", arguments: [["view"]] });
    expect(batches[0][1].method).to.eq("writepath");
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
    expect(diffs[1].length).to.eq(1);
    expect(diffs[1][0].path).to.deep.eq(["view"]);
    expect(store.Get<any>("view")).not.to.eq(first);
    expect(store.Get<any>("view").nodes[1].rect.x).to.eq(20);
  });
});
