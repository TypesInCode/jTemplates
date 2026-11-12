import { describe, it, expect } from "vitest";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { Opaque } from "../../src/Store/Tree/opaque";
import { JsonWrite } from "../../src/Utils/json";

/** A value large enough to be worth keeping whole: nested objects and arrays */
function drawing(label = "a") {
  return {
    label,
    nodes: [{ id: "n1", rect: { x: 0, y: 0 } }, { id: "n2", rect: { x: 10, y: 0 } }],
    edges: [["n1", "n2"]],
  };
}

/** Whether a value is an observable node's proxy */
function isNode(value: any) {
  return ObservableNode.Snapshot(value) !== undefined;
}

/** A scope over `read`, counting how often it runs */
function counted<T>(read: () => T) {
  const state = { runs: 0 };
  const scope = ObservableScope.Create(() => {
    state.runs++;
    return read();
  });
  return { scope, state };
}

describe("Opaque in ObservableNode", () => {
  describe("reading", () => {
    it("reads an object property holding an Opaque as the raw value", () => {
      const raw = drawing();
      const node = ObservableNode.Create({ view: new Opaque(raw) }, false);
      expect(node.view).to.eq(raw);
    });

    it("doesn't proxy the raw value or anything inside it", () => {
      const raw = drawing();
      const node: any = ObservableNode.Create({ view: new Opaque(raw) }, false);
      expect(isNode(node.view)).to.eq(false);
      expect(isNode(node.view.nodes)).to.eq(false);
      expect(node.view.nodes[0]).to.eq(raw.nodes[0]);
      expect(node.view.nodes[0].rect).to.eq(raw.nodes[0].rect);
    });

    it("reads the same reference on every read", () => {
      const node = ObservableNode.Create({ view: new Opaque(drawing()) }, false);
      expect(node.view).to.eq(node.view);
    });

    it("reads an array element holding an Opaque as the raw value", () => {
      const a = drawing("a");
      const b = drawing("b");
      const node = ObservableNode.Create({ list: [new Opaque(a), new Opaque(b)] }, false);
      expect(node.list[0]).to.eq(a);
      expect(node.list[1]).to.eq(b);
      expect(isNode(node.list[0])).to.eq(false);
    });

    it("iterates an array of Opaques as raw values", () => {
      const a = drawing("a");
      const b = drawing("b");
      const node = ObservableNode.Create({ list: [new Opaque(a), new Opaque(b)] }, false);
      expect([...node.list]).to.deep.eq([a, b]);
      expect([...node.list][0]).to.eq(a);
    });

    it("passes raw values to array callbacks", () => {
      const a = drawing("a");
      const b = drawing("b");
      const node = ObservableNode.Create({ list: [new Opaque(a), new Opaque(b)] }, false);
      expect(node.list.map((v: any) => v)[0]).to.eq(a);
      expect(node.list.find((v: any) => v.label === "b")).to.eq(b);
      expect(node.list.slice(1)[0]).to.eq(b);
    });

    it("leaves primitives and plain siblings as they were", () => {
      const node = ObservableNode.Create({ view: new Opaque(drawing()), plain: { a: 1 }, n: 2 }, false);
      expect(isNode(node.plain)).to.eq(true);
      expect(node.plain.a).to.eq(1);
      expect(node.n).to.eq(2);
    });

    it("holds a primitive in an Opaque as the primitive", () => {
      const node = ObservableNode.Create({ text: new Opaque("json") }, false);
      expect(node.text).to.eq("json");
    });
  });

  describe("reactivity", () => {
    it("re-runs a reader when the Opaque is replaced", () => {
      const first = drawing("first");
      const second = drawing("second");
      const node = ObservableNode.Create({ view: new Opaque(first) }, false);
      const { scope, state } = counted(() => node.view);
      expect(ObservableScope.Value(scope)).to.eq(first);

      ObservableNode.ApplyDiff(node, [{ type: "write", path: ["view"], value: new Opaque(second) }]);
      expect(ObservableScope.Value(scope)).to.eq(second);
      expect(state.runs).to.eq(2);
      ObservableScope.Destroy(scope);
    });

    it("doesn't notify on a change inside the raw value", () => {
      const raw = drawing();
      const node: any = ObservableNode.Create({ view: new Opaque(raw) }, false);
      const { scope, state } = counted(() => node.view.label);
      expect(ObservableScope.Value(scope)).to.eq("a");

      raw.label = "changed";
      expect(ObservableScope.Value(scope)).to.eq("a");
      expect(state.runs).to.eq(1);
      ObservableScope.Destroy(scope);
    });

    it("doesn't re-run a reader of a sibling when the Opaque is replaced", () => {
      const node = ObservableNode.Create({ view: new Opaque(drawing()), other: "x" }, false);
      const { scope, state } = counted(() => node.other);
      ObservableScope.Value(scope);

      ObservableNode.ApplyDiff(node, [{ type: "write", path: ["view"], value: new Opaque(drawing("b")) }]);
      ObservableScope.Value(scope);
      expect(state.runs).to.eq(1);
      ObservableScope.Destroy(scope);
    });
  });

  describe("writing", () => {
    it("keeps an Opaque assigned through the proxy opaque", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ view: any }>({ view: null });
      node.view = new Opaque(raw);
      expect(node.view).to.eq(raw);
      expect(isNode(node.view)).to.eq(false);
    });

    it("notifies a reader when an Opaque is assigned through the proxy", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ view: any }>({ view: null });
      const { scope } = counted(() => node.view);
      expect(ObservableScope.Value(scope)).to.eq(null);

      node.view = new Opaque(raw);
      expect(ObservableScope.Value(scope)).to.eq(raw);
      ObservableScope.Destroy(scope);
    });

    it("keeps an Opaque nested in the value given to Create", () => {
      const raw = drawing();
      const node = ObservableNode.Create({ view: new Opaque(raw) });
      const view = node.view;
      expect(view).to.eq(raw);
      expect(isNode(node.view)).to.eq(false);
    });

    it("keeps an Opaque pushed onto an array opaque", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ list: any[] }>({ list: [] });
      node.list.push(new Opaque(raw));
      expect(node.list[0]).to.eq(raw);
      expect(isNode(node.list[0])).to.eq(false);
    });

    it("keeps the existing Opaques of an array opaque through a mutating method", () => {
      const a = drawing("a");
      const node = ObservableNode.Create({ list: [new Opaque(a)] as any[] }, false);
      node.list.push("plain");
      const list_zero = node.list[0];
      expect(list_zero).to.eq(a);
      expect(isNode(node.list[0])).to.eq(false);
    });

    it("keeps an Opaque spliced into an array opaque", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ list: any[] }>({ list: ["x", "y"] });
      node.list.splice(1, 0, new Opaque(raw));
      expect(node.list[1]).to.eq(raw);
      expect(node.list[2]).to.eq("y");
    });

    it("keeps an Opaque unshifted onto an array opaque", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ list: any[] }>({ list: ["x"] });
      node.list.unshift(new Opaque(raw));
      expect(node.list[0]).to.eq(raw);
      expect(node.list[1]).to.eq("x");
    });

    it("replaces an Opaque with a plain value written over it", () => {
      const node = ObservableNode.Create({ view: new Opaque(drawing()) as any }, false);
      ObservableNode.ApplyDiff(node, [{ type: "write", path: ["view"], value: { a: 1 } }]);
      expect(isNode(node.view)).to.eq(true);
      expect(node.view.a).to.eq(1);
    });
  });

  describe("mutating array methods", () => {
    function list() {
      const a = drawing("a");
      const b = drawing("b");
      const c = drawing("c");
      const node = ObservableNode.Create({ list: [new Opaque(b), new Opaque(a), new Opaque(c)] as any[] }, false);
      return { a, b, c, node };
    }

    it("pop and shift return the raw value and keep the rest opaque", () => {
      const { a, b, c, node } = list();
      expect(node.list.pop()).to.eq(c);
      expect(node.list.shift()).to.eq(b);
      expect(node.list.length).to.eq(1);
      expect(node.list[0]).to.eq(a);
    });

    it("splice returns the removed raw values", () => {
      const { a, b, c, node } = list();
      expect(node.list.splice(0, 2)).to.deep.eq([b, a]);
      expect(node.list.splice(0, 2)[0]).to.eq(c);
      expect(node.list.length).to.eq(0);
    });

    it("splice without a delete count deletes to the end", () => {
      const { b, node } = list();
      node.list.splice(1);
      expect(node.list.length).to.eq(1);
      expect(node.list[0]).to.eq(b);
    });

    it("sort compares raw values and keeps every element opaque", () => {
      const { a, b, c, node } = list();
      const compared: any[] = [];
      node.list.sort((x: any, y: any) => {
        compared.push(x, y);
        return x.label < y.label ? -1 : x.label > y.label ? 1 : 0;
      });
      expect(compared.every((v) => v === a || v === b || v === c)).to.eq(true);
      expect([node.list[0], node.list[1], node.list[2]]).to.deep.eq([a, b, c]);
      expect(node.list[0]).to.eq(a);
      expect(isNode(node.list[0])).to.eq(false);
    });

    it("sort with no compare function orders by the read values as strings", () => {
      const node = ObservableNode.Create({ list: [new Opaque("b"), "c", new Opaque("a")] as any[] }, false);
      node.list.sort();
      expect([...node.list]).to.deep.eq(["a", "b", "c"]);
    });

    it("reverse keeps every element opaque", () => {
      const { a, b, c, node } = list();
      node.list.reverse();
      expect(node.list[0]).to.eq(c);
      expect(node.list[1]).to.eq(a);
      expect(node.list[2]).to.eq(b);
    });

    it("sort and reverse return the array's node", () => {
      const { node } = list();
      expect(node.list.reverse()).to.eq(node.list);
      expect(node.list.sort()).to.eq(node.list);
    });

    it("re-runs a reader of the array after a mutating method", () => {
      const { a, node } = list();
      const { scope } = counted(() => node.list.map((v: any) => v.label).join());
      expect(ObservableScope.Value(scope)).to.eq("b,a,c");
      node.list.shift();
      expect(ObservableScope.Value(scope)).to.eq("a,c");
      expect(node.list[0]).to.eq(a);
      ObservableScope.Destroy(scope);
    });
  });

  describe("ApplyDiff and Apply", () => {
    it("writes an Opaque whole, without copying the raw value", () => {
      const raw = drawing();
      const node = ObservableNode.Create<{ view: any }>({ view: null });
      const diff: JsonWrite[] = [{ type: "write", path: ["view"], value: new Opaque(raw) }];
      ObservableNode.ApplyDiff(node, diff);
      expect(node.view).to.eq(raw);
    });

    it("Apply with the same Opaque changes nothing", () => {
      const box = new Opaque(drawing());
      const node = ObservableNode.Create({ view: box }, false);
      const { scope, state } = counted(() => node.view);
      ObservableScope.Value(scope);

      ObservableNode.Apply(node, { view: box });
      ObservableScope.Value(scope);
      expect(state.runs).to.eq(1);
      ObservableScope.Destroy(scope);
    });

    it("Apply with a new Opaque replaces it whole, even when its contents are equal", () => {
      const next = drawing();
      const node = ObservableNode.Create({ view: new Opaque(drawing()) }, false);
      const { scope, state } = counted(() => node.view);
      ObservableScope.Value(scope);

      ObservableNode.Apply(node, { view: new Opaque(next) });
      expect(ObservableScope.Value(scope)).to.eq(next);
      expect(state.runs).to.eq(2);
      ObservableScope.Destroy(scope);
    });
  });

  describe("composing new objects from nodes", () => {
    // Anything built from a node's reads holds raw values, never a box
    function hasOpaque(value: any): boolean {
      return value instanceof Opaque || (value !== null && typeof value === "object" && Object.values(value).some(hasOpaque));
    }

    function node() {
      const raw = drawing();
      return { raw, node: ObservableNode.Create({ view: new Opaque(raw), list: [new Opaque(raw)] } as any, false) };
    }

    it("spread, Object.assign, entries and values give raw values", () => {
      const { raw, node: n } = node();
      expect({ ...n }.view).to.eq(raw);
      expect(Object.assign({}, n).view).to.eq(raw);
      expect(hasOpaque(Object.entries(n))).to.eq(false);
      expect(hasOpaque(Object.values(n))).to.eq(false);
    });

    it("array spread, Array.from and concat give raw values", () => {
      const { raw, node: n } = node();
      expect([...n.list][0]).to.eq(raw);
      expect(Array.from(n.list)[0]).to.eq(raw);
      expect(n.list.concat([])[0]).to.eq(raw);
    });

    it("property descriptors give raw values", () => {
      const { raw, node: n } = node();
      expect(Object.getOwnPropertyDescriptor(n, "view")!.value).to.eq(raw);
      expect(Object.getOwnPropertyDescriptor(n.list, 0)!.value).to.eq(raw);
      expect(hasOpaque(Object.getOwnPropertyDescriptors(n))).to.eq(false);
    });

    it("a node put in another node keeps its boxes, and reads open them", () => {
      const { raw, node: n } = node();
      const created = ObservableNode.Create({ inner: n });
      expect(created.inner.view).to.eq(raw);
      expect(isNode(created.inner.view)).to.eq(false);

      const assigned: any = ObservableNode.Create({ inner: null });
      assigned.inner = n;
      expect(assigned.inner.list[0]).to.eq(raw);
      expect(isNode(assigned.inner.list[0])).to.eq(false);
    });

    it("snapshots, JSON and Clone of a node hold no box", () => {
      const { node: n } = node();
      expect(hasOpaque(ObservableNode.Snapshot(n))).to.eq(false);
      expect(hasOpaque(structuredClone(ObservableNode.Snapshot(n)))).to.eq(false);
      expect(hasOpaque(ObservableNode.Clone(n))).to.eq(false);
      expect(hasOpaque(ObservableNode.Clone({ n }))).to.eq(false);
    });
  });

  describe("Unwrap, Clone and Snapshot", () => {
    // Unwrap and Clone give a value as a node stores it, so an Opaque keeps its box and writing
    // the result back into a node keeps it opaque. Snapshots and JSON give plain data.
    it("Unwrap of an Opaque keeps the box", () => {
      const box = new Opaque(drawing());
      expect(ObservableNode.Unwrap(box)).to.eq(box);
    });

    it("Unwrap of a node leaves the Opaque in its storage", () => {
      const box = new Opaque(drawing());
      const node = ObservableNode.Create({ view: box }, false);
      expect((ObservableNode.Unwrap(node) as any).view).to.eq(box);
    });

    it("Create of a node's Unwrap is the same proxy, its boxes kept", () => {
      const raw = drawing();
      const box = new Opaque(raw);
      const node = ObservableNode.Create({ view: box, list: [new Opaque(raw)], plain: { a: 1 } } as any, false);
      const list = node.list;
      const plain = node.plain;

      const again = ObservableNode.Create(ObservableNode.Unwrap(node));
      expect(again).to.eq(node);
      expect(ObservableNode.Create(ObservableNode.Unwrap(list))).to.eq(list);
      expect(ObservableNode.Create(ObservableNode.Unwrap(plain))).to.eq(plain);
      expect((ObservableNode.Unwrap(node) as any).view).to.eq(box);
      expect(again.view).to.eq(raw);
      expect(again.list[0]).to.eq(raw);
    });

    it("Clone of an Opaque keeps the box", () => {
      const box = new Opaque(drawing());
      expect(ObservableNode.Clone(box)).to.eq(box);
    });

    it("Clone of a plain object holding an Opaque keeps the box", () => {
      const box = new Opaque(drawing());
      const cloned = ObservableNode.Clone({ view: box }) as any;
      expect(cloned.view).to.eq(box);
    });

    it("Clone of a node holding an Opaque is plain data equal to the raw value", () => {
      const raw = drawing();
      const node = ObservableNode.Create({ view: new Opaque(raw) }, false);
      const cloned = ObservableNode.Clone(node) as any;
      expect(cloned.view).to.deep.eq(raw);
      expect(cloned.view).not.to.be.instanceOf(Opaque);
      expect(isNode(cloned.view)).to.eq(false);
    });

    it("serializes a node holding an Opaque as its raw value", () => {
      const raw = drawing();
      const node = ObservableNode.Create({ view: new Opaque(raw) }, false);
      expect(JSON.parse(JSON.stringify(node))).to.deep.eq({ view: raw });
    });

    it("snapshots a node holding an Opaque with the raw value", () => {
      const raw = drawing();
      const node = ObservableNode.Create({ view: new Opaque(raw) }, false);
      const snapshot = ObservableNode.Snapshot(node) as any;
      expect(snapshot.view).to.eq(raw);
    });

    it("keeps the snapshot until the Opaque is replaced", () => {
      const node = ObservableNode.Create({ view: new Opaque(drawing()) }, false);
      const first = ObservableNode.Snapshot(node);
      expect(ObservableNode.Snapshot(node)).to.eq(first);

      const next = drawing("b");
      ObservableNode.ApplyDiff(node, [{ type: "write", path: ["view"], value: new Opaque(next) }]);
      const second = ObservableNode.Snapshot(node) as any;
      expect(second).not.to.eq(first);
      expect(second.view).to.eq(next);
    });
  });
});
