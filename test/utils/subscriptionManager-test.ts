import { describe, it, expect } from "vitest";
import { SubscriptionManager } from "../../src/Utils/subscriptionManager";

// The subscription manager on its own: matching, groups and release counts, with no tree.

describe("SubscriptionManager", () => {
  it("matches exact keys and patterns, each with the keys it matched", () => {
    const subs = new SubscriptionManager<string>();
    const a = subs.Subscribe(["index", "task_*"], "a");
    const b = subs.Subscribe(["revision"], "b");
    subs.Subscribe(["other"], "c");

    expect(subs.Matching(["index", "task_1", "task_2", "revision", "list"])).to.deep.eq([
      { id: a, subscription: "a", keys: ["index", "task_1", "task_2"] },
      { id: b, subscription: "b", keys: ["revision"] },
    ]);
  });

  it("matches every key with no filter, and none with an empty one", () => {
    const subs = new SubscriptionManager<string>();
    const all = subs.Subscribe(undefined, "all");
    const none = subs.Subscribe([], "none");
    expect(subs.Matching(["x", "y"]).map((m) => m.id)).to.deep.eq([all]);
    expect(subs.MatchesAll(all)).to.eq(true);
    expect(subs.MatchesAll(none)).to.eq(false);
    expect(subs.MatchingKeys(none, ["x"])).to.deep.eq([]);
  });

  it("MatchingKeys filters keys for one subscription, in the order given", () => {
    const subs = new SubscriptionManager<string>();
    const id = subs.Subscribe(["b", "a_*"], "s");
    expect(subs.MatchingKeys(id, ["a_2", "c", "b", "a_1"])).to.deep.eq(["a_2", "b", "a_1"]);
    expect(subs.MatchingKeys(999, ["b"])).to.deep.eq([]);
  });

  it("Unsubscribe ends a subscription once", () => {
    const subs = new SubscriptionManager<string>();
    const id = subs.Subscribe(["x"], "s");
    expect(subs.Has(id)).to.eq(true);
    expect(subs.Get(id)).to.eq("s");
    expect(subs.Unsubscribe(id)).to.eq(true);
    expect(subs.Unsubscribe(id)).to.eq(false);
    expect(subs.Has(id)).to.eq(false);
    expect(subs.Matching(["x"])).to.deep.eq([]);
  });

  it("Disconnect ends every subscription in a group, and only those", () => {
    const subs = new SubscriptionManager<string>();
    const port = {};
    subs.Subscribe(["x"], "a", { group: port });
    subs.Subscribe(["y"], "b", { group: port });
    const kept = subs.Subscribe(["x"], "c", { group: {} });
    subs.Disconnect(port);
    expect(subs.Matching(["x", "y"]).map((m) => m.id)).to.deep.eq([kept]);
    subs.Disconnect(port);
  });

  it("counts exact subscriptions only, falling on unsubscribe and on Disconnect", () => {
    const subs = new SubscriptionManager<string>();
    const group = {};
    const a = subs.Subscribe(["k"], "a");
    subs.Subscribe(["k"], "b", { group });
    subs.Subscribe(["k*"], "wild");
    expect(subs.SubscriberCount("k")).to.eq(2);
    subs.Unsubscribe(a);
    expect(subs.SubscriberCount("k")).to.eq(1);
    subs.Disconnect(group);
    expect(subs.SubscriberCount("k")).to.eq(0);
  });

  it("OnReleased fires when a key's last exact subscription ends", () => {
    const subs = new SubscriptionManager<string>();
    const released: string[] = [];
    subs.OnReleased("whatif_*", (key) => released.push(key));
    const a = subs.Subscribe(["whatif_1"], "a");
    const b = subs.Subscribe(["whatif_1", "whatif_2"], "b");
    subs.Unsubscribe(a);
    expect(released).to.deep.eq([]);
    subs.Unsubscribe(b);
    expect(released).to.deep.eq(["whatif_1", "whatif_2"]);
  });

  it("OnReleased doesn't fire for a pattern subscription's keys, or for keys it doesn't match", () => {
    const subs = new SubscriptionManager<string>();
    const released: string[] = [];
    subs.OnReleased("whatif_*", (key) => released.push(key));
    subs.OnReleased("index", (key) => released.push(key));
    subs.Unsubscribe(subs.Subscribe(["whatif_*"], "wild"));
    subs.Unsubscribe(subs.Subscribe(["revision"], "other"));
    expect(released).to.deep.eq([]);
    subs.Unsubscribe(subs.Subscribe(["index"], "exact"));
    expect(released).to.deep.eq(["index"]);
  });

  it("OnReleased fires on Disconnect, and stops once removed", () => {
    const subs = new SubscriptionManager<string>();
    const released: string[] = [];
    const stop = subs.OnReleased("k", (key) => released.push(key));
    const group = {};
    subs.Subscribe(["k"], "a", { group });
    subs.Disconnect(group);
    expect(released).to.deep.eq(["k"]);
    stop();
    subs.Unsubscribe(subs.Subscribe(["k"], "b"));
    expect(released).to.deep.eq(["k"]);
  });
});
