"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scope_1 = require("../Store/scope/scope");
const nodeRef_1 = require("./nodeRef");
const componentNode_1 = require("./componentNode");
class Component {
    constructor(data, templates, nodeRef, injector) {
        this.templates = templates;
        this.nodeRef = nodeRef;
        this.injector = injector;
        this.scope = new scope_1.Scope(data);
        this.destroyables = [this.scope];
        this.Init();
    }
    get Injector() {
        return this.injector;
    }
    get Destroyables() {
        return this.destroyables;
    }
    get Data() {
        return this.scope.Value;
    }
    get NodeRef() {
        return this.nodeRef;
    }
    get Templates() {
        return this.templates;
    }
    Template() {
        return [];
    }
    Bound() {
    }
    Fire(event, data) {
        this.NodeRef.Fire(event, data);
    }
    Destroy() {
        this.Destroyables.forEach(d => d.Destroy());
    }
    Init() {
    }
}
exports.Component = Component;
(function (Component) {
    function ToFunction(type, namespace, constructor) {
        return componentNode_1.ComponentNode.ToFunction(type, namespace, constructor);
    }
    Component.ToFunction = ToFunction;
    function Attach(node, nodeRef) {
        var rootRef = new nodeRef_1.NodeRef(node);
        rootRef.AddChild(nodeRef);
    }
    Component.Attach = Attach;
})(Component = exports.Component || (exports.Component = {}));
//# sourceMappingURL=component.js.map