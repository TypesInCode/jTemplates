/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import * as chai from "chai";
import { DistinctArray } from "../../src/Utils/distinctArray";
const expect = chai.expect;

describe("Distinct Array", () => {
  it("should create a distinct array with the provided id function", () => {
    const idFn = (value: number) => value;
    const distinctArray = DistinctArray.Create(idFn);
    
    expect(distinctArray.id).to.eq(idFn);
    expect(distinctArray.distinct).to.be.an("array");
    expect(distinctArray.array).to.be.an("array");
  });

  it("should push unique values and ignore duplicates", () => {
    const idFn = (value: number) => value;
    const distinctArray = DistinctArray.Create(idFn);
    
    DistinctArray.Push(distinctArray, 1);
    DistinctArray.Push(distinctArray, 2);
    DistinctArray.Push(distinctArray, 1); // Duplicate
    
    const result = DistinctArray.Get(distinctArray);
    
    expect(result).to.have.length(2);
    expect(result).to.contain(1);
    expect(result).to.contain(2);
  });

  it("should handle string values correctly", () => {
    const idFn = (value: string) => value.charCodeAt(0); // Convert to number
    const distinctArray = DistinctArray.Create(idFn);
    
    DistinctArray.Push(distinctArray, "apple");
    DistinctArray.Push(distinctArray, "banana");
    DistinctArray.Push(distinctArray, "apple"); // Duplicate
    
    const result = DistinctArray.Get(distinctArray);
    
    expect(result).to.have.length(2);
    expect(result).to.contain("apple");
    expect(result).to.contain("banana");
  });

  it("should handle object values with custom id function", () => {
    interface Person {
      id: number;
      name: string;
    }
    
    const idFn = (person: Person) => person.id;
    const distinctArray = DistinctArray.Create(idFn);
    
    const person1 = { id: 1, name: "Alice" };
    const person2 = { id: 2, name: "Bob" };
    const person3 = { id: 1, name: "Charlie" }; // Same id as person1
    
    DistinctArray.Push(distinctArray, person1);
    DistinctArray.Push(distinctArray, person2);
    DistinctArray.Push(distinctArray, person3); // Duplicate by id
    
    const result = DistinctArray.Get(distinctArray);
    
    expect(result).to.have.length(2);
    expect(result).to.contain(person1);
    expect(result).to.contain(person2);
  });

  it("should handle empty distinct array", () => {
    const idFn = (value: number) => value;
    const distinctArray = DistinctArray.Create(idFn);
    
    const result = DistinctArray.Get(distinctArray);
    
    expect(result).to.have.length(0);
  });

  it("should work with different id functions for same values", () => {
    const idFn1 = (value: number) => value;
    const idFn2 = (value: number) => value * 2;
    
    const distinctArray1 = DistinctArray.Create(idFn1);
    const distinctArray2 = DistinctArray.Create(idFn2);
    
    // Same values but different id functions
    DistinctArray.Push(distinctArray1, 1);
    DistinctArray.Push(distinctArray2, 1);
    
    const result1 = DistinctArray.Get(distinctArray1);
    const result2 = DistinctArray.Get(distinctArray2);
    
    expect(result1).to.have.length(1);
    expect(result2).to.have.length(1);
  });
});