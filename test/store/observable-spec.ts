import { expect, assert } from 'chai';
import 'mocha';
import { ObservableTree } from '../../src/Store/Tree/observableTree';

describe("Observables Test", () => {
    it('Default Test', () => {
        var tree = new ObservableTree();
        tree.Write("ROOT", { test: "is here" });
        var scope = tree.Scope<{ test: string }, string>("ROOT", val => {
            return val.test;
        });

        expect(scope.Value).to.equal("is here");
    });
    it('Scope Changed', () => {
        var tree = new ObservableTree();
        tree.Write("ROOT", { test: "is here" });
        var scope = tree.Scope<{ test: string }, string>("ROOT", val => {
            return val.test;
        });

        expect(scope.Value).to.equal("is here");

        tree.Write(`ROOT.test`, "something new");
        expect(scope.Value).to.equal("something new");
    });
    it('Reference Value', () => {
        var tree = new ObservableTree(val => {
            if(val && val.match(/^[A-Z]{4}$/))
                return val;
        });

        tree.Write("ROOT", { reference: "ABCD", value: "potato" });
        tree.Write("ABCD", { value: "referenced value" });
        tree.Write("EFGH", { value: "new ref value" });

        var scope = tree.Scope<{ reference: { value: string }, value: string }, string>("ROOT", val => {
            return `${val.reference.value} ${val.value}`;
        });

        expect(scope.Value).to.equal("referenced value potato");
        tree.Write(`ROOT.reference`, "EFGH"); // "EFGH");
        expect(scope.Value).to.equal("new ref value potato");
        tree.Write("EFGH.value", "updated ref value");
        expect(scope.Value).to.equal("updated ref value potato");
    });
    it('Simple Array', () => {
        var tree = new ObservableTree();
        tree.Write("ROOT", [1, 2, 3]);
        
        var scope = tree.Scope<Array<number>, Array<number>>("ROOT", val => {
            return val.filter(n => n === 2)
        });
        expect(scope.Value.length).to.equal(1);

        tree.Write(`ROOT.0`, 2);
        expect(scope.Value.length).to.equal(2);

        tree.Write(`ROOT.2`, 2);
        expect(scope.Value.length).to.equal(3);
    });
    it('Push Array', () => {
        var tree = new ObservableTree();
        tree.Write("ROOT", [1, 2, 3]);
        
        var scope = tree.Scope<Array<number>, number>("ROOT", val => {
            return val.length;
        });
        expect(scope.Value).to.equal(3);

        tree.Write("ROOT.3", 4);
        expect(scope.Value).to.equal(4);
    });
    it('Reference Array', () => {
        var tree = new ObservableTree(val => {
            if(val && val.match(/^[A-Z]{4}$/))
                return val;
        });
        tree.Write("ROOT", ["AAAA"]); //, "BBBB", "CCCC"]);
        tree.Write("AAAA", { value: "First" });
        tree.Write("BBBB", { value: "Second" });
        tree.Write("CCCC", { value: "Third" });

        var scope = tree.Scope<Array<{ value: string }>, string>("ROOT", val => {
            return val.map(n => n.value).join(" ");
        });

        expect(scope.Value).to.equal("First"); // Second Third");
        tree.Write("AAAA", { value: "First 2" });
        expect(scope.Value).to.equal("First 2"); // Second Third");
        tree.Write("AAAA", { value: "First 3" });
        expect(scope.Value).to.equal("First 3"); // Second Third");
    });
    it('Write Error', () => {
        var tree = new ObservableTree();
        tree.Write("ROOT", { test: null });
        try {
            tree.Write(`ROOT.test.value`, "value");
        }
        catch (e) {
            expect(e).to.exist;
        }
    });
});