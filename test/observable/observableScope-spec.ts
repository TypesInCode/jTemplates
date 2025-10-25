import { expect } from 'chai';
import 'mocha';
import { ObservableScope } from '../../src/Store/Tree/observableScope';

describe("Observable Scope", () => {
    it('Basic Test', () => {
        const source = { obj: { val: "test" } };
        const suffix = { value: "PREFIX" };
        const scope = ObservableScope.Create(() => source.obj);
        const scopeSuffix = ObservableScope.Create(() => suffix.value);

        function getScopeValue() {
            return `${ObservableScope.Value(scope)?.val} ${ObservableScope.Value(scopeSuffix)}`;
        }
        const scope2 = ObservableScope.Create(getScopeValue);

        ObservableScope.Watch(scope2, (scope) => console.log("scope2", ObservableScope.Value(scope)));
        expect(ObservableScope.Value(scope2)).to.eq("test PREFIX");

        source.obj = { val: "changed" };
        ObservableScope.Update(scope);

        suffix.value = "CHANGED"
        ObservableScope.Update(scopeSuffix);

        // expect(ObservableScope.Value(scope2)).to.eq("changed");
    });

    it('Should handle null/undefined values properly', () => {
        const scope = ObservableScope.Create(() => null);
        expect(ObservableScope.Value(scope)).to.be.null;
        
        const scope2 = ObservableScope.Create(() => undefined);
        expect(ObservableScope.Value(scope2)).to.be.undefined;
    });

    it('Should properly destroy scopes and cleanup', () => {
        const source = { value: "test" };
        const scope = ObservableScope.Create(() => source.value);
        
        // Verify scope is not destroyed initially
        expect(scope.destroyed).to.be.false;
        
        // Destroy the scope
        ObservableScope.Destroy(scope);
        
        // Verify scope is marked as destroyed
        expect(scope.destroyed).to.be.true;
    });

    it('Should support multiple watchers on same scope', () => {
        const source = { value: "test" };
        const scope = ObservableScope.Create(() => source.value);
        
        let callCount1 = 0;
        let callCount2 = 0;
        
        // Create simple callbacks that don't return values
        const callback1 = (s: any) => { callCount1++; };
        const callback2 = (s: any) => { callCount2++; };
        
        ObservableScope.Watch(scope, callback1);
        ObservableScope.Watch(scope, callback2);
        
        // Update should trigger both watchers
        source.value = "changed";
        ObservableScope.Update(scope);
        
        expect(callCount1).to.eq(1);
        expect(callCount2).to.eq(1);
    });

    it('Should properly remove watchers', () => {
        const source = { value: "test" };
        const scope = ObservableScope.Create(() => source.value);
        
        let callCount = 0;
        const callback = (s: any) => { callCount++; };
        
        ObservableScope.Watch(scope, callback);
        ObservableScope.Unwatch(scope, callback);
        
        // Update should not trigger the removed watcher
        source.value = "changed";
        ObservableScope.Update(scope);
        
        expect(callCount).to.eq(0);
    });

    it('Should handle nested scope creation', () => {
        const source = { 
            nested: { 
                value: "test" 
            } 
        };
        const scope = ObservableScope.Create(() => source.nested);
        
        const nestedScope = ObservableScope.Create(() => ObservableScope.Value(scope).value);
        
        expect(ObservableScope.Value(nestedScope)).to.eq("test");
    });
});