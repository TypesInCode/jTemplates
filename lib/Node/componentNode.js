"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const boundNode_1 = require("./boundNode");
const injector_1 = require("../Utils/injector");
const elementNode_1 = require("./elementNode");
class ComponentNode extends boundNode_1.BoundNode {
    constructor(nodeDef, constructor, templates) {
        super(nodeDef);
        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);
        if (elementNode_1.ElementNode.BindImmediately || nodeDef.immediate) {
            var staticBindingValue = elementNode_1.ElementNode.BindImmediately;
            elementNode_1.ElementNode.BindImmediately = true;
            this.SetChildren();
            elementNode_1.ElementNode.BindImmediately = staticBindingValue;
        }
        else
            this.SetChildren();
    }
    SetEvents() {
        this.componentEvents = this.eventsScope.Value;
    }
    Fire(event, data) {
        var eventCallback = this.componentEvents && this.componentEvents[event];
        eventCallback && eventCallback(data);
    }
    SetChildren() {
        var nodes = null;
        injector_1.Injector.Scope(this.Injector, () => nodes = this.component.Template());
        if (!Array.isArray(nodes))
            nodes = [nodes];
        nodes.forEach(node => this.AddChild(node));
        setTimeout(() => this.component.Bound(), 0);
    }
    Destroy() {
        super.Destroy();
        this.component.Destroy();
    }
}
exports.ComponentNode = ComponentNode;
(function (ComponentNode) {
    function ToFunction(type, namespace, constructor) {
        return (nodeDef, templates) => {
            var def = {
                type: type,
                namespace: namespace,
                immediate: !!nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data,
            };
            return new ComponentNode(def, constructor, templates);
        };
    }
    ComponentNode.ToFunction = ToFunction;
})(ComponentNode = exports.ComponentNode || (exports.ComponentNode = {}));
//# sourceMappingURL=componentNode.js.map