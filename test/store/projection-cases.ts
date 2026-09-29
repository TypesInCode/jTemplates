import { describe, it, expect, afterEach } from "vitest";
import { DiffTreeProjectionMap } from "../../src/Store/Diff/diffTree";

// Store wiring for DiffTree projections, shared by StoreSync (projection-test.ts) and
// StoreAsync (projection-test-async.ts). Every store call is awaited, so the same cases run
// against both. A projection's result is just another root, reached the same way any other
// write's diff reaches the store: through UpdateRootMap, keyed by $projection_<id>.
//
// Projection functions here are arrow functions on purpose: StoreAsync sends the whole
// projection map to the worker serialized with `.toString()` and `eval`'d back into
// functions there, the same mechanic used for keyFunc, and that only round-trips reliably
// for an expression (an arrow function), not a function declaration.

/** The part of the store API the cases use; StoreSync and StoreAsync both fit. */
export interface ProjectionStore {
  Write(data: unknown, key?: string): unknown;
  Push(key: string, ...data: unknown[]): unknown;
  Get<O>(id: string): O | undefined;
  Destroy?(): void;
}

export const KeyFunc = (val: any) => val?._id;

export const projections: DiffTreeProjectionMap = {
  total: {
    reads: ["items"],
    projection: (items: any[]) => items.length,
  },
  doubled: {
    reads: [`$projection_total`],
    projection: (total: number) => total * 2,
  },
  leader: {
    reads: ["items"],
    // "derived" exists only inside this result, so it only becomes its own root through
    // the projection's flatten, the same way any other write's flatten would register it.
    projection: (items: any[]) => ({ best: { _id: "derived", count: items.length } }),
  },
};

export function projectionCases(name: string, create: () => ProjectionStore) {
  describe(`${name} projections`, () => {
    const stores: ProjectionStore[] = [];
    afterEach(() => {
      stores.splice(0).forEach((s) => s.Destroy?.());
    });

    function newStore() {
      const store = create();
      stores.push(store);
      return store;
    }

    it("makes a projection's result readable through Get, at its reserved key", async () => {
      const store = newStore();
      await store.Write([{ _id: "a" }, { _id: "b" }], "items");

      expect(await store.Get("$projection_total")).toBe(2);
    });

    it("updates a projection's result as a normal write's diff flows into the store", async () => {
      const store = newStore();
      await store.Write([{ _id: "a" }], "items");
      expect(await store.Get("$projection_total")).toBe(1);

      await store.Push("items", { _id: "b" });
      expect(await store.Get("$projection_total")).toBe(2);
    });

    it("resolves a chained projection through the store, in dependency order", async () => {
      const store = newStore();
      await store.Write([{ _id: "a" }, { _id: "b" }], "items");

      expect(await store.Get("$projection_doubled")).toBe(4);
    });

    it("flattens a keyed entity embedded in a projection's result to its own root in the store", async () => {
      const store = newStore();
      await store.Write([{ _id: "a" }, { _id: "b" }], "items");

      expect(await store.Get<any>("derived")).toEqual({ _id: "derived", count: 2 });
    });
  });
}
