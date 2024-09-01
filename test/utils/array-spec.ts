/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import * as chai from "chai";
import { RemoveNulls } from "../../src/Utils/array";
const expect = chai.expect;

describe("Array Remove Nulls", () => {
  it("Basic Remove Nulls 01", () => {
    const arr = [null, 1];
    RemoveNulls(arr);
    expect(arr.length).to.eq(1);
    expect(arr[0]).to.eq(1);
  });
  it("Basic Remove Nulls 01", () => {
    const arr = [1, null];
    RemoveNulls(arr);
    expect(arr.length).to.eq(1);
    expect(arr[0]).to.eq(1);
  });
  it("A lot of nulls", () => {
    const arr = [1, null, null, null, null, 2];
    RemoveNulls(arr);
    expect(arr.length).to.eq(2);
    expect(arr[1]).to.eq(2);
  });
  it("Groups of nulls", () => {
    const arr = [1, null, null, null, null, 2, null, null, null, 3];
    RemoveNulls(arr);
    expect(arr.length).to.eq(3);
    expect(arr[2]).to.eq(3);
  });
  it("Basic start index", () => {
    const arr = [1, null];
    RemoveNulls(arr, 1);
    expect(arr.length).to.eq(1);
    expect(arr[0]).to.eq(1);
  });
  it("Long start index", () => {
    const arr = [1, 2, 3, 4, null, 6];
    RemoveNulls(arr, 4);
    expect(arr.length).to.eq(5);
    expect(arr[4]).to.eq(6);
  });
});
