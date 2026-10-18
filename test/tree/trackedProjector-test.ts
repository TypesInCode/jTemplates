import { describe, it, expect } from "vitest";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { PROJECTION_PREFIX } from "../../src/Store/Diff";
import { ProjectionMissingReadError, TrackedProjector } from "../../src/Store/Diff/trackedProjector";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { JsonType } from "../../src/Utils/json";

function KeyFunc(val: any) {
  return JsonType(val) === "object" ? val._id : undefined;
}

// DiffTree's write operations don't run projections; the caller does, once per operation.
function Write(tree: DiffTree, path: string, value: any) {
  return tree.DiffPath(path, value).concat(tree.RunProjections());
}

function ProjectionDiff(result: any[], id: string) {
  return result.filter((d) => d.path[0] === `${PROJECTION_PREFIX}${id}`);
}

const Users = () => [
  { _id: "user_1", name: "Ann" },
  { _id: "user_2", name: "Bob" },
  { _id: "user_3", name: "Cat" },
];

// A tracked projection reads values on demand through `read`/`readAny` instead of
// receiving a fixed list of values. Its reads are recorded, and on the next run it's
// skipped unless one of them resolves to a different snapshot.
describe("TrackedProjector", () => {
  it("computes a projection from its reads and includes its result in the diff", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      total: { reads: ["items"], projection: (read) => read<any[]>("items").length },
    }));

    const result = Write(tree, "items", [1, 2]);

    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}total`], value: 2 });
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBe(2);
  });

  it("does not re-run when data it didn't read changes", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      total: { reads: ["items"], projection: (read) => (calls++, read<any[]>("items").length) },
    }));

    Write(tree, "items", [1]);
    const result = Write(tree, "other", "x");

    expect(calls).toBe(1);
    expect(ProjectionDiff(result, "total")).toEqual([]);
  });

  it("re-runs and diffs when data it read changes", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      total: { reads: ["items"], projection: (read) => (calls++, read<any[]>("items").length) },
    }));

    Write(tree, "items", [1]);
    const result = Write(tree, "items", [1, 2, 3]);

    expect(calls).toBe(2);
    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}total`], value: 3 });
  });

  it("runs a projection with no reads once", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      constant: { reads: [], projection: () => (calls++, "c") },
    }));

    Write(tree, "a", 1);
    Write(tree, "b", 2);

    expect(calls).toBe(1);
    expect(tree.GetPath(`${PROJECTION_PREFIX}constant`)).toBe("c");
  });

  it("re-runs only when a value it read at a nested path changes", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      theme: { reads: ["settings.theme"], projection: (read) => (calls++, read("settings.theme")) },
    }));

    Write(tree, "settings", { theme: "dark", fontSize: 12 });
    Write(tree, "settings.fontSize", 14);
    expect(calls).toBe(1);

    Write(tree, "settings.theme", "light");
    expect(calls).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}theme`)).toBe("light");
  });
});

// The pattern the tracked model exists for: a projection over discrete, flattened
// entities, reading only the ids some source state names.
describe("TrackedProjector discrete ids", () => {
  function CreateTree() {
    const calls = { selectedNames: 0 };
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      selectedNames: {
        reads: ["selectedIds", "user_"],
        projection: (read) => {
          calls.selectedNames++;
          return read<string[]>("selectedIds").map((id) => read(`${id}.name`));
        },
      },
    }));

    tree.DiffPath("users", Users());
    Write(tree, "selectedIds", ["user_1", "user_3"]);
    return { tree, calls };
  }

  const selectedNames = `${PROJECTION_PREFIX}selectedNames`;

  it("reads only the entities whose ids the source state names", () => {
    const { tree, calls } = CreateTree();

    expect(calls.selectedNames).toBe(1);
    expect(tree.GetPath(selectedNames)).toEqual(["Ann", "Cat"]);
  });

  it("does not re-run when an entity it didn't read changes", () => {
    const { tree, calls } = CreateTree();

    const result = Write(tree, "user_2.name", "Bobby");

    expect(calls.selectedNames).toBe(1);
    expect(ProjectionDiff(result, "selectedNames")).toEqual([]);
  });

  it("re-runs when an entity it read changes", () => {
    const { tree, calls } = CreateTree();

    const result = Write(tree, "user_3.name", "Cy");

    expect(calls.selectedNames).toBe(2);
    expect(result).toContainEqual({ path: [selectedNames, 1], value: "Cy" });
  });

  it("re-runs when an entity it read changes through a path into the source list", () => {
    const { tree, calls } = CreateTree();

    // "users.0" is the keyed entity user_1, so this write lands on its root.
    Write(tree, "users.0.name", "Anna");

    expect(calls.selectedNames).toBe(2);
    expect(tree.GetPath(selectedNames)).toEqual(["Anna", "Cat"]);
  });

  it("follows the source state to a new set of ids", () => {
    const { tree, calls } = CreateTree();

    Write(tree, "selectedIds", ["user_2"]);
    expect(calls.selectedNames).toBe(2);
    expect(tree.GetPath(selectedNames)).toEqual(["Bob"]);

    // user_1 is no longer read, so changing it doesn't re-run the projection.
    Write(tree, "user_1.name", "Anna");
    expect(calls.selectedNames).toBe(2);
  });

  it("projects each entity separately with a projection per id", () => {
    const calls: { [id: string]: number } = { user_1: 0, user_2: 0 };
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      user_1_label: {
        reads: ["user_1"],
        projection: (read) => (calls.user_1++, `#1 ${read("user_1.name")}`),
      },
      user_2_label: {
        reads: ["user_2"],
        projection: (read) => (calls.user_2++, `#2 ${read("user_2.name")}`),
      },
    }));

    Write(tree, "users", Users());
    Write(tree, "user_2.name", "Bobby");

    expect(calls).toEqual({ user_1: 1, user_2: 2 });
    expect(tree.GetPath(`${PROJECTION_PREFIX}user_1_label`)).toBe("#1 Ann");
    expect(tree.GetPath(`${PROJECTION_PREFIX}user_2_label`)).toBe("#2 Bobby");
  });
});

describe("TrackedProjector readAny", () => {
  it("reads every root key matching a prefix, by key", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      names: {
        reads: ["user_"],
        projection: (_read, readAny) => {
          const users = readAny<{ name: string }>("user_*");
          return Object.keys(users).map((key) => `${key}:${users[key].name}`);
        },
      },
    }));

    Write(tree, "users", Users());

    expect(tree.GetPath(`${PROJECTION_PREFIX}names`)).toEqual([
      "user_1:Ann",
      "user_2:Bob",
      "user_3:Cat",
    ]);
  });

  it("re-runs when a matching key is added or a matched child changes, not otherwise", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      userCount: {
        reads: ["user_"],
        projection: (_read, readAny) => (calls++, Object.keys(readAny("user_*")).length),
      },
    }));

    Write(tree, "users", Users());
    expect(calls).toBe(1);

    Write(tree, "other", "x");
    expect(calls).toBe(1);

    tree.PushPath("users", [{ _id: "user_4", name: "Dan" }]);
    tree.RunProjections();
    expect(calls).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}userCount`)).toBe(4);

    Write(tree, "user_2.name", "Bobby");
    expect(calls).toBe(3);
  });

  it("re-runs when a matching key is removed from a nested object", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      members: {
        reads: ["team.members"],
        projection: (_read, readAny) => (calls++, Object.keys(readAny("team.members.*"))),
      },
    }));

    Write(tree, "team", { name: "t", members: { a: { role: "x" }, b: { role: "y" } } });
    expect(tree.GetPath(`${PROJECTION_PREFIX}members`)).toEqual(["a", "b"]);

    Write(tree, "team.name", "renamed");
    expect(calls).toBe(1);

    Write(tree, "team.members", { a: { role: "x" } });
    expect(calls).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}members`)).toEqual(["a"]);
  });

  it("rejects a path without a trailing wildcard", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      bad: { reads: ["user_"], projection: (_read, readAny) => readAny("user_1") },
    }));

    tree.DiffPath("users", Users());
    expect(() => tree.RunProjections()).toThrow(/wildcard/);
  });
});

describe("TrackedProjector declared reads", () => {
  it("rejects a read outside the declared prefixes", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      bad: { reads: ["items"], projection: (read) => read("other") },
    }));

    tree.DiffPath("other", 1);
    expect(() => tree.RunProjections()).toThrow(/outside its declared reads/);
  });

  it("rejects a readAny outside the declared prefixes", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      bad: { reads: ["user_1"], projection: (_read, readAny) => readAny("user_*") },
    }));

    tree.DiffPath("users", Users());
    expect(() => tree.RunProjections()).toThrow(/outside its declared reads/);
  });

  it("rejects a direct cycle at construction", () => {
    expect(() => new TrackedProjector({
      a: { reads: [`${PROJECTION_PREFIX}b`], projection: (read) => read(`${PROJECTION_PREFIX}b`) },
      b: { reads: [`${PROJECTION_PREFIX}a`], projection: (read) => read(`${PROJECTION_PREFIX}a`) },
    })).toThrow(/cycle/);
  });

  it("rejects a prefix that can read the projection's own result", () => {
    expect(() => new TrackedProjector({
      a: { reads: [PROJECTION_PREFIX], projection: () => 1 },
    })).toThrow(/cycle/);
  });

  it("rejects a projection prefix matching no projection", () => {
    expect(() => new TrackedProjector({
      a: { reads: [`${PROJECTION_PREFIX}missing`], projection: () => 1 },
    })).toThrow(/matches no projection/);
  });

  it("orders a projection after every projection its prefix covers", () => {
    const order: string[] = [];
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      sum: {
        reads: [`${PROJECTION_PREFIX}part_`],
        projection: (_read, readAny) => {
          order.push("sum");
          const parts = readAny<number>(`${PROJECTION_PREFIX}part_*`);
          return Object.keys(parts).reduce((total, key) => total + parts[key], 0);
        },
      },
      part_a: { reads: ["a"], projection: (read) => (order.push("part_a"), read("a")) },
      part_b: { reads: ["b"], projection: (read) => (order.push("part_b"), read("b")) },
    }));

    tree.DiffPath("a", 1);
    Write(tree, "b", 2);

    expect(order).toEqual(["part_a", "part_b", "sum"]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}sum`)).toBe(3);
  });
});

describe("TrackedProjector missing reads", () => {
  it("skips a projection whose read is missing, then runs once it exists", () => {
    let calls = 0;
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      total: { reads: ["items"], projection: (read) => (calls++, read<any[]>("items").length) },
    }));

    const result = Write(tree, "other", "x");
    expect(calls).toBe(1);
    expect(ProjectionDiff(result, "total")).toEqual([]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBeUndefined();

    // Still missing: the recorded missing read is unchanged, so it isn't retried.
    Write(tree, "other", "y");
    expect(calls).toBe(1);

    Write(tree, "items", [1, 2]);
    expect(calls).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBe(2);
  });

  it("lets a projection catch a missing read to handle it", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      total: {
        reads: ["items"],
        projection: (read) => {
          try {
            return read<any[]>("items").length;
          } catch (err) {
            if (err instanceof ProjectionMissingReadError) return 0;
            throw err;
          }
        },
      },
    }));

    Write(tree, "other", "x");
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBe(0);

    Write(tree, "items", [1]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBe(1);
  });

  it("skips a projection whose readAny parent is missing", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      members: { reads: ["team.members"], projection: (_read, readAny) => Object.keys(readAny("team.members.*")) },
    }));

    Write(tree, "other", "x");
    expect(tree.GetPath(`${PROJECTION_PREFIX}members`)).toBeUndefined();

    Write(tree, "team", { members: { a: 1 } });
    expect(tree.GetPath(`${PROJECTION_PREFIX}members`)).toEqual(["a"]);
  });

  it("skips a missing entity id until it's written", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      selectedNames: {
        reads: ["selectedIds", "user_"],
        projection: (read) => read<string[]>("selectedIds").map((id) => read(`${id}.name`)),
      },
    }));

    tree.DiffPath("users", Users());
    Write(tree, "selectedIds", ["user_1", "user_9"]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}selectedNames`)).toBeUndefined();

    tree.PushPath("users", [{ _id: "user_9", name: "Zed" }]);
    tree.RunProjections();
    expect(tree.GetPath(`${PROJECTION_PREFIX}selectedNames`)).toEqual(["Ann", "Zed"]);
  });

  it("blocks a chained projection until its upstream projection produces a result", () => {
    const calls = { count: 0, doubled: 0 };
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      count: { reads: ["items"], projection: (read) => (calls.count++, read<any[]>("items").length) },
      doubled: {
        reads: [`${PROJECTION_PREFIX}count`],
        projection: (read) => (calls.doubled++, read<number>(`${PROJECTION_PREFIX}count`) * 2),
      },
    }));

    Write(tree, "other", "x");
    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBeUndefined();

    Write(tree, "items", [1, 2]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}count`)).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBe(4);
  });

  it("propagates an error that isn't a missing read", () => {
    const tree = new DiffTree(KeyFunc, new TrackedProjector({
      bad: { reads: [], projection: () => { throw new Error("boom"); } },
    }));

    expect(() => tree.RunProjections()).toThrow("boom");
  });
});

describe("TrackedProjector through a store", () => {
  it("exposes a tracked projection's result through StoreSync.Get", () => {
    const store = new StoreSync(KeyFunc, new TrackedProjector({
      selectedNames: {
        reads: ["selectedIds", "user_"],
        projection: (read) => read<string[]>("selectedIds").map((id) => read(`${id}.name`)),
      },
    }));

    store.Write(Users(), "users");
    store.Write(["user_2"], "selectedIds");

    expect(store.Get<string[]>(`${PROJECTION_PREFIX}selectedNames`)).toEqual(["Bob"]);
  });
});
