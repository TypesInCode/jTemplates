import { describe, it, expect } from "vitest";
import { ReadStore } from "../../src/Store/Store/store";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { EmitterEvent } from "../../src/Utils/emitter";
import type { JsonDiffResult } from "../../src/Utils/json";

// A store watches a root: its watcher hears when the root gains its first reactive reader and
// loses its last (store-demand-roots.md). ReadStore with the deliveries a subclass applies.

class WatchingStore extends ReadStore {
  constructor(watch: string[], callback: (rootKey: string, event: EmitterEvent) => void) {
    super(undefined, [], watch, callback);
  }

  Deliver(results: JsonDiffResult) {
    this.UpdateRootMap(results);
  }
}

/**
 * A store watching `patterns`, and the events its callback heard, by root key. A key the
 * patterns name exactly starts with no events.
 */
function watching(...patterns: string[]) {
  const events: Record<string, string[]> = Object.fromEntries(
    patterns.filter((p) => !p.endsWith("*")).map((key): [string, string[]] => [key, []]),
  );
  const store = new WatchingStore(patterns, (key, event) => (events[key] ??= []).push(EmitterEvent[event]));
  return { store, events };
}

/** A reactive reader of `fn`, read once */
function reader<T>(fn: () => T) {
  const scope = ObservableScope.Create(fn);
  ObservableScope.Value(scope);
  return {
    value: () => ObservableScope.Value(scope),
    destroy: () => ObservableScope.Destroy(scope),
  };
}

describe("ReadStore watch", () => {
  it("reports a root's first reactive reader, and its last one destroyed", () => {
    const { store, events } = watching("a");
    const r = reader(() => store.Get("a"));
    expect(events.a).to.deep.eq(["SUBSCRIBED"]);
    r.destroy();
    expect(events.a).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("reports once for several readers, when the last one goes", () => {
    const { store, events } = watching("a");
    const r1 = reader(() => store.Get("a"));
    const r2 = reader(() => store.Get("a"));
    r1.destroy();
    expect(events.a).to.deep.eq(["SUBSCRIBED"]);
    r2.destroy();
    expect(events.a).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("reports nothing for a read outside a scope", () => {
    const { store, events } = watching("a");
    store.Get("a");
    expect(events.a).to.deep.eq([]);
  });

  it("keeps a reader that reads on through a delivered write and a delete", () => {
    const { store, events } = watching("a");
    const r = reader(() => store.Get<number | undefined>("a"));
    store.Deliver([{ type: "write", path: ["a"], value: 1 }]);
    expect(r.value()).to.eq(1);
    store.Deliver([{ type: "delete", path: ["a"] }]);
    expect(r.value()).to.eq(undefined);
    store.Deliver([{ type: "write", path: ["a"], value: 2 }]);
    expect(r.value()).to.eq(2);
    expect(events.a).to.deep.eq(["SUBSCRIBED"]);
    r.destroy();
    expect(events.a).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("reports a reader that moves from one root to another without being destroyed", () => {
    const { store, events } = watching("a", "b");
    const selection = ObservableNode.Create({ key: "a" });
    const r = reader(() => store.Get(selection.key));
    expect(events).to.deep.eq({ a: ["SUBSCRIBED"], b: [] });
    selection.key = "b";
    r.value();
    expect(events).to.deep.eq({ a: ["SUBSCRIBED", "UNSUBSCRIBED"], b: ["SUBSCRIBED"] });
    r.destroy();
    expect(events.b).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("leaves roots it doesn't watch alone", () => {
    const { store, events } = watching("a");
    const r = reader(() => store.Get("b"));
    r.destroy();
    expect(events.a).to.deep.eq([]);
  });
});

describe("ReadStore watch patterns", () => {
  /** The roots read, one reader each, then destroyed: what the callback heard */
  function readAll(patterns: string[], keys: string[]) {
    const { store, events } = watching(...patterns);
    const readers = keys.map((key) => reader(() => store.Get(key)));
    readers.forEach((r) => r.destroy());
    return events;
  }

  it("watches an exact key, and not a key it's the start of", () => {
    expect(readAll(["a"], ["a", "ab", "b"])).to.deep.eq({ a: ["SUBSCRIBED", "UNSUBSCRIBED"] });
  });

  it("watches every key that starts with a pattern's prefix", () => {
    expect(readAll(["type:*"], ["type:Order", "type:", "types", "atype:Order"])).to.deep.eq({
      "type:Order": ["SUBSCRIBED", "UNSUBSCRIBED"],
      "type:": ["SUBSCRIBED", "UNSUBSCRIBED"],
    });
  });

  it("watches every key with a lone *", () => {
    expect(Object.keys(readAll(["*"], ["a", "$b", ""]))).to.have.members(["a", "$b", ""]);
  });

  it("matches keys literally: regular expression characters in a key or prefix match only themselves", () => {
    expect(readAll(["$projection_x", "a.b", "q?", "(g)*"], ["$projection_x", "a.b", "axb", "q", "q?", "(g)1", "g1"])).to.deep.eq({
      "$projection_x": ["SUBSCRIBED", "UNSUBSCRIBED"],
      "a.b": ["SUBSCRIBED", "UNSUBSCRIBED"],
      "q?": ["SUBSCRIBED", "UNSUBSCRIBED"],
      "(g)1": ["SUBSCRIBED", "UNSUBSCRIBED"],
    });
  });

  it("watches a root a delivery created before its first read", () => {
    const { store, events } = watching("a");
    store.Deliver([{ type: "write", path: ["a"], value: 1 }]);
    const r = reader(() => store.Get("a"));
    expect(r.value()).to.eq(1);
    r.destroy();
    expect(events.a).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("needs a callback when it watches anything", () => {
    expect(() => new WatchingStore(["a"], undefined as never)).to.throw();
  });
});

describe("StoreSync watch options", () => {
  /** A StoreSync watching `patterns`, and the events its callback heard, by root key */
  function syncWatching(...patterns: string[]) {
    const events: Record<string, string[]> = {};
    const store = new StoreSync(undefined, {
      watch: patterns,
      watchCallback: (key, event) => (events[key] ??= []).push(EmitterEvent[event]),
    });
    return { store, events };
  }

  it("reports a watched root's first reader and its last, a written root too", () => {
    const { store, events } = syncWatching("type:*");
    store.Write({ n: 1 }, "type:a");
    const r = reader(() => store.Get<{ n: number }>("type:a")?.n);
    expect(r.value()).to.eq(1);
    expect(events).to.deep.eq({ "type:a": ["SUBSCRIBED"] });
    store.Write({ n: 2 }, "type:a");
    expect(r.value()).to.eq(2);
    r.destroy();
    expect(events).to.deep.eq({ "type:a": ["SUBSCRIBED", "UNSUBSCRIBED"] });
  });

  it("reports nothing for roots it doesn't watch", () => {
    const { store, events } = syncWatching("type:*");
    store.Write(1, "counts");
    reader(() => store.Get("counts")).destroy();
    expect(events).to.deep.eq({});
  });

  it("needs a callback when it watches anything", () => {
    expect(() => new StoreSync(undefined, { watch: ["a"] })).to.throw();
  });
});

describe("ObservableNode.WatchProperty", () => {
  it("watches one property's readers, and stops when unwatched", () => {
    const node = ObservableNode.Create({ a: 1, b: 2 });
    const events: EmitterEvent[] = [];
    const watcher = (event: EmitterEvent) => events.push(event);
    ObservableNode.WatchProperty(node, "a", watcher);
    const rb = reader(() => node.b);
    const ra = reader(() => node.a);
    expect(events).to.deep.eq([EmitterEvent.SUBSCRIBED]);
    ObservableNode.UnwatchProperty(node, "a", watcher);
    ra.destroy();
    rb.destroy();
    expect(events).to.deep.eq([EmitterEvent.SUBSCRIBED]);
  });

  it("ignores an unwatch of a name only the prototype has", () => {
    const node = ObservableNode.Create({ a: 1 });
    expect(() => ObservableNode.UnwatchProperty(node as any, "toString", () => {})).not.to.throw();
  });

  it("throws for a value that isn't a node, and for an array", () => {
    expect(() => ObservableNode.WatchProperty({ a: 1 }, "a", () => {})).to.throw();
    const list = ObservableNode.Create([1, 2]);
    expect(() => ObservableNode.WatchProperty(list, 0, () => {})).to.throw();
  });
});
