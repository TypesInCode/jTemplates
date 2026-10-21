import { describe, it, expect } from "vitest";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { DiffSync } from "../../src/Store/Diff/diffSync";
import { DiffTreeWriter } from "../../src/Store/Diff/diffTreeWriter";
import { SequentialProjector } from "../../src/Store/Diff/sequentialProjector";
import { TrackedProjector } from "../../src/Store/Diff/trackedProjector";
import { DIFF_TREE_EVENT, DiffTreeRoutes, ROUTE_SUMMARY } from "../../src/Store/Diff";
import { PushStore } from "../../src/Store/Store/pushStore";
import { JsonType } from "../../src/Utils/json";

// The cases in docs/proposals/diff-tree-routes.md.

/**
 * Plain entities are keyed by `_id`. A channel's metadata (anything with a `channelId`) is
 * keyed into the channel route, and a user (anything with a `userId`) into the user route.
 */
function KeyFunc(val: any) {
  if (JsonType(val) !== "object") return undefined;
  if (val.channelId !== undefined) return `/channel/${val.channelId}/metadata`;
  if (val.userId !== undefined) return `/user/${val.userId}/profile`;
  return val._id;
}

/** A projector whose summary is the instance's values at `keys`, once all of them exist. */
function Summary(...keys: string[]) {
  return new SequentialProjector({
    [ROUTE_SUMMARY]: {
      reads: keys,
      projection: (_keys, ...values) => Object.fromEntries(keys.map((key, x) => [key, values[x]])),
    },
  });
}

/**
 * A channel route summarizing to `{ metadata }`; `created` collects the channelId of each
 * instance as it's created.
 */
function Channels(created: string[] = []): DiffTreeRoutes {
  return {
    "/channel/{channelId}": {
      projector: ({ channelId }) => (created.push(channelId), Summary("metadata")),
    },
  };
}

/**
 * A channel route whose instances summarize to `{ count }`, from a count projection.
 * `summarized` counts summaries by channelId.
 */
function CountingChannels(summarized: { [channelId: string]: number } = {}): DiffTreeRoutes {
  return {
    "/channel/{channelId}": {
      projector: ({ channelId }) => new SequentialProjector({
        count: { reads: ["messages"], projection: (_keys, messages: any[]) => messages.length },
        [ROUTE_SUMMARY]: {
          reads: ["$projection_count"],
          projection: (_keys, count: number) => {
            summarized[channelId] = (summarized[channelId] ?? 0) + 1;
            return { count };
          },
        },
      }),
    },
  };
}

/** A route write's root changes, as a caller collects them: from the next RunProjections. */
function Commit(tree: DiffTree) {
  return tree.RunProjections();
}

const Paths = (diff: { path: (string | number)[] }[]) => diff.map((d) => d.path.join("."));

describe("DiffTree routes: construction", () => {
  it("rejects patterns sharing a first fixed segment, including overlapping ones", () => {
    expect(() => new DiffTree(undefined, undefined, {
      "/channel/{id}": {},
      "/channel/{color}/{size}": {},
    })).toThrow(/share the output key "channel"/);
  });

  it("rejects a pattern starting with a param", () => {
    expect(() => new DiffTree(undefined, undefined, { "/{id}/x": {} })).toThrow(/fixed segment/);
  });

  it("rejects a first fixed segment starting with $projection_", () => {
    expect(() => new DiffTree(undefined, undefined, { "/$projection_a/{id}": {} })).toThrow(/\$projection_/);
  });

  it("rejects a pattern without a leading / and a repeated param", () => {
    expect(() => new DiffTree(undefined, undefined, { "channel/{id}": {} })).toThrow();
    expect(() => new DiffTree(undefined, undefined, { "/a/{id}/{id}": {} })).toThrow(/repeated/);
  });
});

describe("DiffTree routes: route paths", () => {
  it("creates an instance on the first write and reuses it after", () => {
    const created: string[] = [];
    const tree = new DiffTree(KeyFunc, undefined, Channels(created));
    tree.DiffPath("/channel/0001/metadata", { name: "general" });
    tree.DiffPath("/channel/0001/metadata.name", "random");

    expect(created).toEqual(["0001"]);
    expect(tree.GetPath("/channel/0001/metadata.name")).toBe("random");
  });

  it("creates a multi-param instance once per config, with every param by name", () => {
    const configs: any[] = [];
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{color}/size/{size}": { projector: (config) => (configs.push(config), undefined as any) },
    });
    tree.DiffPath("/channel/red/size/large/a", 1);
    tree.DiffPath("/channel/red/size/large/b", 2);
    tree.DiffPath("/channel/red/size/small/a", 3);

    expect(configs).toEqual([{ color: "red", size: "large" }, { color: "red", size: "small" }]);
  });

  it("rejects a route path without a root key, or matching no pattern, without creating an instance", () => {
    const created: string[] = [];
    const tree = new DiffTree(KeyFunc, undefined, Channels(created));

    expect(() => tree.DiffPath("/channel/0001", {})).toThrow();
    expect(() => tree.DiffPath("/channel/0001/", {})).toThrow();
    expect(() => tree.DiffPath("/other/0001/x", {})).toThrow();
    expect(created).toEqual([]);
  });

  it("holds instance state in the root state under a non-enumerable symbol, one level per segment", () => {
    const tree: any = new DiffTree(undefined, undefined, {
      "/channel/{color}/{size}": { routes: { "/user/{userId}": {} } },
    });
    tree.DiffPath("/channel/red/large/user/u1/name", "A");

    expect(Object.keys(tree.rootState)).toEqual([]);
    const [routes] = Object.getOwnPropertySymbols(tree.rootState);
    const channel = tree.rootState[routes].channel[routes].red[routes].large;
    expect(channel[routes].user[routes].u1).toEqual({ name: "A" });
    expect(JSON.stringify(tree.rootState)).toBe("{}");
  });

  it("returns the instance's diff with instance-relative paths, and [] for no change", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    const diff = tree.DiffPath("/channel/0001/metadata", { name: "general" });

    expect(diff).toEqual([{ path: ["metadata"], value: { name: "general" } }]);
    expect(tree.DiffPath("/channel/0001/metadata", { name: "general" })).toEqual([]);
  });

  it("reads, snapshots and patches through a route path", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("/channel/0001/metadata", { name: "general", topic: "a" });
    tree.PatchPath("/channel/0001/metadata", { topic: "b" });

    expect(tree.GetPath("/channel/0001/metadata")).toEqual({ name: "general", topic: "b" });
    expect(tree.Snapshot("/channel/0001/metadata")).toEqual({ name: "general", topic: "b" });
    expect(tree.GetPath("/channel/0002/metadata")).toBeUndefined();
  });

  it("pushes and splices through a route path", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("/channel/0001/messages", [1]);
    tree.PushPath("/channel/0001/messages", [2]);
    const result = tree.SplicePath("/channel/0001/messages", 0, 1, [0]);

    expect(result.spliceResult).toEqual([1]);
    expect(tree.GetPath("/channel/0001/messages")).toEqual([0, 2]);
  });
});

describe("DiffTree routes: summaries", () => {
  it("writes summaries under the output key, keyed by param", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("/channel/0001/metadata", { name: "general" });
    tree.DiffPath("/channel/0002/metadata", { name: "random" });
    Commit(tree);

    expect(tree.GetPath("channel")).toEqual({
      "0001": { metadata: { name: "general" } },
      "0002": { metadata: { name: "random" } },
    });
  });

  it("nests a multi-param route's summaries in param order", () => {
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{color}/{size}": { projector: () => Summary("a") },
    });
    tree.DiffPath("/channel/red/large/a", 1);
    tree.DiffPath("/channel/red/small/a", 2);
    Commit(tree);
    tree.DiffPath("/channel/red/large/a", 3);

    expect(Paths(Commit(tree))).toEqual(["channel.red.large.a"]);
    expect(tree.GetPath("channel")).toEqual({ red: { large: { a: 3 }, small: { a: 2 } } });
  });

  it("writes a param-less route's summary directly under its output key", () => {
    const tree = new DiffTree(undefined, undefined, { "/users": { projector: () => Summary("count") } });
    tree.DiffPath("/users/count", 1);
    Commit(tree);

    expect(tree.GetPath("users")).toEqual({ count: 1 });
  });

  it("changes only the written instance's entries, at the changed field", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("/channel/0001/metadata", { name: "general", topic: "a" });
    tree.DiffPath("/channel/0002/metadata", { name: "random" });
    Commit(tree);

    tree.DiffPath("/channel/0001/metadata.topic", "b");
    expect(Commit(tree)).toEqual([{ path: ["channel", "0001", "metadata", "topic"], value: "b" }]);
  });

  it("doesn't re-run the summary, or produce a root diff, when its reads don't change", () => {
    const summarized: { [channelId: string]: number } = {};
    const tree = new DiffTree(KeyFunc, undefined, CountingChannels(summarized));
    tree.DiffPath("/channel/0001/messages", [1]);
    Commit(tree);
    tree.DiffPath("/channel/0001/messages", [2]);

    expect(Commit(tree)).toEqual([]);
    expect(summarized).toEqual({ "0001": 1 });
  });

  it("writes nothing to the parent for a route without a summary projection", () => {
    const tree: any = new DiffTree(undefined, undefined, { "/channel/{id}": {} });
    tree.DiffPath("/channel/0001/a", 1);

    expect(Commit(tree)).toEqual([]);
    expect(Object.keys(tree.rootState)).toEqual([]);
    expect(tree.GetPath("/channel/0001/a")).toBe(1);
  });

  it("keeps a param value containing . as one level under the output key", () => {
    const tree = new DiffTree(undefined, undefined, { "/channel/{id}": { projector: () => Summary("a") } });
    tree.DiffPath("/channel/a.b/a", 1);

    expect(Paths(Commit(tree))).toEqual(["channel"]);
    expect(tree.GetPath("channel")).toEqual({ "a.b": { a: 1 } });
  });

  it("treats the summary id as an ordinary projection in a tree that isn't a route instance", () => {
    const tree = new DiffTree(undefined, Summary("a"));
    tree.DiffPath("a", 1);
    tree.RunProjections();

    expect(tree.GetPath(`$projection_${ROUTE_SUMMARY}`)).toEqual({ a: 1 });
  });

  it("re-runs a summary only when its reads change", () => {
    const summarized: { [channelId: string]: number } = {};
    const tree = new DiffTree(KeyFunc, undefined, CountingChannels(summarized));
    tree.DiffPath("/channel/0001/messages", [1]);
    tree.DiffPath("/channel/0002/messages", [1]);
    Commit(tree);
    tree.DiffPath("/channel/0001/messages", [1, 2]);
    Commit(tree);
    Commit(tree);

    expect(summarized).toEqual({ "0001": 2, "0002": 1 });
  });

  it("runs instance projections before the summary, and root projections after it", () => {
    const tree = new DiffTree(KeyFunc, new SequentialProjector({
      total: {
        reads: ["channel"],
        projection: (_keys, channels: any) =>
          Object.values(channels).reduce((sum: number, c: any) => sum + c.count, 0),
      },
    }), CountingChannels());
    tree.DiffPath("/channel/0001/messages", [1, 2]);
    tree.DiffPath("/channel/0002/messages", [1]);
    Commit(tree);

    expect(tree.GetPath("channel.0001")).toEqual({ count: 2 });
    expect(tree.GetPath("$projection_total")).toBe(3);
  });

  it("rejects a root write to an output key", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    expect(() => tree.DiffPath("channel", {})).toThrow(/output key/);
    expect(() => tree.DiffPath("channel.0001", {})).toThrow(/output key/);
  });

  it("rejects a keyed entity whose key is an output key", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    expect(() => tree.DiffPath("list", [{ _id: "channel" }])).toThrow(/output key/);
  });
});

describe("DiffTree routes: keyed entities routed by keyFunc", () => {
  const channels = [{ channelId: "0001", name: "general" }, { channelId: "0002", name: "random" }];

  it("routes entities with route keys to their instances, storing nothing under a route key", () => {
    const tree: any = new DiffTree(KeyFunc, undefined, Channels());
    const diff = tree.DiffPath("channels", channels);

    expect(tree.GetPath("/channel/0001/metadata")).toEqual(channels[0]);
    expect(tree.GetPath("/channel/0002/metadata")).toEqual(channels[1]);
    expect(Object.keys(tree.rootState)).toEqual(["channels"]);
    expect(Paths(diff)).toEqual(["channels"]);
  });

  it("routes entities through PushPath and SplicePath", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("channels", []);
    tree.PushPath("channels", [channels[0]]);
    tree.SplicePath("channels", 0, 0, [channels[1]]);

    expect(tree.GetPath("/channel/0001/metadata.name")).toBe("general");
    expect(tree.GetPath("/channel/0002/metadata.name")).toBe("random");
  });

  it("reads a routed entity through its instance", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("channels", channels);
    tree.DiffPath("/channel/0001/metadata.name", "renamed");

    expect(tree.GetPath("channels.0.name")).toBe("renamed");
    expect(tree.Snapshot("channels")[0].name).toBe("renamed");
  });

  it("writes into a routed entity through its instance", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("channels", channels);
    tree.DiffPath("channels.0.name", "renamed");

    expect(tree.GetPath("/channel/0001/metadata.name")).toBe("renamed");
  });

  it("invalidates the parent's snapshot and re-runs its projections on a route write", () => {
    let runs = 0;
    const tree = new DiffTree(KeyFunc, new SequentialProjector({
      names: { reads: ["channels"], projection: (_keys, list: any[]) => (runs++, list.map((c) => c.name)) },
    }), Channels());
    tree.DiffPath("channels", channels);
    tree.RunProjections();
    const before = tree.Snapshot("channels");
    tree.DiffPath("/channel/0001/metadata.name", "renamed");
    tree.RunProjections();

    expect(tree.Snapshot("channels")).not.toBe(before);
    expect(tree.GetPath("$projection_names")).toEqual(["renamed", "random"]);
    expect(runs).toBe(2);
  });

  it("resolves route keys against the flattening tree's own routes", () => {
    const tree = new DiffTree(KeyFunc, undefined, {
      "/users": { routes: { "/user/{userId}": {} } },
    });
    tree.DiffPath("/users/all", [{ userId: "u1", name: "A" }]);

    expect(tree.GetPath("/users/user/u1/profile")).toEqual({ userId: "u1", name: "A" });
    expect(tree.GetPath("/users/all.0.name")).toBe("A");
  });

  it("treats a route key matching none of the tree's routes as plain data", () => {
    const tree: any = new DiffTree(KeyFunc);
    tree.DiffPath("users", [{ userId: "u1", name: "A" }]);
    tree.DiffPath("users.0.name", "B");

    expect(Object.keys(tree.rootState)).toEqual(["users"]);
    expect(tree.GetPath("users.0.name")).toBe("B");
  });

  it("doesn't route entities in a summary", () => {
    const created: string[] = [];
    const tree = new DiffTree(KeyFunc, undefined, {
      ...Channels(created),
      "/digest": { projector: () => Summary("latest") },
    });
    // The digest's summary holds a channel entity: it stays embedded, no instance is made
    tree.DiffPath("/digest/latest", { channelId: "0009", name: "x" });
    Commit(tree);

    expect(created).toEqual([]);
    expect(tree.GetPath("digest.latest.name")).toBe("x");
    expect(Commit(tree)).toEqual([]);
  });

  it("resolves an instance's plain keys in the instance, and the root's after leaving it", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    // Two different entities share the plain key "u1": one inside the channel, one at the root
    tree.DiffPath("items", [
      { channelId: "0001", owner: { _id: "u1", name: "channel's" } },
      { _id: "u1", name: "root's" },
    ]);
    tree.DiffPath("/channel/0001/u1.name", "channel's renamed");

    const items = tree.Snapshot("items");
    expect(items[0].owner.name).toBe("channel's renamed");
    expect(items[1].name).toBe("root's");
    expect(tree.GetPath("items.0.owner.name")).toBe("channel's renamed");
    expect(tree.GetPath("u1.name")).toBe("root's");
  });

  it("snapshots a routed entity holding a grandchild-routed entity the same from either tree", () => {
    // The channel instance routes users to its own /user route
    const tree = new DiffTree(KeyFunc, undefined, {
      "/channel/{channelId}": { routes: { "/user/{userId}": {} } },
    });
    tree.DiffPath("channels", [{ channelId: "0001", owner: { userId: "u1", name: "A" } }]);
    tree.DiffPath("/channel/0001/user/u1/profile.name", "B");

    // The root's snapshot reaches the metadata first, resolving its user with the channel's routes
    const fromRoot = tree.Snapshot("channels")[0];
    const fromChannel = tree.Snapshot("/channel/0001/metadata");
    expect(fromRoot).toEqual({ channelId: "0001", owner: { userId: "u1", name: "B" } });
    expect(fromChannel).toBe(fromRoot);
  });
});

describe("DiffTree routes: forwarding to a store", () => {
  it("DiffSync returns only root changes for a route write", () => {
    const sync = new DiffSync(KeyFunc, undefined, Channels());
    const diff = sync.DiffPath("/channel/0001/metadata", { name: "general" });

    expect(diff).toEqual([{ path: ["channel"], value: { "0001": { metadata: { name: "general" } } } }]);
  });

  it("DiffTreeWriter posts a route write's summary, not its own diff, in the batch's message", () => {
    const target = new EventTarget();
    const store = new PushStore(target, KeyFunc);
    const posted: any[] = [];
    const writer = new DiffTreeWriter({
      postMessage(message) {
        posted.push(message);
        target.dispatchEvent(new MessageEvent("message", { data: message }));
      },
    }, KeyFunc, undefined, Channels());

    writer.DiffPath("channels", [{ channelId: "0001", name: "general" }]);
    writer.DiffPath("/channel/0001/metadata.name", "renamed");
    writer.Commit();

    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe(DIFF_TREE_EVENT);
    const paths = posted[0].data.flatMap((d: any) => Paths(d.result));
    expect(paths.some((p: string) => p.startsWith("/") || p.startsWith("metadata"))).toBe(false);
    // The store reads the embedded copy of a routed entity without throwing, and the
    // instance's change through the summary
    expect(store.Get<any>("channels")[0].name).toBe("general");
    expect(store.Get<any>("channel")["0001"].metadata.name).toBe("renamed");
    store.Destroy();
  });
});

describe("DiffTree routes: DeleteRoute", () => {
  /** The family's internals, for checking what a delete leaves behind. */
  function Internals(tree: any) {
    const context = tree.context;
    const [routes] = Object.getOwnPropertySymbols(tree.rootState);
    return { context, routes, trees: context.family.trees as Map<string, unknown> };
  }

  it("deletes an instance with its state, its entries and its nested instances; a second delete returns false", () => {
    const tree: any = new DiffTree(undefined, undefined, {
      "/channel/{id}": { projector: () => Summary("a"), routes: { "/thread/{threadId}": {} } },
    });
    tree.DiffPath("/channel/0001/a", 1);
    tree.DiffPath("/channel/0001/thread/5/body", "x");
    tree.DiffPath("/channel/0002/a", 2);
    const { context, routes, trees } = Internals(tree);

    expect(tree.DeleteRoute("/channel/0001")).toBe(true);
    expect(Object.keys(tree.rootState[routes].channel[routes])).toEqual(["0002"]);
    expect(context.routes.get("channel").instances.map((i: any) => i.base)).toEqual(["/channel/0002"]);
    expect([...trees.keys()]).toEqual(["", "/channel/0002"]);
    expect(tree.GetPath("/channel/0001/a")).toBeUndefined();
    expect(tree.DeleteRoute("/channel/0001")).toBe(false);
  });

  it("deletes a nested instance through the instances that exist", () => {
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{id}": { routes: { "/thread/{threadId}": {} } },
    });
    tree.DiffPath("/channel/0001/thread/5/body", "x");

    expect(tree.DeleteRoute("/channel/0001/thread/5")).toBe(true);
    expect(tree.GetPath("/channel/0001/thread/5/body")).toBeUndefined();
    expect(tree.DeleteRoute("/channel/0002/thread/5")).toBe(false);
    expect(tree.GetPath("/channel/0002/thread/5/body")).toBeUndefined();
  });

  it("throws for a partial path, a path into an instance's state, and an unmatched path", () => {
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{color}/{size}": {},
      "/objectTypes/{type}": {},
    });
    tree.DiffPath("/objectTypes/ORDER/a", 1);

    expect(() => tree.DeleteRoute("/channel/red")).toThrow();
    expect(() => tree.DeleteRoute("/objectTypes/ORDER/rel:ObjectType")).toThrow();
    expect(() => tree.DeleteRoute("/objectTypes/MISSING/rel:ObjectType")).toThrow();
    expect(() => tree.DeleteRoute("/objectTypes/ORDER/a.b")).toThrow();
    expect(() => tree.DeleteRoute("/other/1")).toThrow();
    expect(() => tree.DeleteRoute("objectTypes")).toThrow();
  });

  it("removes the slot in the next RunProjections, pruning levels it leaves empty", () => {
    const tree: any = new DiffTree(undefined, undefined, {
      "/channel/{color}/{size}": { projector: () => Summary("a") },
    });
    tree.DiffPath("/channel/red/large/a", 1);
    tree.DiffPath("/channel/blue/small/a", 2);
    Commit(tree);
    const { routes } = Internals(tree);

    tree.DeleteRoute("/channel/red/large");
    expect(Commit(tree)).toEqual([{ path: ["channel"], value: { blue: { small: { a: 2 } } } }]);
    expect(tree.GetPath("channel")).toEqual({ blue: { small: { a: 2 } } });
    expect(Object.keys(tree.rootState[routes].channel[routes])).toEqual(["blue"]);

    tree.DeleteRoute("/channel/blue/small");
    expect(Commit(tree)).toEqual([{ path: ["channel"], value: {} }]);
    expect(tree.GetPath("channel")).toEqual({});
  });

  it("replaces only the container holding a slot that has siblings", () => {
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{color}/{size}": { projector: () => Summary("a") },
    });
    tree.DiffPath("/channel/red/large/a", 1);
    tree.DiffPath("/channel/red/small/a", 2);
    Commit(tree);
    tree.DeleteRoute("/channel/red/large");

    expect(Commit(tree)).toEqual([{ path: ["channel", "red"], value: { small: { a: 2 } } }]);
  });

  it("sets a route without params' output key to undefined", () => {
    const tree: any = new DiffTree(undefined, undefined, { "/users": { projector: () => Summary("count") } });
    tree.DiffPath("/users/count", 1);
    Commit(tree);
    tree.DeleteRoute("/users");

    expect(Commit(tree)).toEqual([{ path: ["users"], value: undefined }]);
    expect(Object.hasOwn(tree.rootState, "users")).toBe(true);
    expect(tree.GetPath("users")).toBeUndefined();
  });

  it("re-runs projections reading a deleted route without params' output key", () => {
    const tree = new DiffTree(undefined, new SequentialProjector({
      users: { reads: ["users"], projection: (_keys, users: any) => users?.count ?? "none" },
    }), { "/users": { projector: () => Summary("count") } });
    tree.DiffPath("/users/count", 1);
    Commit(tree);
    expect(tree.GetPath("$projection_users")).toBe(1);

    tree.DeleteRoute("/users");
    Commit(tree);
    expect(tree.GetPath("$projection_users")).toBe("none");
  });

  it("re-runs a tracked projection reading a deleted route without params' output key", () => {
    const tree = new DiffTree(undefined, new TrackedProjector({
      users: { reads: ["users"], projection: (read) => read<any>("users")?.count ?? "none" },
    }), { "/users": { projector: () => Summary("count") } });
    tree.DiffPath("/users/count", 1);
    Commit(tree);
    expect(tree.GetPath("$projection_users")).toBe(1);

    tree.DeleteRoute("/users");
    Commit(tree);
    expect(tree.GetPath("$projection_users")).toBe("none");
  });

  it("re-runs a parent instance's summary reading a deleted nested route's output key", () => {
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{id}": {
        projector: () => new SequentialProjector({
          [ROUTE_SUMMARY]: { reads: ["settings"], projection: (_keys, settings: any) => ({ theme: settings?.theme ?? "none" }) },
        }),
        routes: { "/settings": { projector: () => Summary("theme") } },
      },
    });
    tree.DiffPath("/channel/0001/settings/theme", "dark");
    Commit(tree);
    expect(tree.GetPath("channel.0001.theme")).toBe("dark");

    tree.DeleteRoute("/channel/0001/settings");
    Commit(tree);
    expect(tree.GetPath("channel.0001.theme")).toBe("none");
  });

  it("keeps the tree and the Store in step when a nested route without params is deleted and recreated", () => {
    const target = new EventTarget();
    const store = new PushStore(target);
    const writer = new DiffTreeWriter({
      postMessage(message) { target.dispatchEvent(new MessageEvent("message", { data: message })); },
    }, undefined, undefined, {
      "/c/{id}": {
        projector: () => Summary("th"),
        routes: { "/th": { projector: () => Summary("body") } },
      },
    });
    writer.DiffPath("/c/1/th/body", "x");
    writer.Commit();
    expect(store.Get<any>("c")).toEqual({ "1": { th: { body: "x" } } });

    writer.DeleteRoute("/c/1/th");
    writer.Commit();
    expect(writer.GetPath("c.1.th")).toBeUndefined();
    expect(store.Get<any>("c")["1"].th).toBeUndefined();

    writer.DiffPath("/c/1/th/body", "y");
    writer.Commit();
    expect(writer.GetPath("c")).toEqual({ "1": { th: { body: "y" } } });
    expect(store.Get<any>("c")).toEqual({ "1": { th: { body: "y" } } });
    store.Destroy();
  });

  it("produces no diff for an instance without a summary", () => {
    const tree = new DiffTree(undefined, undefined, { "/channel/{id}": {} });
    tree.DiffPath("/channel/0001/a", 1);
    Commit(tree);
    tree.DeleteRoute("/channel/0001");

    expect(Commit(tree)).toEqual([]);
  });

  it("delete then write in one batch writes a whole new summary from a fresh projector", () => {
    let projectors = 0;
    const tree = new DiffTree(undefined, undefined, {
      "/channel/{id}": { projector: () => (projectors++, Summary("a", "b")) },
    });
    tree.DiffPath("/channel/0001/a", 1);
    tree.DiffPath("/channel/0001/b", 1);
    Commit(tree);

    tree.DeleteRoute("/channel/0001");
    tree.DiffPath("/channel/0001/a", 1);
    tree.DiffPath("/channel/0001/b", 2);

    expect(Commit(tree)).toEqual([
      { path: ["channel"], value: {} },
      { path: ["channel", "0001"], value: { a: 1, b: 2 } },
    ]);
    expect(projectors).toBe(2);
  });

  it("write then delete in one batch leaves no slot", () => {
    const tree = new DiffTree(undefined, undefined, { "/channel/{id}": { projector: () => Summary("a") } });
    tree.DiffPath("/channel/0001/a", 1);
    tree.DeleteRoute("/channel/0001");

    expect(Commit(tree)).toEqual([]);
    expect(tree.GetPath("channel")).toBeUndefined();
  });

  it("keeps summaries written before a projector throws for the next run", () => {
    let fail = true;
    const tree = new DiffTree(undefined, new SequentialProjector({
      check: { reads: ["channel"], projection: () => { if (fail) throw new Error("fail"); return 1; } },
    }), { "/channel/{id}": { projector: () => Summary("a") } });
    tree.DiffPath("/channel/0001/a", 1);

    expect(() => tree.RunProjections()).toThrow("fail");
    fail = false;
    expect(Paths(Commit(tree))).toEqual(["channel", "$projection_check"]);
  });

  it("re-runs a root projection reading the output key", () => {
    const tree = new DiffTree(undefined, new SequentialProjector({
      total: { reads: ["channel"], projection: (_keys, channels: any) => Object.keys(channels).length },
    }), { "/channel/{id}": { projector: () => Summary("a") } });
    tree.DiffPath("/channel/0001/a", 1);
    tree.DiffPath("/channel/0002/a", 1);
    Commit(tree);
    tree.DeleteRoute("/channel/0001");
    Commit(tree);

    expect(tree.GetPath("$projection_total")).toBe(1);
  });

  it("rebuilds a parent snapshot embedding a routed entity from the embedded copy", () => {
    const tree = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("channels", [{ channelId: "0001", name: "general" }]);
    tree.DiffPath("/channel/0001/metadata.name", "renamed");
    expect(tree.Snapshot("channels")[0].name).toBe("renamed");

    tree.DeleteRoute("/channel/0001");
    expect(tree.Snapshot("channels")[0].name).toBe("general");
    expect(tree.GetPath("channels.0.name")).toBe("general");
  });

  it("rejects a write into a routed entity whose instance was deleted, creating nothing", () => {
    const tree: any = new DiffTree(KeyFunc, undefined, Channels());
    tree.DiffPath("channels", [{ channelId: "0001", name: "general" }]);
    tree.DeleteRoute("/channel/0001");

    expect(() => tree.DiffPath("channels.0.name", "renamed")).toThrow(/write the whole entity/);
    expect(() => tree.PatchPath("channels.0.name", "renamed")).toThrow(/write the whole entity/);
    expect([...tree.context.family.trees.keys()]).toEqual([""]);
    expect(tree.GetPath("channels.0.name")).toBe("general");

    // Writing the whole entity recreates the instance from the value written
    tree.DiffPath("channels.0", { channelId: "0001", name: "renamed" });
    expect(tree.GetPath("/channel/0001/metadata.name")).toBe("renamed");
  });

  it("throws when called while projections run", () => {
    let error: unknown;
    const tree: DiffTree = new DiffTree(undefined, new SequentialProjector({
      p: { reads: ["x"], projection: () => { try { tree.DeleteRoute("/channel/0001"); } catch (e) { error = e; } return 1; } },
    }), { "/channel/{id}": {} });
    tree.DiffPath("/channel/0001/a", 1);
    tree.DiffPath("x", 1);
    tree.RunProjections();

    expect(String(error)).toMatch(/while projections run/);
    expect(tree.GetPath("/channel/0001/a")).toBe(1);
  });

  it("DiffSync returns the slot's removal", () => {
    const sync = new DiffSync(undefined, undefined, { "/channel/{id}": { projector: () => Summary("a") } });
    sync.DiffPath("/channel/0001/a", 1);

    expect(sync.DeleteRoute("/channel/0001")).toEqual([{ path: ["channel"], value: {} }]);
  });

  it("DiffTreeWriter posts the slot's removal in the Commit() message with the batch's root writes", () => {
    const target = new EventTarget();
    const store = new PushStore(target);
    const posted: any[] = [];
    const writer = new DiffTreeWriter({
      postMessage(message) {
        posted.push(message);
        target.dispatchEvent(new MessageEvent("message", { data: message }));
      },
    }, undefined, undefined, { "/channel/{id}": { projector: () => Summary("a") } });
    writer.DiffPath("/channel/0001/a", 1);
    writer.Commit();

    writer.DiffPath("x", 1);
    expect(writer.DeleteRoute("/channel/0001")).toBe(true);
    writer.Commit();

    expect(posted).toHaveLength(2);
    expect(posted[1].data.flatMap((d: any) => Paths(d.result))).toEqual(["x", "channel"]);
    expect(store.Get<any>("channel")).toEqual({});
    store.Destroy();
  });
});
