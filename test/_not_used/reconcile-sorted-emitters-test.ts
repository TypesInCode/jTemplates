import { describe, it, expect } from "vitest";
import { ReconcileSortedEmitters } from "../../src/_not_used/array";

describe("Reconcile sorted emitters", () => {
  it("Basic Reconcile - no changes", () => {
    const left = [[1], [2]];
    const right = [[1], [2]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));

    // Verify no changes occurred
    expect(added.length).to.equal(0);
    expect(removed.length).to.equal(0);
  });

  it("No overlap - remove all, add all", () => {
    const left = [[1], [2]];
    const right = [[3], [4]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.equal(2);
    expect(removed.length).to.equal(2);

    // Verify correct values were added and removed
    expect(added[0]).to.deep.equal([3]);
    expect(added[1]).to.deep.equal([4]);
    expect(removed[0]).to.deep.equal([1]);
    expect(removed[1]).to.deep.equal([2]);
  });

  it("Add elements to the end", () => {
    const left = [[1], [2]];
    const right = [[1], [2], [3], [4]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.equal(2);
    expect(removed.length).to.equal(0);

    // Verify correct values were added
    expect(added[0]).to.deep.equal([3]);
    expect(added[1]).to.deep.equal([4]);
  });

  it("Remove elements from the end", () => {
    const left = [[1], [2], [3], [4]];
    const right = [[1], [2]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.equal(0);
    expect(removed.length).to.equal(2);

    // Verify correct values were removed
    expect(removed[0]).to.deep.equal([3]);
    expect(removed[1]).to.deep.equal([4]);
  });

  it("Add and remove in the middle", () => {
    const left = [[1], [2], [5], [6]];
    const right = [[1], [3], [4], [6]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.equal(2);
    expect(removed.length).to.equal(2);

    // Verify correct values were added and removed
    expect(added[0]).to.deep.equal([3]);
    expect(added[1]).to.deep.equal([4]);
    expect(removed[0]).to.deep.equal([2]);
    expect(removed[1]).to.deep.equal([5]);
  });
});
