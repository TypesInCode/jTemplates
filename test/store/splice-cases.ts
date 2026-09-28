import { describe, it, expect, afterEach } from "vitest";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

// Store.Splice cases shared by StoreSync (storeSplice-test.ts) and StoreAsync
// (storeSplice-test-async.ts). Every store call is awaited, so the same cases run against
// both. Each case checks what the store holds afterwards: the array, the removed items,
// the keyed entities as roots, and which readers woke.

/** The part of the store API the cases use; StoreSync and StoreAsync both fit. */
export interface SpliceStore {
  Write(data: unknown, key?: string): unknown;
  Push(key: string, ...data: unknown[]): unknown;
  Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): unknown;
  Get<O>(id: string): O | undefined;
  Destroy?(): void;
}

interface Row {
  _id: string;
  value: string;
  child?: Row | null;
}

export const KeyFunc = (val: any) => val?._id;

const row = (id: string, value = id): Row => ({ _id: id, value });
const rows = (...ids: string[]) => ids.map((id) => row(id));

/** Plain data of what the store holds at `key`. */
function plain<T>(store: SpliceStore, key: string): T {
  return JSON.parse(JSON.stringify(store.Get(key) ?? null));
}

/** The ids of the array at `key`, in order. */
const ids = (store: SpliceStore, key = "arr") => plain<Row[]>(store, key).map((r) => r._id);

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

/** The message of what `fn` throws or rejects with, or null if it succeeds. */
async function failure(fn: () => unknown): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export function spliceCases(name: string, create: () => SpliceStore) {
  describe(`${name}.Splice`, () => {
    let store: SpliceStore;
    const stores: SpliceStore[] = [];
    afterEach(() => {
      stores.splice(0).forEach((s) => s.Destroy?.());
    });

    /** A store holding `arr` = a, b, c, d. */
    async function seeded(...ids: string[]) {
      store = create();
      stores.push(store);
      await store.Write(rows(...(ids.length ? ids : ["a", "b", "c", "d"])), "arr");
      return store;
    }

    describe("changes the array as Array.prototype.splice does", () => {
      it.each([
        ["removes the first item", 0, 1, [], ["b", "c", "d"], ["a"]],
        ["removes from the middle", 1, 2, [], ["a", "d"], ["b", "c"]],
        ["removes the last item", 3, 1, [], ["a", "b", "c"], ["d"]],
        ["inserts at the start", 0, 0, ["x"], ["x", "a", "b", "c", "d"], []],
        ["inserts in the middle", 2, 0, ["x", "y"], ["a", "b", "x", "y", "c", "d"], []],
        ["inserts at the end", 4, 0, ["x"], ["a", "b", "c", "d", "x"], []],
        ["replaces a run", 1, 2, ["x"], ["a", "x", "d"], ["b", "c"]],
        ["clamps a deleteCount past the end", 2, 10, [], ["a", "b"], ["c", "d"]],
        ["removes nothing for a deleteCount of 0", 1, 0, [], ["a", "b", "c", "d"], []],
      ] as const)("%s", async (_, start, deleteCount, inserted, expected, removed) => {
        await seeded();
        const result = (await store.Splice("arr", start, deleteCount, ...inserted.map((id) => row(id)))) as Row[];

        expect(ids(store)).toEqual(expected);
        expect(result.map((r) => r._id)).toEqual(removed);
        expect(result).toEqual(removed.map((id) => row(id)));
      });

      it("removes everything from start when deleteCount is omitted", async () => {
        await seeded();
        const result = (await store.Splice("arr", 1)) as Row[];

        expect(ids(store)).toEqual(["a"]);
        expect(result.map((r) => r._id)).toEqual(["b", "c", "d"]);
      });

      it("keeps the array's length in step", async () => {
        await seeded();
        await store.Splice("arr", 1, 2, row("x"), row("y"), row("z"));

        expect(store.Get<Row[]>("arr")!.length).toBe(5);
      });
    });

    describe("keyed entities", () => {
      it("registers an inserted entity as a root, readable by key", async () => {
        await seeded();
        await store.Splice("arr", 1, 0, row("x", "ex"));

        expect(plain(store, "x")).toEqual(row("x", "ex"));
        expect(store.Get<Row[]>("arr")![1].value).toBe("ex");
      });

      it("registers every entity inserted in one call", async () => {
        await seeded();
        await store.Splice("arr", 0, 0, row("x"), row("y"), row("z"));

        expect(ids(store)).toEqual(["x", "y", "z", "a", "b", "c", "d"]);
        for (const id of ["x", "y", "z"]) expect(plain(store, id)).toEqual(row(id));
      });

      it("registers a keyed entity nested in an inserted item", async () => {
        await seeded();
        await store.Splice("arr", 0, 0, { ...row("x"), child: row("n", "nested") });

        expect(plain(store, "n")).toEqual(row("n", "nested"));
        await store.Write("changed", "n.value");
        expect(store.Get<Row[]>("arr")![0].child!.value).toBe("changed");
      });

      it("writes to an inserted entity by key, and the array shows it", async () => {
        await seeded();
        await store.Splice("arr", 1, 0, row("x"));
        await store.Write("changed", "x.value");

        expect(plain<Row>(store, "x").value).toBe("changed");
        expect(plain<Row[]>(store, "arr")[1]).toEqual(row("x", "changed"));
      });

      it("writes to an entity that only shifted, and the array shows it", async () => {
        await seeded();
        await store.Splice("arr", 0, 1);
        await store.Write("changed", "c.value");

        expect(plain<Row[]>(store, "arr")[1]).toEqual(row("c", "changed"));
      });

      it("keeps a removed entity as a root", async () => {
        await seeded();
        await store.Splice("arr", 1, 1);

        expect(plain(store, "b")).toEqual(row("b"));
      });

      it("restores the array when a removed entity is re-inserted where it was (undo)", async () => {
        await seeded();
        const [removed] = (await store.Splice("arr", 1, 1)) as Row[];
        await store.Splice("arr", 1, 0, removed);

        expect(plain(store, "arr")).toEqual(rows("a", "b", "c", "d"));
        await store.Write("changed", "b.value");
        expect(plain<Row[]>(store, "arr")[1].value).toBe("changed");
      });

      it("updates the root of a re-inserted entity whose data changed", async () => {
        await seeded();
        await store.Splice("arr", 1, 1);
        await store.Splice("arr", 1, 0, row("b", "new"));

        expect(plain(store, "b")).toEqual(row("b", "new"));
        expect(plain<Row[]>(store, "arr")[1].value).toBe("new");
      });

      it("takes an entity that another array holds, and both show later writes", async () => {
        await seeded();
        await store.Write(rows("x", "y"), "other");
        await store.Splice("arr", 0, 0, row("x"));
        await store.Write("changed", "x.value");

        expect(plain<Row[]>(store, "arr")[0].value).toBe("changed");
        expect(plain<Row[]>(store, "other")[0].value).toBe("changed");
      });
    });

    describe("copies", () => {
      it("returns removed items that don't write back to the store", async () => {
        await seeded();
        const [removed] = (await store.Splice("arr", 0, 1)) as Row[];
        removed.value = "mutated";

        expect(plain<Row>(store, "a").value).toBe("a");
        await store.Splice("arr", 0, 0, row("a"));
        expect(plain<Row[]>(store, "arr")[0].value).toBe("a");
      });

      it("isn't changed by the caller mutating an inserted item afterwards", async () => {
        await seeded();
        const item = row("x");
        await store.Splice("arr", 0, 0, item);
        item.value = "mutated";

        expect(plain<Row>(store, "x").value).toBe("x");
        expect(plain<Row[]>(store, "arr")[0].value).toBe("x");
      });
    });

    describe("arrays without keyed items", () => {
      it("splices plain values", async () => {
        store = create();
        stores.push(store);
        await store.Write([1, 2, 3, 4], "nums");
        const removed = await store.Splice("nums", 1, 2, 9);

        expect(plain(store, "nums")).toEqual([1, 9, 4]);
        expect(removed).toEqual([2, 3]);
      });

      it("splices unkeyed objects, and isn't changed by the caller mutating one afterwards", async () => {
        store = create();
        stores.push(store);
        await store.Write([{ value: "a" }, { value: "b" }], "objs");
        const item = { value: "x" };
        await store.Splice("objs", 1, 0, item);
        item.value = "mutated";

        expect(plain(store, "objs")).toEqual([{ value: "a" }, { value: "x" }, { value: "b" }]);
        await store.Write("changed", "objs.1.value");
        expect(plain(store, "objs")).toEqual([{ value: "a" }, { value: "changed" }, { value: "b" }]);
      });
    });

    describe("readers", () => {
      it("wakes a reader of the array", async () => {
        await seeded();
        const arr = track(() => store.Get<Row[]>("arr")!.map((r) => r._id).join(","));

        await store.Splice("arr", 1, 1, row("x"));

        expect(arr.value()).toBe("a,x,c,d");
        expect(arr.runs()).toBe(2);
        arr.destroy();
      });

      it("wakes a reader of the array's length", async () => {
        await seeded();
        const length = track(() => store.Get<Row[]>("arr")!.length);

        await store.Splice("arr", 0, 1);

        expect(length.value()).toBe(3);
        length.destroy();
      });

      it("doesn't wake a reader of an entity that only shifted", async () => {
        await seeded();
        const c = track(() => store.Get<Row>("c")!.value);

        await store.Splice("arr", 0, 1);
        await store.Splice("arr", 0, 0, row("x"));

        expect(c.value()).toBe("c");
        expect(c.runs()).toBe(1);
        c.destroy();
      });

      it("doesn't wake a reader of an entity re-inserted unchanged", async () => {
        await seeded();
        const [removed] = (await store.Splice("arr", 1, 1)) as Row[];
        const b = track(() => store.Get<Row>("b")!.value);

        await store.Splice("arr", 1, 0, removed);

        expect(b.value()).toBe("b");
        expect(b.runs()).toBe(1);
        b.destroy();
      });

      it("wakes a reader of an entity re-inserted with changed data", async () => {
        await seeded();
        await store.Splice("arr", 1, 1);
        const b = track(() => store.Get<Row>("b")!.value);

        await store.Splice("arr", 1, 0, row("b", "new"));

        expect(b.value()).toBe("new");
        expect(b.runs()).toBe(2);
        b.destroy();
      });
    });

    describe("stays consistent with later writes", () => {
      it("appends a Push after the spliced array's new end", async () => {
        await seeded();
        await store.Splice("arr", 1, 2);
        await store.Push("arr", row("x"));

        expect(ids(store)).toEqual(["a", "d", "x"]);
      });

      it("diffs a later Write of the whole array against the spliced array", async () => {
        await seeded();
        await store.Splice("arr", 0, 1, row("x"));
        await store.Write(rows("x", "b", "c"), "arr");

        expect(ids(store)).toEqual(["x", "b", "c"]);
        expect(plain(store, "x")).toEqual(row("x"));
      });

      it("applies consecutive splices in order", async () => {
        await seeded();
        await store.Splice("arr", 0, 1);
        await store.Splice("arr", 1, 0, row("x"));
        await store.Splice("arr", 3, 1, row("y"), row("z"));

        expect(ids(store)).toEqual(["b", "x", "c", "y", "z"]);
      });
    });

    describe("rejects", () => {
      it("a key the store doesn't hold, changing nothing", async () => {
        await seeded();

        expect(await failure(() => store.Splice("missing", 0, 1))).toBeTruthy();
        expect(ids(store)).toEqual(["a", "b", "c", "d"]);
      });

      it("a dotted path, changing nothing", async () => {
        store = create();
        stores.push(store);
        await store.Write({ list: rows("a", "b") }, "doc");

        expect(await failure(() => store.Splice("doc.list", 0, 1))).toBeTruthy();
        expect(plain<{ list: Row[] }>(store, "doc").list.map((r) => r._id)).toEqual(["a", "b"]);
        // The diff side changed nothing either: a write by index still finds "b".
        await store.Write("changed", "doc.list.1.value");
        expect(plain(store, "b")).toEqual(row("b", "changed"));
      });

      it("a root that isn't an array, changing nothing", async () => {
        store = create();
        stores.push(store);
        await store.Write({ value: 1 }, "obj");

        expect(await failure(() => store.Splice("obj", 0, 1))).toBeTruthy();
        expect(plain(store, "obj")).toEqual({ value: 1 });
      });
    });
  });
}
