import { Injector } from "../../src/Utils/injector";
import { expect } from "chai";

describe("Injector", () => {
  it("should create scope with single value", () => {
    const parentInjector = new Injector();
    const result = parentInjector.Get("KEY01");
    expect(result).to.be.undefined;

    parentInjector.Set("KEY01", "injected_value");
    const result2 = parentInjector.Get("KEY01");
    expect(result2).to.be.eq("injected_value");
  });

  it("should create child scope to read from parent", () => {
    const parentInjector = new Injector();
    parentInjector.Set("KEY01", "injected_value");

    const childInjector = Injector.Scope(parentInjector, () => new Injector());
    const result = childInjector.Get("KEY01");
    expect(result).to.be.eq("injected_value");
  });

  it("should create child scope and override parent value", () => {
    const parentInjector = new Injector();
    parentInjector.Set("KEY01", "injected_value");

const childInjector = Injector.Scope(parentInjector, () => new Injector());
     childInjector.Set("KEY01", "overriden_value");
     const result = childInjector.Get("KEY01");
     expect(result).to.be.eq("overriden_value");
  });

  it("should not affect parent after child scope ends", () => {
    const parentInjector = new Injector();
    parentInjector.Set("KEY01", "parent_value");
    const childInjector = Injector.Scope(parentInjector, () => new Injector());
    childInjector.Set("KEY01", "child_value");
    expect(childInjector.Get("KEY01")).to.be.eq("child_value");
    expect(parentInjector.Get("KEY01")).to.be.eq("parent_value");
  });

  it("should restore previous scope after exception in action", () => {
    const root = new Injector();
    const child = new Injector();
    const error = new Error('test');
    try {
      Injector.Scope(root, () => {
        Injector.Scope(child, () => { throw error; });
      });
    } catch (e) {
      expect(e).to.equal(error);
    }
    expect(Injector.Current()).to.be.null;
  });
});
