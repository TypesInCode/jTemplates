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
        this.Init();
    }
    get Scope() {
        return this.scope;
    }
    get Data() {
        return this.Scope.Value;
    }
    get NodeRef() {
        return this.nodeRef;
    }
    get Injector() {
        return this.injector;
    }
    get Templates() {
        return this.templates;
    }
    Template() {
        return [];
    }
    Bound() {
    }
    Destroy() {
        this.scope.Destroy();
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
    function Render(node, type, namespace, constructor) {
        var rootRef = new nodeRef_1.NodeRef(node);
        var component = componentNode_1.ComponentNode.ToFunction(type, namespace, constructor)({});
        rootRef.AddChild(component);
    }
    Component.Render = Render;
})(Component = exports.Component || (exports.Component = {}));
//# sourceMappingURL=component.js.map