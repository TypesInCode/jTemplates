import { expect } from 'chai';
import 'mocha';
import { ObservableTree } from '../../src/Store/Tree/observableTree';

describe("Observable Tree V2 Test", () => {
    it('Default Test', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", { this: "that" });
        const scope = tree.Scope<{ this: string }>("ROOT");
        expect(scope.Value?.this).to.equal("that");
    });
    it('Update Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", { this: "that" });
        tree.Write("ROOT.this", "updated")
        const scope = tree.Scope<{ this: string }>("ROOT");
        expect(scope.Value?.this).to.equal("updated");
    });
    it('Watch Update Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", { this: "that" });
        const scope = tree.Scope<{ this: string }>("ROOT");
        let eventFired = 0;
        scope.Watch(scope => {
            eventFired++;
        });
        expect(scope.Value?.this).to.equal("that");
        tree.Write("ROOT.this", "updated")
        expect(eventFired).to.equal(1);
    });
    it('Complex Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", { this: { child: "that"} });
        tree.Write("ROOT.this.child", "updated")
        const scope = tree.Scope<{ this: { child: string } }>("ROOT");
        expect(scope.Value?.this.child).to.equal("updated");
    });
    it('Watch Complex Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", { this: { child: "that"} });
        const scope = tree.Scope<{ this: { child: string } }, string>("ROOT", obj => obj.this.child);
        let eventFired = 0;
        scope.Watch(scope => {
            eventFired++;
        });
        expect(scope.Value).to.equal("that");
        tree.Write("ROOT.this.child", "updated");
        expect(scope.Value).to.equal("updated");
        tree.Write("ROOT.this", { child: "updated 2"});
        expect(scope.Value).to.equal("updated 2");
        tree.Write("ROOT", { this: { child: "updated 3"} });
        expect(scope.Value).to.equal("updated 3");
        expect(eventFired).to.equal(4);
    });
    it('Watch Array Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", ["this", "that"]);
        const scope = tree.Scope<string[]>("ROOT");
        let eventFired = 0;
        scope.Watch(scope => {
            eventFired++;
        });
        expect(scope.Value?.[0]).to.equal("this");
        tree.Write("ROOT.0", "updated");
        expect(scope.Value?.[0]).to.equal("updated");
        expect(eventFired).to.equal(1);
    });
    it('Map Array Value', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", [{ val: "this" }, { val: "that" }]);
        const scope = tree.Scope<{ val: string }[], string[]>("ROOT", strs => strs.map(str => str.val + " mapped"));
        let eventFired = 0;
        scope.Watch(scope => {
            eventFired++;
        });
        expect(scope.Value?.[0]).to.equal("this mapped");
        tree.Write("ROOT.0.val", "updated");
        expect(scope.Value?.[0]).to.equal("updated mapped");
        expect(eventFired).to.equal(2);
    });
    it('Array Push, Length Updated', () => {
        const tree = new ObservableTree();
        tree.Write("ROOT", ["this", "that"]);
        const scope = tree.Scope<string[], number>("ROOT", arr => arr.length);
        expect(scope.Value).to.equal(2);
        tree.Write("ROOT.2", "updated");
        expect(scope.Value).to.equal(3);
    });
});