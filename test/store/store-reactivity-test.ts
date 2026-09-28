import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

// Reactivity gaps found while moving an app's state onto the store. Each test states the
// expected behaviour; see the comment on each describe block for the failure mode.

function KeyFunc(val: any) {
  return val._id;
}

/** The message of what `fn` throws (an Error or a thrown string), or null if it doesn't throw. */
function thrown(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** A scope that counts its evaluations. */
function track<T>(fn: () => T) {
  let runs = 0;
  const scope = ObservableScope.Create(() => {
    runs++;
    return fn();
  });
  ObservableScope.Value(scope);
  return {
    value: () => ObservableScope.Value(scope),
    runs: () => runs,
    destroy: () => ObservableScope.Destroy(scope),
  };
}

// Adding a key to an object calls ObservableNode.Update(object, newKey), but object
// wrappers have no object-level scope and the ownKeys/has traps register no dependency.
// Readers that enumerate an object (Object.keys, `in`, Clone, toJSON) never wake when a
// key is added. Reading the new key by name does work.
describe("Store reactivity: keys added to an object", () => {
  it("wakes an Object.keys reader when Patch adds a key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ records: { a: 1 } }, "root");
    const keys = track(() => Object.keys(sync.Get<any>("root").records).join(","));
    expect(keys.value()).to.eq("a");

    sync.Patch("root", { records: { b: 2 } });

    expect(keys.value()).to.eq("a,b");
    keys.destroy();
  });

  it("wakes an Object.keys reader when a dotted-path Write adds a key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ records: {} }, "root");
    const keys = track(() => Object.keys(sync.Get<any>("root").records).join(","));
    expect(keys.value()).to.eq("");

    sync.Write({ value: 1 }, "root.records.a");

    expect(keys.value()).to.eq("a");
    keys.destroy();
  });

  it("wakes an `in` reader when a key is added", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ records: {} }, "root");
    const has = track(() => "a" in sync.Get<any>("root").records);
    expect(has.value()).to.eq(false);

    sync.Patch("root", { records: { a: 1 } });

    expect(has.value()).to.eq(true);
    has.destroy();
  });

  it("wakes a deep Clone reader when a nested key is added", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ sheets: { t1: { widths: { name: 100 } } } }, "view");
    const plain = track(() => ObservableNode.Clone(sync.Get<any>("view")));
    expect(plain.value()).to.deep.eq({ sheets: { t1: { widths: { name: 100 } } } });

    sync.Patch("view", { sheets: { t1: { widths: { status: 80 } } } });

    expect(plain.value()).to.deep.eq({ sheets: { t1: { widths: { name: 100, status: 80 } } } });
    plain.destroy();
  });

  it("wakes an Object.keys reader of a root when Write adds a key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ a: 1 }, "root");
    const keys = track(() => Object.keys(sync.Get<any>("root")).join(","));
    expect(keys.value()).to.eq("a");

    sync.Write({ a: 1, b: 2 }, "root");

    expect(keys.value()).to.eq("a,b");
    keys.destroy();
  });

  // Passes today (the root-replacement branch of ApplyDiff); a guard for the fix.
  it("wakes an Object.keys reader of a root when Write removes a key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ a: 1, b: 2 }, "root");
    const keys = track(() => Object.keys(sync.Get<any>("root")).join(","));
    expect(keys.value()).to.eq("a,b");

    sync.Write({ a: 1 }, "root");

    expect(keys.value()).to.eq("a");
    keys.destroy();
  });

  it("wakes an ObservableNode Object.keys reader when Apply adds a property", () => {
    const node = ObservableNode.Create<any>({ records: { a: 1 } });
    const keys = track(() => Object.keys(node.records).join(","));
    expect(keys.value()).to.eq("a");

    ObservableNode.Apply(node, { records: { a: 1, b: 2 } });

    expect(keys.value()).to.eq("a,b");
    keys.destroy();
  });
});

// When a write drops a field from a keyed entity, the diff replaces the entity's root
// entry whole (a path of length 1). Readers that reached the entity through a parent's
// alias registered on the old object's properties and are not notified; readers that
// call Get(key) directly are.
describe("Store reactivity: keyed entity replaced whole", () => {
  it("wakes a reader through the parent when the entity loses a field", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ child: { _id: "c1", name: "A", extra: 1 } }, "root");
    const name = track(() => sync.Get<any>("root").child.name);
    expect(name.value()).to.eq("A");

    sync.Write({ _id: "c1", name: "B" });

    expect(sync.Get<any>("c1").name).to.eq("B");
    expect(name.value()).to.eq("B");
    name.destroy();
  });

  it("wakes a reader through the parent when a union-shaped entity changes kind", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ selection: { _id: "selection", kind: "node", nodeKey: "n1" } }, "view");
    const kind = track(() => sync.Get<any>("view").selection.kind);
    expect(kind.value()).to.eq("node");

    sync.Write({ _id: "selection", kind: "none" });

    expect(kind.value()).to.eq("none");
    kind.destroy();
  });

  it("wakes a reader through a parent array when an element entity loses a field", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ items: [{ _id: "i1", name: "A", note: "x" }] }, "root");
    const name = track(() => sync.Get<any>("root").items[0].name);
    expect(name.value()).to.eq("A");

    sync.Write({ _id: "i1", name: "B" });

    expect(name.value()).to.eq("B");
    name.destroy();
  });

  // Passes today: the parent's own property is rewritten too. A guard for the fix.
  it("wakes a reader through the parent when a parent Write replaces a nested entity", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ child: { _id: "c1", name: "A", extra: 1 } }, "root");
    const name = track(() => sync.Get<any>("root").child.name);

    sync.Write({ child: { _id: "c1", name: "B" } }, "root");

    expect(name.value()).to.eq("B");
    name.destroy();
  });

  it("keeps a proxy returned by Get(id, default) live after the first Write", () => {
    const sync = new StoreSync(KeyFunc);
    const held = sync.Get<any>("late", { a: 1 });

    sync.Write({ a: 2 }, "late");

    expect(sync.Get<any>("late").a).to.eq(2);
    expect(held.a).to.eq(2);
  });

  it("Scope - keeps a proxy returned by Get(id, default) live after the first Write", () => {
    const sync = new StoreSync(KeyFunc);
    const scope = ObservableScope.Create(() => sync.Get<any>("late", { a: 1 }));

    sync.Write({ a: 2 }, "late");

    expect(sync.Get<any>("late").a).to.eq(2);
    expect(ObservableScope.Value(scope).a).to.eq(2);
  });
});

// StoreSync.Patch merges into ObservableNode.Unwrap(value), whose nested keyed entities
// are the parent's original copies (updates go to the entities' own root entries). The
// merged value then writes those stale copies back over the current entities.
// StoreAsync.Patch merges into value.toJSON(), which resolves aliases, and is correct.
describe("StoreSync.Patch with nested keyed entities", () => {
  it("keeps a nested entity's current value when patching another field of the parent", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ mode: "a", child: { _id: "c1", name: "A" } }, "root");
    sync.Write({ _id: "c1", name: "B" });
    expect(sync.Get<any>("c1").name).to.eq("B");

    sync.Patch("root", { mode: "b" });

    expect(sync.Get<any>("root").mode).to.eq("b");
    expect(sync.Get<any>("c1").name).to.eq("B");
    expect(sync.Get<any>("root").child.name).to.eq("B");
  });

  it("does not bring back a field the entity has lost", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ mode: "a", selection: { _id: "selection", kind: "node", nodeKey: "n1" } }, "view");
    sync.Write({ _id: "selection", kind: "none" });

    sync.Patch("view", { mode: "b" });

    expect(ObservableNode.Unwrap(sync.Get<any>("selection"))).to.deep.eq({ _id: "selection", kind: "none" });
  });
});

// Guards for the fixes above: keeping enumeration, alias and Patch behaviour correct
// must not cost per-field granularity or nested-entity patching.
describe("Store reactivity: granularity and nested entities", () => {
  it("does not wake a field reader when another, never-read field is patched", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ a: 1, b: 1 }, "root");
    const a = track(() => sync.Get<any>("root").a);

    sync.Patch("root", { b: 2 });

    expect(a.value()).to.eq(1);
    expect(a.runs()).to.eq(1);
    a.destroy();
  });

  it("does not wake a field reader when another, never-read field is written by path", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ a: 1, sel: { kind: "none" } }, "root");
    const a = track(() => sync.Get<any>("root").a);

    sync.Write({ kind: "node", nodeKey: "n1" }, "root.sel");

    expect(a.value()).to.eq(1);
    expect(a.runs()).to.eq(1);
    a.destroy();
  });

  it("does not wake a field reader when a key is added to the object", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ a: 1 }, "root");
    const a = track(() => sync.Get<any>("root").a);

    sync.Patch("root", { c: 3 });

    expect(a.value()).to.eq(1);
    expect(a.runs()).to.eq(1);
    a.destroy();
  });

  it("does not wake a reader through the parent when an unrelated field of the parent is patched", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ child: { _id: "c1", name: "A" }, other: 1 }, "root");
    const name = track(() => sync.Get<any>("root").child.name);

    sync.Patch("root", { other: 2 });

    expect(name.value()).to.eq("A");
    expect(name.runs()).to.eq(1);
    name.destroy();
  });

  it("does not wake a direct Get reader when another scope resolves the alias", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ child: { _id: "c1", name: "A" } }, "root");
    const direct = track(() => sync.Get<any>("c1").name);
    const viaParent = track(() => sync.Get<any>("root").child.name);

    expect(viaParent.value()).to.eq("A");
    expect(direct.value()).to.eq("A");
    expect(direct.runs()).to.eq(1);
    direct.destroy();
    viaParent.destroy();
  });

  it("rejects a Patch through the parent into a nested keyed entity, naming its key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ child: { _id: "c1", name: "A" } }, "root");
    const name = track(() => sync.Get<any>("root").child.name);

    const error = thrown(() => sync.Patch("root", { child: { name: "C" } }));

    // The entity must be patched by its own key: sync.Patch("c1", { name: "C" }).
    expect(error).to.match(/c1/);
    expect(sync.Get<any>("c1").name).to.eq("A");
    expect(name.value()).to.eq("A");
    name.destroy();
  });

  it("rejects a Patch that adds a nested keyed entity, naming its key", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ items: {} }, "root");

    const error = thrown(() => sync.Patch("root", { items: { i1: { _id: "i1", name: "A" } } }));

    expect(error).to.match(/i1/);
    expect(sync.Get<any>("i1")).to.eq(undefined);
    expect(Object.keys(sync.Get<any>("root").items)).to.deep.eq([]);
  });

  it("wakes an Object.keys reader when a key that was already read by name is added", () => {
    const sync = new StoreSync(KeyFunc);
    sync.Write({ records: {} }, "root");
    // Reading the missing key first creates its property scope.
    const one = track(() => sync.Get<any>("root").records.a ?? null);
    const keys = track(() => Object.keys(sync.Get<any>("root").records).join(","));

    sync.Patch("root", { records: { a: 1 } });

    expect(one.value()).to.eq(1);
    expect(keys.value()).to.eq("a");
    one.destroy();
    keys.destroy();
  });
});
