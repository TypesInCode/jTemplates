import { expect } from 'chai';
import 'mocha';
import { ObservableScope } from '../../src/Store/Tree/observableScope';

describe("Observable Node", () => {
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
});