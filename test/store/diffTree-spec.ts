import { expect } from 'chai';
import 'mocha';
import { DiffTreeScope } from '../../src/Store/Diff/diffTree';
import { DiffSync } from '../../src/Store/Diff/diffSync';

describe("Diff Test", () => {
    it('Default Test', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();
        var resp = tree.DiffPath("root", { value: "test" });
        expect(resp.length).to.equal(1);
        expect(resp[0].path).to.equal("root");
        expect(resp[0].value.value).to.equal("test");
    });
    it('Basic No Change', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();
        tree.DiffPath("root", { value: "test" });
        var resp = tree.DiffPath("root", { value: "test" });
        expect(resp.length).to.equal(0);
    }),
    it('Changed Value', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();
        tree.DiffPath("root", { value: "test" });
        var resp = tree.DiffPath("root", { value: "changed" });
        expect(resp.length).to.equal(1);
        expect(resp[0].path).to.equal("root");
        expect(resp[0].value.value).to.equal("changed");
    });
    it('Add property', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();
        tree.DiffPath("root", { value: "test" });
        var resp = tree.DiffPath("root", { value: "test", newProp: "here" });
        expect(resp.length).to.equal(1);
        expect(resp[0].path).to.equal("root.newProp");
        expect(resp[0].value).to.equal("here");
    }),
    it('Swapped properties', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr();
        tree.DiffPath("root", { value: "test", oldProp: "not here" });
        var resp = tree.DiffPath("root", { value: "test", newProp: "here" });
        expect(resp.length).to.equal(1);
        expect(resp[0].path).to.equal("root");
    }),
    it('Basic Key Ref', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr((val) => val && val._id);
        var resp = tree.DiffPath("root", { _id: "uniquekey", value: "changed" });
        expect(resp.length).to.equal(2);
    });
    it('Updated Key Ref', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr((val) => val && val._id);
        tree.DiffPath("root", { _id: "uniquekey", value: "changed" });
        var resp = tree.DiffPath("root", { _id: "uniquekey", value: "different" });
        expect(resp.length).to.equal(1);
        expect(resp[0].path).to.equal("uniquekey.value");
        expect(resp[0].value).to.equal("different");
    });
    it('Nested Key Ref', () => {
        var treeCnstrctr = DiffTreeScope();
        var tree = new treeCnstrctr((val) => val && val._id);
        var resp = tree.DiffPath("root", { _id: "uniquekey", value: "changed", child: { _id: "uniquekey2", value: "child value" } });
        expect(resp.length).to.equal(3);
    });
    it('Push Array', () => {
        var tree = new DiffSync();
        tree.DiffPath("root", [1, 2]);
        var resp = tree.DiffPath('root.2', 3);
        expect(resp.length).to.equal(1);
    });
    it('Overwrite Array', () => {
        var tree = new DiffSync();
        tree.DiffPath("root", [1, 2]);
        var resp = tree.DiffPath('root', [1, 2, 3]);
        expect(resp.length).to.equal(2);
    });
});