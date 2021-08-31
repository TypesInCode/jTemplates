import { expect } from 'chai';
import 'mocha';
import { DiffTreeScope } from '../../src/Store/Diff/diffTree';
import { ObservableTree } from '../../src/Store/Tree/observableTree';

describe("Diff Observable Test", () => {
    it('Default Test', () => {
        var observable = new ObservableTree();

        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();

        var resp = tree.DiffPath("root", { value1: "test", value2: "test" });
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });

        var scope = observable.Scope("root", (val: any) => val.value2);
        var value = null;
        scope.Watch(scope => {
            value = scope.Value;
        });
        expect(value).to.equal("test");

        resp = tree.DiffPath("root", { value1: "test", value2: "test2" });
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });

        expect(value).to.equal("test2");

        resp = tree.DiffPath("root", { value1: "test2", value2: "test3" });
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });

        expect(value).to.equal("test3");
    });
    it('Array Actions', () => {
        var observable = new ObservableTree();

        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();

        var resp = tree.DiffPath("root", [1, 2]);
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });

        var scope = observable.Scope("root", (val: Array<number>) => {
            var ret = val.filter(n => n === 2)
            return ret;
        });
        var fired = false;
        scope.Watch(() => {
            fired = true;
        });
        expect(scope.Value.length).to.equal(1);

        resp = tree.DiffPath("root", [1, 2, 2]);
        observable.WriteAll(resp);

        expect(fired).to.be.true;
        expect(scope.Value.length).to.equal(2);

        resp = tree.DiffPath("root", [1, 2, 3]);
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });
        expect(scope.Value.length).to.equal(1);

        resp = tree.DiffPath("root", [1, 3]);
        resp.forEach(val => {
            observable.Write(val.path, val.value);
        });
        expect(scope.Value.length).to.equal(0);
    });
    it('Modifying Length', () => {
        var observable = new ObservableTree();
        observable.Write("root", [1, 2, 3, 4]);
        var rootScope = observable.Scope<number[]>("root");
        expect(rootScope.Value[3]).to.equal(4);
        expect(rootScope.Value.length).to.equal(4);
        observable.Write("root.length", 3);
        expect(rootScope.Value.length).to.equal(3);
        expect(rootScope.Value[3]).to.equal(undefined);
    });
});