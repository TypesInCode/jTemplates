import {JsonTreeNode, IMirrorTreeNode} from "./Observable/jsonTreeNode"
import { Emitter } from "./emitter";

class MirrorNode extends Emitter implements IMirrorTreeNode {
    SetValue(value: any): void {
        throw new Error("Method not implemented.");
    }
    private sourceNode: JsonTreeNode<MirrorNode>;

    GetSourceNode(): JsonTreeNode<MirrorNode> {
        //throw new Error("Method not implemented.");
        return this.sourceNode;
    }
    SetSourceNode(sourceNode: JsonTreeNode<MirrorNode>): void {
        //throw new Error("Method not implemented.");
        this.sourceNode = sourceNode;
    }
    NodeUpdated(): void {
        this.Fire("set");
    }
    Destroy(): void {
        //throw new Error("Method not implemented.");
        this.ClearAll();
    }

    public valueOf(): any {
        return this.sourceNode.GetValue();
    }
}

var node = JsonTreeNode.Create({ prop1: "prop1 test", prop2: "test2" }, MirrorNode);
var node2 = new MirrorNode();
node.GetSourceNode().AddMirrorNode(node2);

console.log(node.prop1.valueOf());

node2.GetSourceNode().RemoveMirroredNode(node);

node.prop2 = "node1";
(node2 as any).prop2 = "node2";

console.log(node.prop2.valueOf());
console.log((node2 as any).prop2.valueOf());

node2.GetSourceNode().SetValue({ prop3: "anything else" });

console.log(node.prop2.valueOf());

node2.GetSourceNode().AddMirrorNode(node);

console.log(node.prop2.valueOf());