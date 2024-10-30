/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import * as chai from "chai";
import { ReconcileSortedArrays } from "../../src/Utils/array";
const expect = chai.expect;

describe("Reconcile Sorted Arrays", () => {
  it("Basic Reconcile", () => {
    const left = [1, 2];
    const right = [1, 2];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(0);
    expect(removed.length).to.eq(0);
  });

  it("Basic Remove", () => {
    const left = [1, 2];
    const right = [2];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(0);
    expect(removed.length).to.eq(1);
    expect(removed[0]).to.eq(1);
  });
  it("Basic Add", () => {
    const left = [1, 2];
    const right = [1, 2, 3];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(1);
    expect(added[0]).to.eq(3);
    expect(removed.length).to.eq(0);
  });
  it("Basic Remove and Add", () => {
    const left = [1, 2];
    const right = [2, 3];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(1);
    expect(added[0]).to.eq(3);
    expect(removed.length).to.eq(1);
    expect(removed[0]).to.eq(1);
  });
  it("Middle Remove", () => {
    const left = [1, 2, 3];
    const right = [1, 3];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(0);
    expect(removed.length).to.eq(1);
    expect(removed[0]).to.eq(2);
  });
  it("Single Overlap", () => {
    const left = [1, 2, 10, 20, 21];
    const right = [3, 4, 5, 6, 10, 11, 12, 23];

    const added: number[] = [];
    const removed: number[] = [];
    ReconcileSortedArrays(left, right, (value) => added.push(value), (value) => removed.push(value));

    expect(added.length).to.eq(7);
    expect(removed.length).to.eq(4);
  });
});
