import { describe, it, expect } from "vitest";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import type { IDiffPost, ISnapshotUpdate, IRouteDefinitions } from "../../src/Store/Diff";
import { ReadStore } from "../../src/Store/Store/store";
import { StoreSync } from "../../src/Store/Store/storeSync";

const keyFunc = (value: any) => value?.id;

/** `$projection_double` is `count` * 2 */
const routes: IRouteDefinitions = {
  "/": { projections: { double: { reads: ["count"], projection: (count: any) => (count ?? 0) * 2 } } },
};

/** A store fed only by the diff posts it's given */
class MirrorStore extends ReadStore {
  Apply(post: IDiffPost) {
    this.UpdateRootMap(post.diff);
  }
}

function Plain(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

describe("DiffTree commit state", () => {
  it("Committed reads a root as of the last commit, not as written since", () => {
    const tree = new DiffTree();
    tree.WritePath("a", { x: 1 });
    expect(tree.Committed("a")).to.eq(undefined);
    tree.Commit();
    const first = tree.Committed("a");
    expect(first).to.deep.eq({ x: 1 });

    tree.WritePath("a.x", 2);
    expect(tree.Committed("a")).to.eq(first);
    tree.Commit();
    expect(tree.Committed("a")).to.deep.eq({ x: 2 });
    expect(first).to.deep.eq({ x: 1 });
  });

  it("CommittedKeys lists the committed roots, entity roots included", () => {
    const tree = new DiffTree(keyFunc);
    tree.WritePath("list", [{ id: "task_1" }]);
    tree.WritePath("b", 1);
    expect(tree.CommittedKeys()).to.deep.eq([]);
    tree.Commit();
    expect(tree.CommittedKeys().sort()).to.deep.eq(["b", "list", "task_1"]);
  });

  it("DeleteRoot removes a root, and the next commit carries the delete", () => {
    const tree = new DiffTree();
    tree.WritePath("a", { x: 1 });
    tree.WritePath("b", 1);
    tree.Commit();

    tree.DeleteRoot("a");
    tree.DeleteRoot("missing");
    expect(tree.ReadPath("a")).to.eq(undefined);
    expect(tree.Commit()).to.deep.eq([{ type: "delete", path: ["a"] }]);
    expect(tree.CommittedKeys()).to.deep.eq(["b"]);
    expect(tree.Committed("a")).to.eq(undefined);
  });

  it("DeleteRoot reruns a projection that read the root", () => {
    const tree = new DiffTree(undefined, routes);
    tree.WritePath("count", 3);
    tree.RunProjections();
    tree.Commit();
    expect(tree.Committed("$projection_double")).to.eq(6);

    tree.DeleteRoot("count");
    tree.RunProjections();
    tree.Commit();
    expect(tree.Committed("$projection_double")).to.eq(0);
  });

  it("DeleteRoot rejects paths and projection outputs", () => {
    const tree = new DiffTree(undefined, routes);
    expect(() => tree.DeleteRoot("a.b")).to.throw(/only a root key/);
    expect(() => tree.DeleteRoot("/route/a")).to.throw(/only a root key/);
    expect(() => tree.DeleteRoot("$projection_double")).to.throw(/read-only/);
  });
});

describe("DiffTreePublisher", () => {
  describe("commits", () => {
    it("delivers each commit's diff to a subscriber, numbered", () => {
      const tree = new DiffTreePublisher();
      const posts: IDiffPost[] = [];
      tree.Subscribe({}, (post) => posts.push(post));

      tree.WritePath("a", 1);
      tree.Commit();
      tree.WritePath("a", 2);
      tree.Commit();
      expect(posts).to.deep.eq([
        { seq: 1, diff: [{ type: "write", path: ["a"], value: 1 }] },
        { seq: 2, diff: [{ type: "write", path: ["a"], value: 2 }] },
      ]);
    });

    it("delivers nothing, and keeps its number, for a commit with no changes", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("a", 1);
      tree.Commit();
      const posts: IDiffPost[] = [];
      tree.Subscribe({}, (post) => posts.push(post));

      tree.WritePath("a", 1);
      expect(tree.Commit()).to.deep.eq([]);
      expect(posts.length).to.eq(1);
      expect(tree.Seq).to.eq(1);
    });

    it("a commit without RunProjections delivers the roots and leaves projection outputs as they were", () => {
      const tree = new DiffTreePublisher(undefined, routes);
      const store = new MirrorStore();
      tree.Subscribe({}, (post) => store.Apply(post));
      tree.WritePath("count", 1);
      tree.RunProjections();
      tree.Commit();

      tree.WritePath("count", 5);
      tree.Commit();
      expect(store.Get("count")).to.eq(5);
      expect(store.Get("$projection_double")).to.eq(2);

      tree.RunProjections();
      tree.Commit();
      expect(store.Get("$projection_double")).to.eq(10);
    });

    it("two subscribers get the same commits; a filter limits one, its first state included", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("a", 1);
      tree.WritePath("b", 1);
      tree.Commit();

      const all: IDiffPost[] = [];
      const onlyA: IDiffPost[] = [];
      tree.Subscribe({}, (post) => all.push(post));
      tree.Subscribe({ roots: ["a"] }, (post) => onlyA.push(post));
      expect(onlyA[0].diff).to.deep.eq([{ type: "write", path: ["a"], value: 1 }]);
      expect(all[0].diff.map((d) => d.path[0]).sort()).to.deep.eq(["a", "b"]);

      tree.WritePath("a", 2);
      tree.WritePath("b", 2);
      tree.Commit();
      tree.WritePath("b", 3);
      tree.Commit();
      expect(all.length).to.eq(3);
      expect(all[1].diff.length).to.eq(2);
      expect(onlyA.length).to.eq(2);
      expect(onlyA[1].diff).to.deep.eq([{ type: "write", path: ["a"], value: 2 }]);
    });

    it("a pattern receives entity roots created after the subscription", () => {
      const tree = new DiffTreePublisher(keyFunc);
      const store = new MirrorStore(keyFunc);
      tree.Subscribe({ roots: ["list", "task_*"] }, (post) => store.Apply(post));

      tree.WritePath("list", [{ id: "task_1", v: 1 }]);
      tree.WritePath("other", 1);
      tree.Commit();
      tree.WritePath("task_1.v", 2);
      tree.Commit();

      expect(Plain(store.Get("list"))).to.deep.eq([{ id: "task_1", v: 2 }]);
      expect(store.Has("other")).to.eq(false);
    });

    it("a subscriber's error doesn't keep the commit from the others, and Commit throws it", () => {
      const tree = new DiffTreePublisher();
      const seen: number[] = [];
      tree.Subscribe({}, () => {
        throw new Error("first");
      });
      tree.Subscribe({}, (post) => seen.push(post.seq));
      tree.WritePath("a", 1);
      expect(() => tree.Commit()).to.throw("first");
      expect(seen).to.deep.eq([1]);
      expect(tree.Committed("a")).to.eq(1);
    });

    it("skips a subscriber ended by an earlier one's delivery", () => {
      const tree = new DiffTreePublisher();
      const seen: number[] = [];
      let stopSecond = () => {};
      tree.Subscribe({}, () => stopSecond());
      stopSecond = tree.Subscribe({}, (post) => seen.push(post.seq));
      tree.WritePath("a", 1);
      tree.Commit();
      expect(seen).to.deep.eq([]);
    });
  });

  describe("the first state", () => {
    it("a subscriber created after several commits starts from the committed state", () => {
      const tree = new DiffTreePublisher(keyFunc);
      tree.WritePath("list", [{ id: "task_1", v: 1 }]);
      tree.Commit();
      tree.WritePath("list", [{ id: "task_1", v: 2 }, { id: "task_2", v: 1 }]);
      tree.Commit();
      tree.WritePath("flag", true);
      tree.Commit();

      const store = new MirrorStore(keyFunc);
      const posts: IDiffPost[] = [];
      tree.Subscribe({}, (post) => {
        posts.push(post);
        store.Apply(post);
      });
      expect(posts.length).to.eq(1);
      expect(posts[0].seq).to.eq(3);
      expect(posts[0].diff.every((d) => d.type === "write" && d.path.length === 1)).to.eq(true);
      expect(Plain(store.Get("list"))).to.deep.eq([{ id: "task_1", v: 2 }, { id: "task_2", v: 1 }]);
      expect(store.Get("flag")).to.eq(true);
    });

    it("is the committed state while writes are pending, and the next commit applies on top, splices included", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("list", [1, 2, 3]);
      tree.Commit();
      tree.SplicePath("list", 0, 1, []);
      tree.PushPath("list", [4]);

      const store = new MirrorStore();
      tree.Subscribe({}, (post) => store.Apply(post));
      expect(Plain(store.Get("list"))).to.deep.eq([1, 2, 3]);

      tree.Commit();
      expect(Plain(store.Get("list"))).to.deep.eq([2, 3, 4]);
      expect(Plain(store.Get("list"))).to.deep.eq(tree.Committed("list"));
    });

    it("is a delivery like any other: one handler serves subscribers made before and after commits", () => {
      const tree = new DiffTreePublisher();
      const handle = (store: MirrorStore) => (post: IDiffPost) => store.Apply(post);
      const before = new MirrorStore();
      tree.Subscribe({}, handle(before));
      tree.WritePath("a", { x: 1 });
      tree.Commit();

      const after = new MirrorStore();
      tree.Subscribe({}, handle(after));
      tree.WritePath("a.y", 1);
      tree.Commit();

      expect(Plain(before.Get("a"))).to.deep.eq({ x: 1, y: 1 });
      expect(Plain(after.Get("a"))).to.deep.eq({ x: 1, y: 1 });
    });

    it("delivers nothing when no root matches", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("other", 1);
      tree.Commit();
      const posts: IDiffPost[] = [];
      tree.Subscribe({ roots: ["missing"] }, (post) => posts.push(post));
      expect(posts).to.deep.eq([]);
    });

    it("a first delivery that throws ends the subscription", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("k", 1);
      tree.Commit();
      const calls: IDiffPost[] = [];
      expect(() =>
        tree.Subscribe({ roots: ["k"] }, (post) => {
          calls.push(post);
          throw new Error("boom");
        }),
      ).to.throw("boom");
      tree.WritePath("k", 2);
      tree.Commit();
      expect(calls.length).to.eq(1);
      expect(tree.SubscriberCount("k")).to.eq(0);
    });
  });

  describe("the snapshot form", () => {
    it("first delivers every matching root, then only changed roots and deletions", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("index", { a: 1 });
      tree.WritePath("task_1", { v: 1 });
      tree.WritePath("other", 1);
      tree.Commit();

      const updates: ISnapshotUpdate[] = [];
      tree.Subscribe({ roots: ["index", "task_*"], form: "snapshot" }, (update) => updates.push(update));
      expect(updates[0]).to.deep.eq({ seq: 1, roots: { index: { a: 1 }, task_1: { v: 1 } }, deleted: [] });

      tree.WritePath("task_2", { v: 2 });
      tree.WritePath("other", 2);
      tree.Commit();
      tree.DeleteRoot("task_1");
      tree.Commit();
      tree.WritePath("other", 3);
      tree.Commit();
      expect(updates.slice(1)).to.deep.eq([
        { seq: 2, roots: { task_2: { v: 2 } }, deleted: [] },
        { seq: 3, roots: {}, deleted: ["task_1"] },
      ]);
    });

    it("delivers a root whole, the tree's committed value itself", () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("index", { a: { b: 1 }, c: 1 });
      tree.Commit();
      const updates: ISnapshotUpdate[] = [];
      tree.Subscribe({ roots: ["index"], form: "snapshot" }, (update) => updates.push(update));

      tree.WritePath("index.c", 2);
      tree.Commit();
      expect(updates[1].roots.index).to.deep.eq({ a: { b: 1 }, c: 2 });
      expect(updates[1].roots.index).to.eq(tree.Committed("index"));
    });

    it("a diff and a snapshot subscriber on one commit get the same changes", () => {
      const tree = new DiffTreePublisher(keyFunc);
      const store = new MirrorStore(keyFunc);
      const updates: ISnapshotUpdate[] = [];
      const posts: IDiffPost[] = [];
      tree.Subscribe({}, (post) => {
        posts.push(post);
        store.Apply(post);
      });
      tree.Subscribe({ form: "snapshot" }, (update) => updates.push(update));

      tree.WritePath("list", [{ id: "task_1", v: 1 }, { id: "task_2", v: 1 }]);
      tree.WritePath("gone", 1);
      tree.Commit();
      tree.WritePath("task_2.v", 5);
      tree.DeleteRoot("gone");
      tree.Commit();

      // Editing an entity commits only its own root; `list` refers to it by key
      expect(Object.keys(updates[1].roots)).to.deep.eq(["task_2"]);
      expect(updates[1].deleted).to.deep.eq(["gone"]);
      expect([...new Set(posts[1].diff.map((d) => d.path[0]))].sort()).to.deep.eq(["gone", "task_2"]);
      for (const key of tree.CommittedKeys())
        expect(Plain(store.Get(key))).to.deep.eq(Plain(tree.Committed(key)));
      expect(store.Get("gone")).to.eq(undefined);
    });
  });

  describe("Once", () => {
    it("resolves at once when its keys are committed", async () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("index", { a: 1 });
      tree.WritePath("revision", 4);
      tree.Commit();
      expect(await tree.Once(["index", "revision"])).to.deep.eq({ index: { a: 1 }, revision: 4 });
      expect(tree.SubscriberCount("index")).to.eq(0);
    });

    it("resolves from the delivery that adds the last key, with every key's value from that commit", async () => {
      const tree = new DiffTreePublisher();
      tree.WritePath("revision", 4);
      tree.Commit();
      let resolved = false;
      const once = tree.Once(["whatif_4", "revision"]).then((values) => {
        resolved = true;
        return values;
      });

      tree.WritePath("other", 1);
      tree.Commit();
      await Promise.resolve();
      expect(resolved).to.eq(false);

      tree.WritePath("whatif_4", { result: 1 });
      tree.Commit();
      expect(await once).to.deep.eq({ whatif_4: { result: 1 }, revision: 4 });
      expect(tree.SubscriberCount("whatif_4")).to.eq(0);
    });

    it("aborting it rejects with the signal's reason and ends its subscription", async () => {
      const tree = new DiffTreePublisher();
      const controller = new AbortController();
      const once = tree.Once(["whatif_1"], { signal: controller.signal });
      expect(tree.SubscriberCount("whatif_1")).to.eq(1);
      controller.abort("gone");
      await expect(once).rejects.toBe("gone");
      expect(tree.SubscriberCount("whatif_1")).to.eq(0);
    });

    it("rejects an aborted signal and patterns", async () => {
      const tree = new DiffTreePublisher();
      await expect(tree.Once(["k"], { signal: AbortSignal.abort("no") })).rejects.toBe("no");
      await expect(tree.Once(["task_*"])).rejects.toThrow(/exact keys/);
      expect(tree.SubscriberCount("k")).to.eq(0);
    });

    it("releases its keys when it resolves", async () => {
      const tree = new DiffTreePublisher();
      const released: string[] = [];
      tree.OnReleased("whatif_*", (key) => released.push(key));
      const once = tree.Once(["whatif_1"]);
      tree.WritePath("whatif_1", 1);
      tree.Commit();
      await once;
      expect(released).to.deep.eq(["whatif_1"]);
    });
  });

  describe("groups and release", () => {
    it("Disconnect ends a group's subscriptions and releases their keys", () => {
      const tree = new DiffTreePublisher();
      const released: string[] = [];
      tree.OnReleased("k", (key) => released.push(key));
      const port = {};
      const posts: IDiffPost[] = [];
      tree.Subscribe({ roots: ["k"], group: port }, (post) => posts.push(post));
      tree.Disconnect(port);
      tree.WritePath("k", 1);
      tree.Commit();
      expect(posts.length).to.eq(0);
      expect(released).to.deep.eq(["k"]);
    });
  });

  describe("re-entry", () => {
    it("a subscriber that writes to or commits the delivering tree throws", () => {
      const tree = new DiffTreePublisher(undefined, routes);
      const errors: string[] = [];
      tree.Subscribe({}, () => {
        for (const write of [() => tree.WritePath("b", 1), () => tree.Commit(), () => tree.RunProjections(), () => tree.DeleteRoot("a")])
          try {
            write();
          } catch (err: any) {
            errors.push(err.message);
          }
      });
      tree.WritePath("a", 1);
      tree.Commit();
      expect(errors.length).to.eq(4);
      expect(errors[0]).to.match(/can't write to or commit the tree delivering to it/);
      expect(tree.ReadPath("b")).to.eq(undefined);
    });

    it("a subscriber may read the delivering tree and subscribe to it", () => {
      const tree = new DiffTreePublisher();
      const late: IDiffPost[] = [];
      let subscribed = false;
      tree.Subscribe({}, () => {
        if (subscribed) return;
        subscribed = true;
        expect(tree.ReadPath("a")).to.eq(1);
        tree.Subscribe({}, (p) => late.push(p));
      });
      tree.WritePath("a", 1);
      tree.Commit();
      expect(late).to.deep.eq([{ seq: 1, diff: [{ type: "write", path: ["a"], value: 1 }] }]);
    });
  });

  describe("two trees on one thread", () => {
    function Chain() {
      const source = new DiffTreePublisher(keyFunc);
      const derived = new DiffTreePublisher(undefined, {
        "/": { projections: { count: { reads: ["/source/list"], projection: (list: any) => list?.length ?? 0 } } },
      });
      const store = new MirrorStore();
      derived.Subscribe({}, (post) => store.Apply(post));
      source.Subscribe({ roots: ["list"], form: "snapshot" }, (update) => {
        for (const key in update.roots) derived.WritePath(`/source/${key}`, update.roots[key]);
        for (const key of update.deleted) derived.WritePath(`/source/${key}`, undefined);
        derived.RunProjections();
        derived.Commit();
      });
      return { source, derived, store };
    }

    it("the derived tree receives the source's commits and delivers its own inside the source's Commit", () => {
      const { source, derived, store } = Chain();
      source.WritePath("list", [{ id: "t1" }, { id: "t2" }]);
      source.Commit();
      expect(store.Get("$projection_count")).to.eq(2);

      source.PushPath("list", [{ id: "t3" }]);
      source.Commit();
      expect(store.Get("$projection_count")).to.eq(3);
      expect(store.Has("source")).to.eq(false);
      expect(Plain(derived.ReadPath("/source/list"))).to.deep.eq([{ id: "t1" }, { id: "t2" }, { id: "t3" }]);
    });

    it("a write back to the source from the chain throws", () => {
      const { source, derived } = Chain();
      derived.Subscribe({}, () => source.WritePath("loop", 1));
      source.WritePath("list", [{ id: "t1" }]);
      expect(() => source.Commit()).to.throw(/can't write to or commit the tree delivering to it/);
      expect(source.ReadPath("loop")).to.eq(undefined);
    });

    it("source.Once resolves from the delivery that adds the last key", async () => {
      const { source } = Chain();
      const once = source.Once(["list", "revision"]);
      source.WritePath("list", []);
      source.Commit();
      source.WritePath("revision", 1);
      source.Commit();
      expect(await once).to.deep.eq({ list: [], revision: 1 });
    });
  });
});

describe("StoreSync over its publisher", () => {
  it("applies a commit made on its publisher directly", () => {
    const store = new StoreSync();
    store.Publisher.WritePath("flag", true);
    store.Publisher.Commit();
    expect(store.Get("flag")).to.eq(true);
  });

  it("another subscriber to its publisher gets the store's writes", () => {
    const store = new StoreSync(undefined, routes);
    const roots: ISnapshotUpdate[] = [];
    store.Publisher.Subscribe({ roots: ["$projection_double"], form: "snapshot" }, (update) => roots.push(update));
    store.Write(4, "count");
    expect(roots[0].roots).to.deep.eq({ $projection_double: 8 });
  });

  it("a subscriber that writes to the store during a delivery throws", () => {
    const store = new StoreSync();
    store.Publisher.Subscribe({}, () => store.Write(1, "other"));
    expect(() => store.Write(1, "a")).to.throw(/can't write to or commit/);
    expect(store.Get("a")).to.eq(1);
  });
});
