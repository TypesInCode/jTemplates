import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Injector } from "../Utils/injector";

export class Component<D = any, T = any> {
    private scope: Scope<D>;

    protected get Scope() {
        return this.scope;
    }

    protected get Data() {
        return this.Scope.Value;
    }

    protected get NodeRef() {
        return this.nodeRef;
    }

    protected get Injector() {
        return this.injector;
    }

    protected get Templates() {
        return this.templates;
    }

    constructor(data: {(): D} | D, private templates: T, private nodeRef: NodeRef, private injector: Injector) {
        this.scope = new Scope(data);
        this.Init();
    }

    public Template(): NodeRef | NodeRef[] {
        return [];
    }

    public Bound() {

    }

    public Destroy() {
        this.scope.Destroy();
    }

    protected Init() {

    }
}

export namespace Component {

    export function ToFunction<D, T>(type: any, namespace: any, constructor: ComponentConstructor<D, T>) {
        return ComponentNode.ToFunction<D, T>(type, namespace, constructor);
    }

    /* export function Render(node: Node, type: any, namespace: string, constructor: ComponentConstructor<any, any>) {
        var rootRef = new NodeRef(node);
        var component = ComponentNode.ToFunction(type, namespace, constructor)({});
        rootRef.AddChild(component);
    } */

    export function Attach(node: Node, nodeRef: NodeRef) {
        var rootRef = new NodeRef(node);
        rootRef.AddChild(nodeRef);
    }

}

export type ComponentConstructor<D, T> = { new (data: {(): D} | D, templates: T, nodeRef: NodeRef, injector: Injector): Component<D, T> };