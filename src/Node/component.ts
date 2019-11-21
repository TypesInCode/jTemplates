import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Injector } from "../Utils/injector";

export class Component<D = void, T = void, E = void> {
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

    constructor(data: {(): D} | D, private templates: T, private nodeRef: ComponentNode<D, T, E>, private injector: Injector) {
        this.scope = new Scope(data);
        this.Init();
    }

    public Template(): NodeRef | NodeRef[] {
        return [];
    }

    public Bound() {

    }

    public Fire<P extends keyof E>(event: P, data?: E[P]) {
        this.NodeRef.Fire(event as any, data);
    }

    public Destroy() {
        this.scope.Destroy();
    }

    protected Init() {

    }
}

export namespace Component {

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: any, constructor: ComponentConstructor<D, T, E>) {
        return ComponentNode.ToFunction<D, T, E>(type, namespace, constructor);
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

export type ComponentConstructor<D, T, E> = { new (data: {(): D} | D, templates: T, nodeRef: NodeRef, injector: Injector): Component<D, T, E> };