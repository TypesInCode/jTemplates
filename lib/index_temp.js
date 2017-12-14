"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var jsonTreeNode_1 = require("./Observable/jsonTreeNode");
var emitter_1 = require("./emitter");
var MirrorNode = (function (_super) {
    __extends(MirrorNode, _super);
    function MirrorNode() {
        _super.apply(this, arguments);
    }
    MirrorNode.prototype.GetSourceNode = function () {
        return this.sourceNode;
    };
    MirrorNode.prototype.SetSourceNode = function (sourceNode) {
        this.sourceNode = sourceNode;
    };
    MirrorNode.prototype.NodeUpdated = function () {
        this.Fire("set");
    };
    MirrorNode.prototype.Destroy = function () {
        this.ClearAll();
    };
    MirrorNode.prototype.valueOf = function () {
        return this.sourceNode.GetValue();
    };
    return MirrorNode;
}(emitter_1.Emitter));
var node = jsonTreeNode_1.JsonTreeNode.Create({ prop1: "prop1 test", prop2: "test2" }, MirrorNode);
var node2 = new MirrorNode();
node.GetSourceNode().AddMirrorNode(node2);
console.log(node.prop1.valueOf());
node2.GetSourceNode().RemoveMirroredNode(node);
node.prop2 = "node1";
node2.prop2 = "node2";
console.log(node.prop2.valueOf());
console.log(node2.prop2.valueOf());
node2.GetSourceNode().SetValue({ prop3: "anything else" });
console.log(node.prop2.valueOf());
node2.GetSourceNode().AddMirrorNode(node);
console.log(node.prop2.valueOf());
//# sourceMappingURL=index_temp.js.map