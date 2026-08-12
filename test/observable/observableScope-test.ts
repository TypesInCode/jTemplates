import { describe, it, expect } from "vitest";
import {
  GateScope,
  IObservableScope,
  ObservableScope,
} from "../../src/Store/Tree/observableScope";

describe("Observable Scope", () => {
  it("Basic Test", () => {
    const source = { obj: { val: "test" } };
    const suffix = { value: "PREFIX" };
    const scope = ObservableScope.Basic(() => source.obj);
    const scopeSuffix = ObservableScope.Basic(() => suffix.value);

    function getScopeValue() {
      return `${ObservableScope.Value(scope)?.val} ${ObservableScope.Value(scopeSuffix)}`;
    }
    const scope2 = ObservableScope.Create(getScopeValue);

    ObservableScope.Watch(scope2, (scope) =>
      console.log("scope2", ObservableScope.Value(scope)),
    );
    expect(ObservableScope.Value(scope2)).to.eq("test PREFIX");

    source.obj = { val: "changed" };
    ObservableScope.Update(scope);

    suffix.value = "CHANGED";
    ObservableScope.Update(scopeSuffix);

    expect(ObservableScope.Value(scope2)).to.eq("changed CHANGED");
  });

  it("Should handle null/undefined values properly", () => {
    const scope = ObservableScope.Create(() => null as any);
    expect(ObservableScope.Value(scope)).to.be.null;
    expect(scope.type).to.eq("static");

    const scope2 = ObservableScope.Create(() => undefined as any);
    expect(ObservableScope.Value(scope2)).to.be.undefined;
  });

  it("Should support multiple watchers on same scope", () => {
    const source = { value: "test" };
    const scope = ObservableScope.Basic(() => source.value);

    let callCount1 = 0;
    let callCount2 = 0;

    // Create simple callbacks that don't return values
    const callback1 = (s: any) => {
      callCount1++;
    };
    const callback2 = (s: any) => {
      callCount2++;
    };

    ObservableScope.Watch(scope, callback1);
    ObservableScope.Watch(scope, callback2);

    // Update should trigger both watchers
    source.value = "changed";
    ObservableScope.Update(scope);

    expect(callCount1).to.eq(1);
    expect(callCount2).to.eq(1);
  });

  it("Should properly remove watchers", () => {
    const source = { value: "test" };
    const scope = ObservableScope.Create(() => source.value);

    let callCount = 0;
    const callback = (s: any) => {
      callCount++;
    };

    ObservableScope.Watch(scope, callback);
    ObservableScope.Unwatch(scope, callback);

    // Update should not trigger the removed watcher
    source.value = "changed";
    ObservableScope.Update(scope);

    expect(callCount).to.eq(0);
  });

  it("Should handle nested scope creation", () => {
    const source = {
      nested: {
        value: "test",
      },
    };
    const scope = ObservableScope.Create(() => source.nested);

    const nestedScope = ObservableScope.Create(
      () => ObservableScope.Value(scope).value,
    );

    expect(ObservableScope.Value(nestedScope)).to.eq("test");
  });

  it("Simple gate scope test", () => {
    let temp = "temp1";

    const scope = ObservableScope.Gated(() => temp);
    expect(ObservableScope.Value(scope)).to.eq("temp1");
    let fired = false;
    ObservableScope.Watch(scope, (scope) => (fired = true));
    ObservableScope.Update(scope);

    expect(fired).to.eq(false);

    temp = "temp2";
    ObservableScope.Update(scope);

    expect(fired).to.eq(true);
  });

  it("Calc helper function test", () => {
    let temp = "temp1";

    const sourceScope = ObservableScope.Basic(() => temp);
    const destScope = ObservableScope.Create(() =>
      GateScope(() => ObservableScope.Value(sourceScope)),
    );

    expect(ObservableScope.Value(sourceScope)).to.eq("temp1");
    expect(ObservableScope.Value(destScope)).to.eq("temp1");

    let sourceFired = false;
    let destFired = false;
    ObservableScope.Watch(sourceScope, () => (sourceFired = true));
    ObservableScope.Watch(destScope, () => (destFired = true));

    ObservableScope.Update(sourceScope);
    expect(sourceFired).to.eq(true);
    expect(destFired).to.eq(false);

    temp = "temp2";
    ObservableScope.Update(sourceScope);
    expect(sourceFired).to.eq(true);
    expect(destFired).to.eq(true);
  });

  it("Debounced observable scope test", async () => {
    let temp = "temp1";
    let sourceScope = ObservableScope.Basic(() => temp);

    let debouncedScope = ObservableScope.Create(
      async () =>
        new Promise<string>((resolve) => {
          let sourceValue = ObservableScope.Value(sourceScope);
          console.log("calculating", sourceValue);
          setTimeout(() => {
            console.log("resolving", sourceValue);
            resolve(sourceValue);
          }, 10);
        }),
    );

    const promise = new Promise<string>((resolve) => {
      const watchFn = (scope: IObservableScope<string>) => {
        ObservableScope.Unwatch(scope, watchFn);
        const value = ObservableScope.Peek(scope);
        console.log("watchFn", value);
        resolve(value);
      };

      ObservableScope.Watch(debouncedScope, watchFn);
    });

    let currValue = ObservableScope.Value(debouncedScope);
    expect(currValue).to.eq(null);

    temp = "temp2";
    ObservableScope.Update(sourceScope);
    await new Promise((resolve) => setTimeout(resolve, 0));
    currValue = ObservableScope.Value(debouncedScope);
    expect(currValue).to.eq(null);

    temp = "temp3";
    ObservableScope.Update(sourceScope);
    await new Promise((resolve) => setTimeout(resolve, 0));
    currValue = ObservableScope.Value(debouncedScope);
    expect(currValue).to.eq(null);

    const result = await promise;
    expect(result).to.eq("temp3");
  });
});
