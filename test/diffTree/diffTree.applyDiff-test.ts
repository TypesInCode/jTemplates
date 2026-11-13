import { describe, it, expect } from "vitest";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import { FollowRoutes } from "../../src/Store/Diff/utils/routes";
import type { IDiffPost, IRouteDefinitions } from "../../src/Store/Diff";

const keyFunc = (value: any) => (value && typeof value.key === "string" ? value.key : undefined);

function Plain(value: unknown) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/**
 * A source tree, and a follower holding it in its follow route `/src/`, applying each of its
 * posts, copied as across a port. The follower's `count` projection reads the followed rows.
 */
function Follow(options: { roots?: string[]; sourceRoutes?: IRouteDefinitions; followKeyFunc?: typeof keyFunc | null } = {}) {
  const source = new DiffTreePublisher(keyFunc, options.sourceRoutes);
  const follower = new DiffTreePublisher(undefined, {
    "/": { projections: { count: { reads: ["/src/rows"], projection: (rows: any) => rows?.t1?.length ?? 0 } } },
    ...FollowRoutes({ src: options.followKeyFunc === null ? undefined : (options.followKeyFunc ?? keyFunc) }),
  });
  const posts: IDiffPost[] = [];
  const followerPosts: IDiffPost[] = [];
  follower.Subscribe({}, (post: IDiffPost) => followerPosts.push(post));
  source.Subscribe({ roots: options.roots }, (post: IDiffPost) => {
    posts.push(post);
    follower.ApplyDiff(structuredClone(post.diff), "/src/");
    follower.RunProjections();
    follower.Commit();
  });
  const read = (path: string) => Plain(follower.Snapshot(`/src/${path}`));
  return { source, follower, posts, followerPosts, read };
}

const ROWS = {
  t1: [
    { key: "o_1", iden: "a", values: { x: "1" } },
    { key: "o_2", iden: "b", values: { x: "2" } },
  ],
};

describe("DiffTree.ApplyDiff: one tree following another in a follow route", () => {
  it("holds what the source committed, an entity's change read through every slot holding it", () => {
    const { source, follower, posts, read } = Follow({ roots: ["rows", "o_*"] });
    source.WritePath("rows", ROWS);
    source.Commit();
    expect(read("rows")).toEqual(ROWS);
    expect(read("o_1")).toEqual(ROWS.t1[0]);
    expect(follower.Committed("$projection_count")).toBe(2);

    // The source posts the change once, on the entity's own root; it's homed in the route here.
    source.WritePath("o_1.values.x", "9");
    source.Commit();
    expect(posts.at(-1)!.diff.every(r => r.path[0] === "o_1")).toBe(true);
    expect(read("rows").t1[0].values.x).toBe("9");
    expect(follower.ReadPath("o_1")).toBeUndefined();
  });

  it("never posts the route: only what the follower derives from it", () => {
    const { source, follower, followerPosts } = Follow({ roots: ["rows", "o_*"] });
    source.WritePath("rows", ROWS);
    source.Commit();
    expect(follower.CommittedKeys()).toEqual(["$projection_count"]);
    expect(followerPosts.flatMap(p => p.diff.map(r => r.path[0]))).toEqual(["$projection_count"]);
  });

  it("applies splices, moves included, and deletes of a property and of a root", () => {
    const { source, read } = Follow({ roots: ["rows", "o_*", "list"] });
    source.WritePath("rows", ROWS);
    source.WritePath("list", { a: 1, b: 2 });
    source.Commit();

    const o3 = { key: "o_3", iden: "c", values: {} };
    source.WritePath("rows.t1", [o3, ROWS.t1[1]]);
    source.Commit();
    expect(read("rows")).toEqual(Plain(source.Committed("rows")));
    source.WritePath("o_3.values.y", "z");
    source.Commit();
    expect(read("rows").t1[0].values).toEqual({ y: "z" });

    source.WritePath("list", { a: 1 });
    source.DeleteRoot("o_1");
    source.Commit();
    expect(read("list")).toEqual({ a: 1 });
    expect(read("o_1")).toBeUndefined();
  });

  it("holds a source's projection output under its own key", () => {
    const sourceRoutes: IRouteDefinitions = {
      "/": { projections: { size: { reads: ["rows"], projection: (rows: any) => rows?.t1?.length ?? 0 } } },
    };
    const { source, read } = Follow({ roots: ["$projection_size"], sourceRoutes });
    source.WritePath("rows", ROWS);
    source.RunProjections();
    source.Commit();
    expect(read("$projection_size")).toBe(2);
  });

  it("is written only by ApplyDiff, which writes only the root route or a follow route", () => {
    const { follower } = Follow();
    expect(() => follower.WritePath("/src/x", 1)).toThrow(/follow route/);
    expect(() => follower.PushPath("/src/list", [1])).toThrow(/follow route/);
    expect(() => follower.ApplyDiff([{ type: "write", path: ["x"], value: 1 }], "/other/")).toThrow(/follow route/);
    expect(() => follower.ApplyDiff([{ type: "write", path: ["$projection_x"], value: 1 }])).toThrow(/read-only/);
    expect(() => new DiffTreePublisher(undefined, { "/src": { projections: { p: { reads: ["a"], projection: () => 1 } }, follow: true } }).WritePath("/src/a", 1))
      .toThrow(/no projections/);
  });

  it("without the source's keyFunc, keeps an entity's first value inside another root", () => {
    const { source, read } = Follow({ roots: ["rows", "o_*"], followKeyFunc: null });
    source.WritePath("rows", ROWS);
    source.Commit();
    source.WritePath("o_1.values.x", "9");
    source.Commit();
    expect(read("o_1").values.x).toBe("9");
    expect(read("rows").t1[0].values.x).toBe("1");
  });

  it("applies to the root route, where the records' keys are the tree's own", () => {
    const source = new DiffTreePublisher();
    const follower = new DiffTreePublisher(undefined, {
      "/": { projections: { double: { reads: ["count"], projection: (n: any) => (n ?? 0) * 2 } } },
    });
    source.Subscribe({ roots: ["count"] }, (post: IDiffPost) => {
      follower.ApplyDiff(post.diff);
      follower.RunProjections();
      follower.Commit();
    });
    source.WritePath("count", 4);
    source.Commit();
    expect(follower.Committed("$projection_double")).toBe(8);
  });
});
