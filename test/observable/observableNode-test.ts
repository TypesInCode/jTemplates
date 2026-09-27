import { describe, it, expect } from "vitest";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

describe("Observable Node", () => {
    it('Create - Basic Object', () => {
        const proxy = ObservableNode.Create({ test: "value" });
        expect(proxy.test).to.eq("value");
    });

    it('Create - Basic Array', () => {
        const proxy = ObservableNode.Create(["test1", "test2"]);
        expect(proxy[0]).to.eq("test1");
        expect(proxy[1]).to.eq("test2");
    });

    it('Create - Nested Object', () => {
        const proxy = ObservableNode.Create({
            child: {
                test: "value"
            }
        });
        expect(proxy.child.test).to.eq("value");
    });

    it('ApplyDiff - Basic Object Update', () => {
        const proxy = ObservableNode.Create({ test: "value" });
        const diffResult = [
            {
                path: ["test"],
                value: "changed"
            }
        ];

        // Apply the diff
        ObservableNode.ApplyDiff(proxy, diffResult);

        // Value should be updated
        expect(proxy.test).to.eq("changed");
    });

    it('ApplyDiff - Nested Object Update', () => {
        const proxy = ObservableNode.Create({
            child: {
                test: "value"
            }
        });
        const diffResult = [
            {
                path: ["child", "test"],
                value: "changed"
            }
        ];

        // Apply the diff
        ObservableNode.ApplyDiff(proxy, diffResult);

        // Value should be updated
        expect(proxy.child.test).to.eq("changed");
    });

    it('Apply - Basic Object Update', () => {
        const proxy = ObservableNode.Create({ test: "value" });
        ObservableNode.Apply(proxy, { test: "changed" });
        expect(proxy.test).to.eq("changed");
    });

    it('Apply - Nested Object Update', () => {
        const proxy = ObservableNode.Create({
            child: {
                test: "value"
            }
        });
        ObservableNode.Apply(proxy, { child: { test: "changed" } });
        expect(proxy.child.test).to.eq("changed");
    });

    it('Apply - Add New Property', () => {
        const proxy = ObservableNode.Create({ test: "value" });
        ObservableNode.Apply(proxy, { test: "value", newProp: "new" });
        expect(proxy.newProp).to.eq("new");
    });

    it('Apply - Array Element Update', () => {
        const proxy = ObservableNode.Create({ items: [1, 2, 3] });
        ObservableNode.Apply(proxy, { items: [1, 2, 4] });
        expect(proxy.items[2]).to.eq(4);
    });

    it('Apply - Remove Property (Root Replacement)', () => {
        const proxy = ObservableNode.Create({ a: 1, b: 2 });
        ObservableNode.Apply(proxy, { a: 1 });
        expect(proxy.a).to.eq(1);
        expect((proxy as any).b).to.be.undefined;
    });

    it('Apply - No Change is a No-Op', () => {
        const proxy = ObservableNode.Create({ test: "value" });
        ObservableNode.Apply(proxy, { test: "value" });
        expect(proxy.test).to.eq("value");
    });

    it('Apply - Growing a Nested Array Emits Only Valid States', () => {
        // A growth diff is [{ ...length }, { ...[1] }]. Emitting after the length write let
        // synchronous readers see [a, <hole>] before the new element was assigned.
        const proxy = ObservableNode.Create({ root: [{ items: [{ id: "a" }] }] });
        const reader = ObservableScope.Create(() => {
            const items = proxy.root[0].items;
            const ids: (string | undefined)[] = [];
            for (let x = 0; x < items.length; x++) ids.push(items[x]?.id);
            return ids;
        });
        const seen: (string | undefined)[][] = [];
        ObservableScope.Watch(reader, (scope) => seen.push(ObservableScope.Peek(scope)));
        ObservableScope.Value(reader);

        ObservableNode.Apply(proxy, { root: [{ items: [{ id: "a" }, { id: "b" }] }] });

        expect(seen.length).to.be.greaterThan(0);
        for (const ids of seen) expect(ids).to.not.include(undefined);
        expect(ObservableScope.Value(reader)).to.deep.eq(["a", "b"]);
    });

    it('CreateFactory - With Alias Function', () => {
        // Create an alias function that maps objects to a specific property
        const aliasFn = (value: any) => {
            if (value && typeof value === 'object' && 'id' in value) {
                return { aliased: value.id };
            }
            return undefined;
        };

        const factory = ObservableNode.CreateFactory(aliasFn);
        const proxy = factory({ id: "test-id", name: "test-name" });

        // Should create proxy from the aliased object
        expect((proxy as any).aliased).to.eq("test-id");
    });

    it('CreateFactory - With Alias Function and Nested Structure', () => {
        // Create an alias function that maps objects to a nested property
        const aliasFn = (value: any) => {
            if (value && typeof value === 'object' && 'data' in value) {
                return {
                    wrapper: {
                        id: value.data.id
                    }
                };
            }
            return undefined;
        };

        const factory = ObservableNode.CreateFactory(aliasFn);
        const proxy = factory({ data: { id: "nested-id", name: "test" } });

        // Should create proxy from the aliased object with nested structure
        expect((proxy as any).wrapper.id).to.eq("nested-id");
    });

    it('Create - With Primitives', () => {
        const strProxy = ObservableNode.Create("string");
        const numProxy = ObservableNode.Create(42);
        const boolProxy = ObservableNode.Create(true);

        expect(strProxy).to.eq("string");
        expect(numProxy).to.eq(42);
        expect(boolProxy).to.eq(true);
    });

    it('Create - Complex Nested Structure', () => {
        const proxy = ObservableNode.Create({
            level1: {
                level2: {
                    value: "deep"
                },
                array: [1, 2, 3]
            }
        });

        expect(proxy.level1.level2.value).to.eq("deep");
        expect(proxy.level1.array[0]).to.eq(1);
    });
});
