import * as chai from "chai";
import { ReconcileSortedEmitters } from "../../src/Utils/array";

describe("Reconcile sorted emitters", () => {
  it("Basic Reconcile - no changes", () => {
    const left = [[1], [2]];
    const right = [[1], [2]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));
    
    // Verify no changes occurred
    chai.expect(added.length).to.equal(0);
    chai.expect(removed.length).to.equal(0);
  });

  it("No overlap - remove all, add all", () => {
    const left = [[1], [2]];
    const right = [[3], [4]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));
    
    chai.expect(added.length).to.equal(2);
    chai.expect(removed.length).to.equal(2);
    
    // Verify correct values were added and removed
    chai.expect(added[0]).to.deep.equal([3]);
    chai.expect(added[1]).to.deep.equal([4]);
    chai.expect(removed[0]).to.deep.equal([1]);
    chai.expect(removed[1]).to.deep.equal([2]);
  });

  it("Add elements to the end", () => {
    const left = [[1], [2]];
    const right = [[1], [2], [3], [4]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));
    
    chai.expect(added.length).to.equal(2);
    chai.expect(removed.length).to.equal(0);
    
    // Verify correct values were added
    chai.expect(added[0]).to.deep.equal([3]);
    chai.expect(added[1]).to.deep.equal([4]);
  });

  it("Remove elements from the end", () => {
    const left = [[1], [2], [3], [4]];
    const right = [[1], [2]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));
    
    chai.expect(added.length).to.equal(0);
    chai.expect(removed.length).to.equal(2);
    
    // Verify correct values were removed
    chai.expect(removed[0]).to.deep.equal([3]);
    chai.expect(removed[1]).to.deep.equal([4]);
  });

  it("Add and remove in the middle", () => {
    const left = [[1], [2], [5], [6]];
    const right = [[1], [3], [4], [6]];

    const added: any[] = [];
    const removed: any[] = [];
    ReconcileSortedEmitters(left as [number][], right as [number][], (value) => added.push(value), (value) => removed.push(value));
    
    chai.expect(added.length).to.equal(2);
    chai.expect(removed.length).to.equal(2);
    
    // Verify correct values were added and removed
    chai.expect(added[0]).to.deep.equal([3]);
    chai.expect(added[1]).to.deep.equal([4]);
    chai.expect(removed[0]).to.deep.equal([2]);
    chai.expect(removed[1]).to.deep.equal([5]);
  });
});