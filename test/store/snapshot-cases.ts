import { describe, it, expect, afterEach } from "vitest";
import { ObservableNode } from "../../src/Store/Tree/observableNode";

// ObservableNode.Snapshot (and toJSON, which returns the same snapshot) against a store,
// shared by StoreSync (snapshot-test.ts) and StoreAsync (snapshot-test-async.ts). Every
// store call is awaited, so the same cases run against both.
//
// A snapshot is an immutable plain copy of a node, cached until a write invalidates it:
// repeated reads return the same object, a write produces new containers only along the
// path to the change, and a snapshot handed out never changes. Expected values come from
// reading the store through its proxies (`read`), which resolves keyed entities through
// their roots without going through the snapshot code.

/** The part of the store API the cases use; StoreSync and StoreAsync both fit. */
export interface SnapshotStore {
  Write(data: unknown, key?: string): unknown;
  Patch(key: string, patch: unknown): unknown;
  Push(key: string, ...data: unknown[]): unknown;
  Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): unknown;
  Get<O>(id: string): O | undefined;
  Destroy?(): void;
}

export const KeyFunc = (val: any) => val?._id;

const row = (id: string, value = id) => ({ _id: id, value });
const rows = (...ids: string[]) => ids.map((id) => row(id));

/** The data at `key`, read through the store's proxies rather than a snapshot. */
function read(value: any): any {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let x = 0; x < value.length; x++) out.push(read(value[x]));
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value)) out[k] = read(value[k]);
  return out;
}

export function snapshotCases(name: string, create: () => SnapshotStore) {
  describe(`${name} snapshots`, () => {
    const stores: SnapshotStore[] = [];
    afterEach(() => {
      stores.splice(0).forEach((s) => s.Destroy?.());
    });

    function newStore() {
      const store = create();
      stores.push(store);
      return store;
    }

    const snap = <T = any>(store: SnapshotStore, key: string): T =>
      ObservableNode.Snapshot(store.Get<T>(key)) as T;
    const stored = (store: SnapshotStore, key: string) => read(store.Get(key));

    describe("reading", () => {
      it("copies nested objects, arrays and keyed entities", async () => {
        const store = newStore();
        await store.Write(
          { title: "t", tags: ["a", "b"], meta: { count: 1, flags: [true, false] }, items: rows("a", "b") },
          "doc",
        );

        expect(snap(store, "doc")).toEqual({
          title: "t",
          tags: ["a", "b"],
          meta: { count: 1, flags: [true, false] },
          items: rows("a", "b"),
        });
      });

      it("reads keyed entities through their roots", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "arr");
        await store.Write({ _id: "a", value: "changed" });

        expect(snap(store, "arr")).toEqual([row("a", "changed"), row("b")]);
      });

      it("returns the same object from toJSON", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "arr");

        expect(store.Get<any>("arr").toJSON()).toBe(snap(store, "arr"));
      });

      it("serialises with JSON.stringify", async () => {
        const store = newStore();
        await store.Write({ items: rows("a", "b"), n: 1 }, "doc");

        expect(JSON.parse(JSON.stringify(store.Get("doc")))).toEqual({ items: rows("a", "b"), n: 1 });
      });

      it("returns undefined for a value that isn't a node", () => {
        expect(ObservableNode.Snapshot({ a: 1 })).toBeUndefined();
        expect(ObservableNode.Snapshot(1)).toBeUndefined();
      });
    });

    describe("identity", () => {
      it("returns the same object from repeated reads with no write between", async () => {
        const store = newStore();
        await store.Write({ items: rows("a", "b"), meta: { n: 1 } }, "doc");
        const a = snap(store, "doc");
        const b = snap(store, "doc");

        expect(b).toBe(a);
        expect(b.items[0]).toBe(a.items[0]);
        expect(b.meta).toBe(a.meta);
      });

      it("keeps its identity when entities are first read through a proxy", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "arr");
        const a = snap(store, "arr");
        store.Get<any[]>("arr")![0].value;

        expect(snap(store, "arr")).toBe(a);
      });

      it("makes new containers only along the path to a change", async () => {
        const store = newStore();
        await store.Write(rows("a", "b", "c"), "arr");
        const before = snap(store, "arr");
        await store.Write({ _id: "b", value: "changed" });
        const after = snap(store, "arr");

        expect(after).not.toBe(before);
        expect(after[1]).not.toBe(before[1]);
        expect(after[0]).toBe(before[0]);
        expect(after[2]).toBe(before[2]);
      });

      it("doesn't change a snapshot handed out earlier", async () => {
        const store = newStore();
        await store.Write({ items: rows("a", "b"), meta: { n: 1 } }, "doc");
        const before = snap(store, "doc");
        const json = JSON.stringify(before);

        await store.Write({ _id: "a", value: "changed" });
        await store.Write({ items: rows("b"), meta: { n: 2 } }, "doc");
        snap(store, "doc");

        expect(JSON.stringify(before)).toBe(json);
      });

      it("keeps a root's snapshot when another root is written", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "one");
        await store.Write(rows("c", "d"), "two");
        const one = snap(store, "one");

        await store.Write({ _id: "c", value: "changed" });
        await store.Splice("two", 0, 1);

        expect(snap(store, "one")).toBe(one);
      });
    });

    describe("invalidation", () => {
      it("shows a Write of an entity by its key in a snapshot of an array that holds it", async () => {
        const store = newStore();
        await store.Write(rows("first", "second"), "arr");
        // Nothing reads the entities through a proxy, so they have no node wrappers.
        snap(store, "arr");

        await store.Write({ _id: "first", value: "changed" });

        expect(snap(store, "arr")).toEqual([row("first", "changed"), row("second")]);
      });

      it("shows a change to an unread object nested inside another unread object", async () => {
        const store = newStore();
        await store.Write(
          [
            { _id: "first", inner: { value: "one" } },
            { _id: "second", inner: { value: "two" } },
          ],
          "arr",
        );
        // Neither the entity nor its inner object is read through a proxy.
        snap(store, "arr");

        // Only the inner object changes, so only its cached snapshot is cleared directly.
        await store.Write({ _id: "first", inner: { value: "changed" } });

        expect(snap(store, "arr")[0].inner.value).toBe("changed");
      });

      it("shows a positional Write that changes which entity a slot holds", async () => {
        const store = newStore();
        await store.Write(rows("a", "b", "c"), "arr");
        snap(store, "arr");

        // Same length, different entities: the diff rewrites each slot's fields in place.
        await store.Write(rows("c", "a", "b"), "arr");

        expect(snap(store, "arr")).toEqual(rows("c", "a", "b"));
      });

      it("shows a whole-array Write that changes one field", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "arr");
        snap(store, "arr");

        await store.Write([row("a", "changed"), row("b")], "arr");

        expect(snap(store, "arr")).toEqual([row("a", "changed"), row("b")]);
      });

      it("shows a Patch of an entity's field and of a nested field", async () => {
        const store = newStore();
        await store.Write([{ _id: "a", value: "a", inner: { n: 1 } }], "arr");
        snap(store, "arr");

        await store.Patch("a", { value: "changed" });
        expect(snap(store, "arr")[0].value).toBe("changed");

        await store.Patch("a", { inner: { n: 2 } });
        expect(snap(store, "arr")[0].inner.n).toBe(2);
      });

      it("shows a Splice and a Push", async () => {
        const store = newStore();
        await store.Write(rows("a", "b", "c"), "arr");
        snap(store, "arr");

        await store.Splice("arr", 1, 1, row("x"));
        expect(snap(store, "arr")).toEqual(rows("a", "x", "c"));

        await store.Push("arr", row("y"));
        expect(snap(store, "arr")).toEqual(rows("a", "x", "c", "y"));
      });

      it("shows a change to an unkeyed object nested in a root", async () => {
        const store = newStore();
        await store.Write({ outer: { inner: { value: "one" } } }, "root");
        snap(store, "root");

        await store.Write({ outer: { inner: { value: "changed" } } }, "root");

        expect(snap(store, "root").outer.inner.value).toBe("changed");
      });

      it("shows a keyed entity nested in an unread object, written by its key", async () => {
        const store = newStore();
        await store.Write({ holder: { entity: row("e", "one") } }, "root");
        snap(store, "root");

        await store.Write(row("e", "changed"));

        expect(snap(store, "root").holder.entity.value).toBe("changed");
      });

      it("shows a write to an entity in every root that holds it", async () => {
        const store = newStore();
        await store.Write(rows("a", "b"), "one");
        await store.Write(rows("a", "c"), "two");
        snap(store, "one");
        snap(store, "two");

        await store.Write(row("a", "changed"));

        expect(snap(store, "one")[0].value).toBe("changed");
        expect(snap(store, "two")[0].value).toBe("changed");
      });
    });

    it("isn't changed by writing to a snapshot", async () => {
      const store = newStore();
      await store.Write(rows("a", "b"), "arr");
      const snapshot = snap(store, "arr");

      snapshot[0].value = "mutated";

      expect(stored(store, "arr")[0].value).toBe("a");
      expect(stored(store, "a").value).toBe("a");
    });

    it("stays equal to the stored data, and never changes once handed out, over random writes", async () => {
      let seed = 7;
      const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
      for (let trial = 0; trial < 20; trial++) {
        const store = newStore();
        await store.Write([{ _id: "e1", value: "1", inner: { n: 1 } }, row("e2"), row("e3")], "arr");
        let next = 10;
        const handedOut: [unknown, string][] = [];
        for (let step = 0; step < 12; step++) {
          const current = stored(store, "arr") as any[];
          const id = current.length ? current[rnd(current.length)]._id : null;
          switch (rnd(7)) {
            case 0:
              if (id) await store.Write({ _id: id, value: `w${step}`, inner: { n: step } });
              break;
            case 1:
              if (id) await store.Patch(id, { inner: { n: step } });
              break;
            case 2:
              await store.Splice("arr", rnd(current.length + 1), rnd(2), row(`e${next++}`));
              break;
            case 3:
              await store.Push("arr", row(`e${next++}`));
              break;
            case 4:
              await store.Write(current.slice().reverse(), "arr");
              break;
            case 5:
              if (id) await store.Patch(id, { value: `p${step}` });
              break;
            case 6:
              // Read through proxies, so later writes meet entities that have node wrappers.
              stored(store, "arr");
              break;
          }
          const snapshot = snap(store, "arr");
          expect(snapshot).toEqual(stored(store, "arr"));
          handedOut.push([snapshot, JSON.stringify(snapshot)]);
        }
        for (const [snapshot, json] of handedOut) expect(JSON.stringify(snapshot)).toBe(json);
      }
    });
  });
}
