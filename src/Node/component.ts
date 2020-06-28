import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Injector } from "../Utils/injector";
import { Destroy } from "../Utils/decorators";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";

export class Component<D = void, T = void, E = void> {
    private scope: ObservableScopeAsync<D>;
    private templates: T;
    private decoratorMap: Map<string, any>;

    public get Injector() {
        return this.injector;
    }

    public get Destroyed() {
        return this.nodeRef.Destroyed;
    }

    public get DecoratorMap() {
        return this.decoratorMap;
    }

    protected get Scope() {
        return this.scope;
    }

    protected get Data() {
        return this.scope.Value;
    }

    protected get NodeRef() {
        return this.nodeRef;
    }

    protected get Templates() {
        return this.templates;
    }

    constructor(data: {(): D | Promise<D>} | D, templates: T, private nodeRef: ComponentNode<D, T, E>, private injector: Injector) {
        this.scope = new ObservableScopeAsync(data);
        this.templates = templates || {} as T;
        this.decoratorMap = new Map();
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
        Destroy.All(this);
    }
}

export namespace Component {

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: any, constructor: ComponentConstructor<D, T, E>) {
        return ComponentNode.ToFunction<D, T, E>(type, namespace, constructor);
    }

    export function Attach(node: Node, nodeRef: NodeRef) {
        var rootRef = new NodeRef(node);
        rootRef.AddChild(nodeRef);
    }

}

export type ComponentConstructor<D, T, E> = { new (data: {(): D | Promise<D>}, templates: T, nodeRef: NodeRef, injector: Injector): Component<D, T, E> };