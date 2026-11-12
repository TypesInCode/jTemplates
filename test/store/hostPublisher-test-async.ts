import { describe, it, expect } from "vitest";
import type { IRouteDefinitions, ISnapshotUpdate } from "../../src/Store/Diff";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import { HostPublisher } from "../../src/Store/Diff/hostPublisher";
import { ChannelClient, Once, Subscribe } from "../../src/Store/Diff/channelClient";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { CreateShimChannel, CreateShimWorker, Settle } from "./worker-shim";

// HostPublisher on a shim channel, and the client side: raw jt- messages, Subscribe and Once
// over a port, and one worker's tree subscribing to another's.

/** The jt- messages received on a port */
function Received(port: EventTarget) {
  const messages: any[] = [];
  port.addEventListener("message", (event) => messages.push((event as MessageEvent).data));
  return messages;
}

describe("HostPublisher", () => {
  it("leaves messages that aren't jt- ones to the app's own listeners", async () => {
    const { worker, scope } = CreateShimWorker();
    const app: any[] = [];
    scope.addEventListener("message", (event) => app.push((event as MessageEvent).data));
    worker.postMessage({ type: "trace-engine", port: 1 });
    worker.postMessage("text");
    await Settle();
    expect(app).to.deep.eq([{ type: "trace-engine", port: 1 }, "text"]);
    expect(scope.sent).to.deep.eq([]);
  });

  it("answers a batch with an ack after the commit's posts, on a channel that writes without subscribing", async () => {
    const { worker, tree } = CreateShimWorker();
    const reader = new ChannelClient(worker);
    const posts: any[] = [];
    reader.Subscribe({}, (post) => posts.push(post));

    const received = Received(worker);
    worker.postMessage({ type: "jt-batch", id: 7, calls: [{ method: "writepath", arguments: ["a", 1] }] });
    await Settle();
    expect(received.map((m) => m.type)).to.deep.eq(["jt-subscribed", "jt-post", "jt-ack"]);
    expect(received[2]).to.deep.eq({ type: "jt-ack", id: 7 });
    expect(posts.length).to.eq(1);
    expect(tree.Committed("a")).to.eq(1);
  });

  it("posts the first state, then jt-subscribed; only jt-subscribed when nothing matches", async () => {
    const { worker, tree } = CreateShimWorker();
    tree.WritePath("a", 1);
    tree.Commit();
    const received = Received(worker);
    worker.postMessage({ type: "jt-subscribe", sub: 1, roots: ["a"], form: "diff" });
    worker.postMessage({ type: "jt-subscribe", sub: 2, roots: ["missing"], form: "diff" });
    await Settle();
    expect(received).to.deep.eq([
      { type: "jt-post", sub: 1, seq: 1, diff: [{ type: "write", path: ["a"], value: 1 }] },
      { type: "jt-subscribed", sub: 1 },
      { type: "jt-subscribed", sub: 2 },
    ]);
  });

  it("tags each subscription's deliveries with its own id, in its own form", async () => {
    const { worker, tree } = CreateShimWorker();
    const received = Received(worker);
    worker.postMessage({ type: "jt-subscribe", sub: 1, roots: ["a"], form: "diff" });
    worker.postMessage({ type: "jt-subscribe", sub: 2, roots: ["a", "b"], form: "snapshot" });
    await Settle();
    tree.WritePath("a", 1);
    tree.WritePath("b", 2);
    tree.Commit();
    await Settle();
    expect(received.filter((m) => m.type === "jt-post")).to.deep.eq([
      { type: "jt-post", sub: 1, seq: 1, diff: [{ type: "write", path: ["a"], value: 1 }] },
      { type: "jt-post", sub: 2, seq: 1, roots: { a: 1, b: 2 }, deleted: [] },
    ]);
  });

  it("jt-unsubscribe ends one subscription; jt-disconnect ends the channel's and releases their keys", async () => {
    const { worker, tree } = CreateShimWorker();
    const released: string[] = [];
    tree.OnReleased("*", (key) => released.push(key));
    worker.postMessage({ type: "jt-subscribe", sub: 1, roots: ["a"], form: "diff" });
    worker.postMessage({ type: "jt-subscribe", sub: 2, roots: ["b"], form: "diff" });
    worker.postMessage({ type: "jt-subscribe", sub: 3, roots: ["c"], form: "diff" });
    await Settle();
    worker.postMessage({ type: "jt-unsubscribe", sub: 1 });
    await Settle();
    expect(released).to.deep.eq(["a"]);
    worker.postMessage({ type: "jt-disconnect" });
    await Settle();
    expect(released).to.deep.eq(["a", "b", "c"]);
    expect(tree.SubscriberCount("b")).to.eq(0);
  });

  it("a failed call skips the rest of its batch and the projections, commits what was applied, and acks the error", async () => {
    const routes: IRouteDefinitions = { "/": { projections: { n: { reads: ["list"], projection: (list: any) => list.length } } } };
    const { worker, tree } = CreateShimWorker(undefined, routes);
    const received = Received(worker);
    worker.postMessage({
      type: "jt-batch",
      id: 1,
      calls: [
        { method: "writepath", arguments: ["list", [1]] },
        { method: "splicepath", arguments: ["missing", 0, 0, []] },
        { method: "writepath", arguments: ["after", 1] },
      ],
    });
    await Settle();
    const ack = received.find((m) => m.type === "jt-ack");
    expect(String(ack.error)).to.match(/array/i);
    expect(tree.Committed("list")).to.deep.eq([1]);
    expect(tree.Committed("after")).to.eq(undefined);
    expect(tree.Committed("$projection_n")).to.eq(undefined);
  });

  it("a projection that throws during a batch fails the batch, and its changes are still posted", async () => {
    const routes: IRouteDefinitions = {
      "/": { projections: { bad: { reads: ["a"], projection: (a: any) => { if (a > 1) throw new Error("bad projection"); return a; } } } },
    };
    const { worker } = CreateShimWorker(undefined, routes);
    const store = new StoreAsync(worker);
    await store.Write(1, "a");
    await expect(store.Write(2, "a")).rejects.toThrow("bad projection");
    expect(store.Get("a")).to.eq(2);
    await store.Write(1, "a");
    expect(store.Get("$projection_bad")).to.eq(1);
    store.Destroy();
  });

  it("serves a port it's given, and stops serving it", async () => {
    const { tree, host } = CreateShimWorker();
    const [mine, theirs] = CreateShimChannel();
    const stop = host.Serve(theirs);
    const updates: ISnapshotUpdate[] = [];
    Subscribe(mine, { roots: ["a"], form: "snapshot" }, (update) => updates.push(update));
    await Settle();
    tree.WritePath("a", 1);
    tree.Commit();
    await Settle();
    expect(updates.map((u) => u.roots)).to.deep.eq([{ a: 1 }]);

    stop();
    expect(tree.SubscriberCount("a")).to.eq(0);
    tree.WritePath("a", 2);
    tree.Commit();
    await Settle();
    expect(updates.length).to.eq(1);
  });
});

describe("Subscribe and Once over a channel", () => {
  it("Subscribe delivers the first state and each commit; its stop function ends it", async () => {
    const { worker, tree } = CreateShimWorker();
    tree.WritePath("a", 1);
    tree.Commit();
    const updates: ISnapshotUpdate[] = [];
    const stop = Subscribe(worker, { roots: ["a"], form: "snapshot" }, (update) => updates.push(update));
    await Settle();
    tree.WritePath("a", 2);
    tree.Commit();
    await Settle();
    stop();
    await Settle();
    tree.WritePath("a", 3);
    tree.Commit();
    await Settle();
    expect(updates.map((u) => u.roots.a)).to.deep.eq([1, 2]);
    expect(tree.SubscriberCount("a")).to.eq(0);
  });

  it("Once resolves when every key has a value, keeping the keys that arrived earlier", async () => {
    const { worker, tree } = CreateShimWorker();
    tree.WritePath("revision", 4);
    tree.Commit();
    const once = Once(worker, ["whatif_4", "revision"]);
    await Settle();
    tree.WritePath("whatif_4", { result: 1 });
    tree.Commit();
    expect(await once).to.deep.eq({ whatif_4: { result: 1 }, revision: 4 });
    await Settle();
    expect(tree.SubscriberCount("whatif_4")).to.eq(0);
  });

  it("Once aborted rejects with the signal's reason and ends its subscription", async () => {
    const { worker, tree } = CreateShimWorker();
    const controller = new AbortController();
    const once = Once(worker, ["k"], { signal: controller.signal });
    await Settle();
    expect(tree.SubscriberCount("k")).to.eq(1);
    controller.abort("gone");
    await expect(once).rejects.toBe("gone");
    await Settle();
    expect(tree.SubscriberCount("k")).to.eq(0);
  });
});

describe("one worker's tree subscribing to another's", () => {
  it("roots written to a route aren't posted to the worker's own subscribers; a projection that reads them is", async () => {
    // The source worker, and a port into it for the derived worker
    const source = CreateShimWorker();
    const [toSource, sourceEnd] = CreateShimChannel();
    source.host.Serve(sourceEnd);

    // The derived worker: its tree reads the source's list through a route
    const derived = CreateShimWorker(undefined, {
      "/": { projections: { count: { reads: ["/source/list"], projection: (list: any) => list?.length ?? 0 } } },
    });
    derived.tree.DeleteRoute("/source/");
    Subscribe(toSource, { roots: ["list"], form: "snapshot" }, (update) => {
      for (const key in update.roots) derived.tree.WritePath(`/source/${key}`, update.roots[key]);
      for (const key of update.deleted) derived.tree.WritePath(`/source/${key}`, undefined);
      derived.tree.RunProjections();
      derived.tree.Commit();
    });

    const store = new StoreAsync(derived.worker);
    source.tree.WritePath("list", [1, 2]);
    source.tree.Commit();
    await Settle(8);
    expect(store.Get("$projection_count")).to.eq(2);

    source.tree.PushPath("list", [3]);
    source.tree.Commit();
    await Settle(8);
    expect(store.Get("$projection_count")).to.eq(3);
    expect(store.Has("source")).to.eq(false);
    expect(store.Has("list")).to.eq(false);
    store.Destroy();
  });
});

describe("DiffTreePublisher hosted on a plain channel", () => {
  it("HostPublisher accepts any IChannel", () => {
    const [a] = CreateShimChannel();
    const host = HostPublisher(new DiffTreePublisher(), a);
    host.Stop();
  });
});
