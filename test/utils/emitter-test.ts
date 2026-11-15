import { describe, it, expect } from "vitest";
import { Emitter, EmitterEvent } from "../../src/Utils/emitter";

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

describe("Emitter.Watch", () => {
  /** The events a watcher saw, by name */
  function watched(emitter: Emitter) {
    const events: string[] = [];
    Emitter.Watch(emitter, (event) => events.push(EmitterEvent[event]));
    return events;
  }

  it("reports the first listener and the last one gone, not the ones between", () => {
    const emitter = Emitter.Create();
    const events = watched(emitter);
    const a = () => {};
    const b = () => {};
    Emitter.On(emitter, a);
    Emitter.On(emitter, b);
    Emitter.Remove(emitter, a);
    expect(events).to.deep.eq(["SUBSCRIBED"]);
    Emitter.Remove(emitter, b);
    expect(events).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("reports nothing for a listener that isn't there", () => {
    const emitter = Emitter.Create();
    const events = watched(emitter);
    Emitter.Remove(emitter, () => {});
    Emitter.On(emitter, () => {});
    Emitter.Remove(emitter, () => {});
    expect(events).to.deep.eq(["SUBSCRIBED"]);
  });

  it("counts live listeners, not tombstones: the last one leaving during Emit, then a new one", () => {
    // The listener removes itself while the emitter is emitting, which leaves a tombstone until
    // compaction; the one it adds makes the array longer than one listener's
    const emitter = Emitter.Create();
    const events = watched(emitter);
    const late = () => {};
    const self = () => {
      Emitter.Remove(emitter, self);
      Emitter.On(emitter, late);
    };
    Emitter.On(emitter, self);
    Emitter.Emit(emitter);
    expect(events).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED", "SUBSCRIBED"]);
    Emitter.Remove(emitter, late);
    expect(events).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED", "SUBSCRIBED", "UNSUBSCRIBED"]);
  });

  it("reports a Clear of an emitter with listeners, and not of an empty one", () => {
    const emitter = Emitter.Create();
    const events = watched(emitter);
    Emitter.On(emitter, () => {});
    Emitter.On(emitter, () => {});
    Emitter.Clear(emitter);
    Emitter.Clear(emitter);
    expect(events).to.deep.eq(["SUBSCRIBED", "UNSUBSCRIBED"]);
    expect(emitter.length).to.eq(1);
  });

  it("calls every watcher, and stops calling one that unwatches", () => {
    const emitter = Emitter.Create();
    const first: EmitterEvent[] = [];
    const second: EmitterEvent[] = [];
    const watchFirst = (event: EmitterEvent) => first.push(event);
    Emitter.Watch(emitter, watchFirst);
    Emitter.Watch(emitter, (event) => second.push(event));
    const a = () => {};
    Emitter.On(emitter, a);
    Emitter.Unwatch(emitter, watchFirst);
    Emitter.Remove(emitter, a);
    expect(first).to.deep.eq([EmitterEvent.SUBSCRIBED]);
    expect(second).to.deep.eq([EmitterEvent.SUBSCRIBED, EmitterEvent.UNSUBSCRIBED]);
  });

  it("passes the watched emitter to the watcher", () => {
    const emitter = Emitter.Create();
    let seen: Emitter | undefined;
    Emitter.Watch(emitter, (_event, source) => (seen = source));
    Emitter.On(emitter, () => {});
    expect(seen).to.eq(emitter);
  });

  it("emits to its listeners as before, with a watcher", () => {
    const emitter = Emitter.Create<[number]>();
    watched(emitter);
    const calls: number[] = [];
    Emitter.On(emitter, (n) => calls.push(n));
    Emitter.Emit(emitter, 7);
    expect(calls).to.deep.eq([7]);
  });
});
