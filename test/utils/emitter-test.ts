import { describe, it, expect } from "vitest";
import { Emitter } from "../../src/Utils/emitter";

describe("Emitter", () => {
  it("calls every listener when one removes itself during Emit", () => {
    // Under SYNC_SCHEDULING, Remove compacts the emitter immediately. Compacting while Emit
    // is iterating shifted the remaining listeners left, so the next one was skipped.
    const emitter = Emitter.Create();
    const calls: string[] = [];
    const a = () => {
      calls.push("a");
      Emitter.Remove(emitter, a);
    };
    Emitter.On(emitter, a);
    Emitter.On(emitter, () => calls.push("b"));
    Emitter.On(emitter, () => calls.push("c"));

    Emitter.Emit(emitter);
    expect(calls).to.deep.eq(["a", "b", "c"]);

    calls.length = 0;
    Emitter.Emit(emitter);
    expect(calls).to.deep.eq(["b", "c"]);
  });

  it("calls every remaining listener when a later one is removed during Emit", () => {
    const emitter = Emitter.Create();
    const calls: string[] = [];
    const c = () => calls.push("c");
    Emitter.On(emitter, () => {
      calls.push("a");
      Emitter.Remove(emitter, c);
    });
    Emitter.On(emitter, () => calls.push("b"));
    Emitter.On(emitter, c);
    Emitter.On(emitter, () => calls.push("d"));

    Emitter.Emit(emitter);
    expect(calls).to.include.members(["a", "b", "d"]);
    expect(calls).to.not.include("c");
  });
});
