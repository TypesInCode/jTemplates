import { expect } from 'chai';
import 'mocha';
import { ObservableNode } from '../../src/Store/Tree/observableNode';

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