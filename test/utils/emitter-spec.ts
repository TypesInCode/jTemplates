/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import * as chai from "chai";
import { Emitter } from "../../src/Utils/emitter";
const expect = chai.expect;

describe("Emitter", () => {
  it("should create an emitter with a unique id", () => {
    const emitter1 = Emitter.Create();
    const emitter2 = Emitter.Create();
    
    expect(Emitter.GetId(emitter1)).to.be.a("number");
    expect(Emitter.GetId(emitter2)).to.be.a("number");
    expect(Emitter.GetId(emitter1)).to.not.eq(Emitter.GetId(emitter2));
  });

  it("should add callbacks with On", () => {
    const emitter = Emitter.Create();
    const callback = () => {};
    
    Emitter.On(emitter, callback);
    
    expect(emitter.length).to.eq(2);
    expect(emitter[1]).to.eq(callback);
  });

  it("should emit callbacks and remove those that return true", () => {
    const emitter = Emitter.Create();
    let callCount1 = 0;
    let callCount2 = 0;
    
    const callback1 = () => {
      callCount1++;
      return true; // This should cause the callback to be removed
    };
    
    const callback2 = () => {
      callCount2++;
    };
    
    Emitter.On(emitter, callback1);
    Emitter.On(emitter, callback2);
    
    Emitter.Emit(emitter);
    
    expect(callCount1).to.eq(1);
    expect(callCount2).to.eq(1);
    expect(emitter.length).to.eq(2); // Only the emitter id and one callback should remain
  });

  it("should emit callbacks without removing those that don't return true", () => {
    const emitter = Emitter.Create();
    let callCount1 = 0;
    let callCount2 = 0;
    
    const callback1 = () => {
      callCount1++;
      return false; // Should not remove
    };
    
    const callback2 = () => {
      callCount2++;
    };
    
    Emitter.On(emitter, callback1);
    Emitter.On(emitter, callback2);
    
    Emitter.Emit(emitter);
    
    expect(callCount1).to.eq(1);
    expect(callCount2).to.eq(1);
    expect(emitter.length).to.eq(3); // All callbacks should remain
  });

  it("should remove specific callbacks with Remove", () => {
    const emitter = Emitter.Create();
    let callCount1 = 0;
    let callCount2 = 0;
    
    const callback1 = () => {
      callCount1++;
    };
    
    const callback2 = () => {
      callCount2++;
    };
    
    Emitter.On(emitter, callback1);
    Emitter.On(emitter, callback2);
    
    Emitter.Remove(emitter, callback1);
    
    expect(emitter.length).to.eq(3); // Should have null in the removed position
    Emitter.Emit(emitter);
    
    expect(callCount1).to.eq(0); // callback1 should not be called
    expect(callCount2).to.eq(1); // callback2 should be called
  });

  it("should clear all callbacks with Clear", () => {
    const emitter = Emitter.Create();
    
    Emitter.On(emitter, () => {});
    Emitter.On(emitter, () => {});
    
    expect(emitter.length).to.eq(3);
    
    Emitter.Clear(emitter);
    
    expect(emitter.length).to.eq(1); // Only the id remains
  });

  it("should sort emitters by id", () => {
    const emitter1 = Emitter.Create();
    const emitter2 = Emitter.Create();
    
    const sorted = Emitter.Sort([emitter2, emitter1]);
    
    expect(sorted[0]).to.eq(emitter1);
    expect(sorted[1]).to.eq(emitter2);
  });

  it("should compare emitters by id", () => {
    const emitter1 = Emitter.Create();
    const emitter2 = Emitter.Create();
    
    expect(Emitter.Compare(emitter1, emitter2)).to.be.below(0);
    expect(Emitter.Compare(emitter2, emitter1)).to.be.above(0);
  });
});