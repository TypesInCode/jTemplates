/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import {JsonTreeNode, IMirrorTreeNode} from "../src/Observable/jsonTreeNode"
import { Emitter } from "../src/emitter";
import * as chai from "chai";

const expect = chai.expect;

class MirrorNode extends Emitter implements IMirrorTreeNode {
    SetValue(value: any): void {
        throw new Error("Method not implemented.");
    }
    private sourceNode: JsonTreeNode<MirrorNode>;
    private localValue: any;

    GetSourceNode(): JsonTreeNode<MirrorNode> {
        //throw new Error("Method not implemented.");
        return this.sourceNode;
    }
    SetSourceNode(sourceNode: JsonTreeNode<MirrorNode>): void {
        //throw new Error("Method not implemented.");
        this.sourceNode = sourceNode;
        this.Fire("set");
    }

    NodeUpdated(): void {
        this.Fire("set");
    }
    Destroy(): void {
        //throw new Error("Method not implemented.");
        this.ClearAll();
    }

    public valueOf(): any {
        return this.sourceNode ? this.sourceNode.GetValue() : null;
    }
}

describe("JsonTreeNode", () => {
    it("string value", () => {
        var node = JsonTreeNode.Create("test", MirrorNode);
        expect(node.valueOf()).to.equal("test");
    });
    it("string value", () => {
        var node = JsonTreeNode.Create("test", MirrorNode);
        var eventFired = false;
        node.AddListener("set", () => {
            eventFired = true;
        });
        expect(node.valueOf()).to.equal("test");
        node.GetSourceNode().SetValue("test");
        expect(eventFired).to.be.false;
    });
    it("array value", () => {
        var node = JsonTreeNode.Create(["test1", "test2"], MirrorNode);
        expect(node.length).to.equal(2);
        expect(node[0].valueOf()).to.equal("test1");
        expect(node[1].valueOf()).to.equal("test2");
    });
    it("changed array value", () => {
        var node = JsonTreeNode.Create(["test1"], MirrorNode);
        var eventFired = false;
        node.AddListener("set", (node: MirrorNode) => {
            eventFired = true;
        });
        expect(node[0].valueOf()).to.equal("test1");
        node.GetSourceNode().SetValue([]);
        expect(node[0]).to.be.undefined;
        expect(eventFired).to.be.true;
    });
    it("changing nested array value", () => {
        var node = JsonTreeNode.Create(["test1", "test2"], MirrorNode);
        expect(node[1].valueOf()).to.equal("test2");
        var eventFired = false;
        (node[1] as any as MirrorNode).AddListener("set", (node: MirrorNode) => {
            eventFired = true;
        });
        (node as any)[1] = { Prop1: "value" };
        expect((node as any)[1].Prop1.valueOf()).to.equal("value");
        expect(eventFired).to.be.true;
    });
    it("object value", () => {
        var node = JsonTreeNode.Create({ prop1: "test1", prop2: "test2" }, MirrorNode);
        expect(node.prop1.valueOf()).to.equal("test1");
        expect(node.prop2.valueOf()).to.equal("test2");
    });
    it("nested object value", () => {
        var node = JsonTreeNode.Create({ prop1: { subprop1: "sub1", subprop2: "sub2" }, prop2: "test2" }, MirrorNode);
        expect(node.prop1.subprop1.valueOf()).to.equal("sub1");
        expect(node.prop1.subprop2.valueOf()).to.equal("sub2");
    });
    it("changing nested object value", () => {
        var node = JsonTreeNode.Create({ prop1: { subprop1: "sub1", subprop2: "sub2" }, prop2: "test2" }, MirrorNode);
        var eventFired = false;
        (node.prop1.subprop1 as any as MirrorNode).AddListener("set", () => {
            eventFired = true;
        });
        (node.prop1 as any).subprop1 = { sub2prop: "subsub1" };
        expect((node.prop1.subprop1 as any).sub2prop.valueOf()).to.equal("subsub1");
        expect(node.prop1.subprop2.valueOf()).to.equal("sub2");
        expect(eventFired).to.be.true;
    });
    it("event firing joined nodes", () => {
        var node = JsonTreeNode.Create("test", MirrorNode);
        var node2 = new MirrorNode();
        node.GetSourceNode().AddMirrorNode(node2);
        
        var eventFired = false;
        node2.AddListener("set", () => {
            eventFired = true;
        });
        node.GetSourceNode().SetValue("test 2");
        expect(node2.valueOf()).to.equal("test 2");
        expect(eventFired).to.be.true;
    });
    it("remove mirror node", () => {
        var node = JsonTreeNode.Create("test", MirrorNode);
        var node2 = new MirrorNode();
        node.GetSourceNode().AddMirrorNode(node2);
        var eventFired = false;
        node.AddListener("set", () => {
            eventFired = true;
        });
        var treeNode = node.GetSourceNode();
        treeNode.RemoveMirroredNode(node);

        expect(treeNode !== node.GetSourceNode()).to.be.true;
        node.GetSourceNode().SetValue("new value");

        expect(node.valueOf()).to.equal("new value");
        expect(node2.valueOf()).to.equal("test");
        /* expect(node.valueOf()).to.equal("test");
        treeNode.AddMirrorNode(node);
        expect(node.valueOf()).to.equal("test");
        expect(eventFired).to.be.true; */
    });
    it("remove nested mirror node", () => {
        var node = JsonTreeNode.Create({ Prop1: "prop1", Prop2: "prop2" }, MirrorNode);
        var node2 = new MirrorNode();
        node.GetSourceNode().AddMirrorNode(node2);
        var eventFired = false;
        (node.Prop1 as any as MirrorNode).AddListener("set", () => {
            eventFired = true;
        });

        var treeNode = node.GetSourceNode();
        treeNode.RemoveMirroredNode(node);
        expect(node.Prop1.valueOf()).to.equal("prop1");
        treeNode.AddMirrorNode(node);
        expect(node.Prop1.valueOf()).to.equal("prop1");
        expect(eventFired).to.be.true;
    });
});