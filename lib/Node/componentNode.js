"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const boundNode_1 = require("./boundNode");
const nodeConfig_1 = require("./nodeConfig");
const injector_1 = require("../Utils/injector");
const decorators_1 = require("../Utils/decorators");
class ComponentNode extends boundNode_1.BoundNode {
    constructor(nodeDef, constructor, templates) {
        super(nodeDef);
        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);
    }
    SetEvents() {
        this.componentEvents = this.eventsScope.Value;
    }
    Fire(event, data) {
        var eventCallback = this.componentEvents && this.componentEvents[event];
        eventCallback && eventCallback(data);
    }
    Init() {
        super.Init();
        this.SetChildren();
    }
    Destroy() {
        super.Destroy();
        this.component.Destroy();
    }
    SetChildren() {
        if (decorators_1.PreReq.Has(this.component)) {
            var preNodes = null;
            injector_1.Injector.Scope(this.Injector, () => preNodes = decorators_1.PreReqTemplate.Get(this.component));
            preNodes.forEach(node => {
                this.AddChild(node);
            });
            decorators_1.PreReq.All(this.component).then(() => {
                nodeConfig_1.NodeConfig.scheduleUpdate(() => {
                    if (this.Destroyed)
                        return;
                    preNodes.forEach(node => {
                        node.Detach();
                        node.Destroy();
                    });
                    this.AddTemplate();
                });
            });
        }
        else
            this.AddTemplate();
    }
    AddTemplate() {
        var nodes = null;
        injector_1.Injector.Scope(this.Injector, () => {
            var parentVal = boundNode_1.BoundNode.Immediate;
            boundNode_1.BoundNode.Immediate = this.Immediate;
            nodes = this.component.Template();
            boundNode_1.BoundNode.Immediate = parentVal;
        });
        if (!Array.isArray(nodes))
            nodes = [nodes];
        nodes.forEach(node => {
            this.AddChild(node);
        });
        setTimeout(() => this.component.Bound(), 0);
    }
}
exports.ComponentNode = ComponentNode;
(function (ComponentNode) {
    function ToFunction(type, namespace, constructor) {
        return (nodeDef, templates) => {
            var def = {
                type: type,
                namespace: namespace,
                immediate: nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data,
            };
            var comp = new ComponentNode(def, constructor, templates);
            comp.Init();
            return comp;
        };
    }
    ComponentNode.ToFunction = ToFunction;
})(ComponentNode = exports.ComponentNode || (exports.ComponentNode = {}));
//# sourceMappingURL=componentNode.js.map