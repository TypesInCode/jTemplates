import { expect } from 'chai';
import 'mocha';
import { CreateProxy } from '../../src/Store/Tree/observableNode';
import { ObservableScope } from '../../src/Store/Tree/observableScope';

describe("Observable Node", () => {
    it('Basic Test', () => {
        const proxy = CreateProxy({ test: "value" });
        expect(proxy.test).to.eq("value");
    });
    it('Basic Update', () => {
        const proxy = CreateProxy({ test: "value" });
        proxy.Set("test", "changed");
        expect(proxy.test).to.eq("value");
        proxy.Update();
        expect(proxy.test).to.eq("changed");
    });
    it('Basic Scope', () => {
        const proxy = CreateProxy({ test: "value" });
        const scope = ObservableScope.Create(() => proxy.test);
        proxy.Set("test", "changed");
        expect(ObservableScope.Value(scope)).to.eq("value");
        proxy.Update();
        expect(ObservableScope.Value(scope)).to.eq("changed");
    });
    it('Child Object', () => {
        const proxy = CreateProxy({ child: { test: "value" } });
        const scope_pre = ObservableScope.Create(() => proxy.child);
        const scope = ObservableScope.Create(() => ObservableScope.Value(scope_pre).test);
        ObservableScope.Watch(scope_pre, (scope) => console.log("scope_pre", ObservableScope.Value(scope)));
        proxy.child.Set("test", "changed");
        expect(ObservableScope.Value(scope)).to.eq("value");
        proxy.child.Update();
        expect(ObservableScope.Value(scope)).to.eq("changed");
        proxy.Set("child", { test: "changed again" });
        proxy.Update();
        expect(ObservableScope.Value(scope)).to.eq("changed again");
    });
    it('Copy Child Object', () => {
        const proxy = CreateProxy({ child: { test: "value", other: "other" } });
        const scope = ObservableScope.Create(() => proxy.child.test);
        const copy = { ...proxy.child };
        copy.test = "changed";
        proxy.Set("child", copy);
        expect(ObservableScope.Value(scope)).to.eq("value");
        proxy.Update();
        expect(ObservableScope.Value(scope)).to.eq("changed");
    });
    it('Array Update', () => {
        const proxy = CreateProxy(["test1", "test2"]);
        expect(proxy[1]).to.eq("test2");
        const scope = ObservableScope.Create(() => proxy.length);
        proxy.Set(2, "changed");
        expect(ObservableScope.Value(scope)).to.eq(2);
        proxy.Update();
        expect(ObservableScope.Value(scope)).to.eq(3);
    });
    it('Array Splice', () => {
        const proxy = CreateProxy(["test1", "test2"]);
        const scope = ObservableScope.Create(() => proxy.length);
        const firstScope = ObservableScope.Create(() => proxy[1]);
        ObservableScope.Watch(firstScope, (scope) => console.log("scope", ObservableScope.Value(scope)));
        expect(ObservableScope.Value(firstScope)).to.eq("test2");
        proxy.splice(0, 1);
        expect(ObservableScope.Value(scope)).to.eq(1);
        expect(ObservableScope.Value(firstScope)).to.eq(undefined);
        proxy.splice(1, 0, "test3", "test4");
        expect(ObservableScope.Value(scope)).to.eq(3);
        expect(ObservableScope.Value(firstScope)).to.eq("test3");
    });
    it('Array with objects', () => {
        const rootProxy = CreateProxy([{ value: "first" }, { value: "second" }, { value: "third" }]);
        expect(rootProxy[0].value).to.eq("first");
        rootProxy[0].Set("value", "first changed");
        rootProxy[0].Update();
        rootProxy[1].Set("value", "second hidden changed");
        rootProxy[1].Update();
        rootProxy.Set(1, { value: "second changed" });
        const json = rootProxy.toJSON();
        expect(json[0].value).to.eq("first changed");
        expect(json[1].value).to.eq("second changed");
        expect(rootProxy[1].value).to.eq("second hidden changed");
        rootProxy.Update();
        expect(rootProxy[1].value).to.eq("second changed");
    }),
    it('Diff Object Basic Update', () => {
        const proxy = CreateProxy({ test: "value" }, true);
        proxy.Set("test", "changed");
        expect(proxy.test).to.eq("value");
        proxy.Update();
        expect(proxy.test).to.eq("changed");
    }),
    it('Diff Object Basic Update 2', () => {
        const proxy = CreateProxy({ test: "value", prop: "other" }, true);
        proxy.Set("test", "changed");
        expect(proxy.test).to.eq("value");
        proxy.Update();
        expect(proxy.test).to.eq("changed");
    }),
    it('Diff Object Child Update', () => {
        const proxy = CreateProxy({ test: { child: "value" }, prop: "other" }, true);
        proxy.Set("test", { child: "changed"});
        expect(proxy.test.child).to.eq("value");
        proxy.Update();
        expect(proxy.test.child).to.eq("changed");
    }),
    it('Diff Object Child Update 2', () => {
        const proxy = CreateProxy({ test: { child: "value", prop: "other" }, prop: "other" }, true);
        proxy.Set("test", { child: "changed", prop: "other" });
        expect(proxy.test.child).to.eq("value");
        proxy.Update();
        expect(proxy.test.child).to.eq("changed");
    }),
    it('Diff Object Child Update 2.1', () => {
        const proxy = CreateProxy({ test: { child: "value", prop: "other" }, prop: "other" }, true);
        expect(proxy.test.prop).to.eq("other");
        proxy.Set("test", { child: "changed", prop: "other" });
        proxy.Update();
        expect(proxy.test.child).to.eq("changed");
    }),
    it('Diff Sliced Array', () => {
        const proxy = CreateProxy(["test1", "test2"], true);
        expect(proxy[0]).to.eq("test1");
        proxy.splice(0, 1);
        proxy.Update();
        expect(proxy[0]).to.eq("test2");
    })
});

// root -> dependecies (...) -> output.subscribe()
// root -> dependencies (...) -> output.subscribe()

// name$ //gets the .name property
// description$ //get the .description

// { bigState: { leftState: any, rightState: any } }

// state = { bigState } // did I actually change anything?

// const state = state.bigState

// const state.leftState
