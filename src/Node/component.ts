import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Destroy } from "../Utils/decorators";
import { ComponentNodeEvents } from "./componentNode.types";
import { ObservableScope } from "../Store/Tree/observableScope";
import { INodeRefBase, NodeRefTypes } from "./nodeRef.types";

export class Component<D = void, T = void, E = void> {
    private scope: ObservableScope<D>;
    private templates: T;
    private decoratorMap: Map<string, any>;

    public get Injector() {
        return this.nodeRef.injector;
    }

    public get Destroyed() {
        return this.nodeRef.destroyed;
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

    constructor(data: D | {(): D | Promise<D>}, templates: T, private nodeRef: INodeRefBase, private componentEvents: ComponentNodeEvents<E>) {
        this.scope = new ObservableScope<D>(data);
        this.templates = templates || {} as T;
        this.decoratorMap = new Map();
    }

    public Template(): NodeRefTypes | NodeRefTypes[] {
        return [];
    }

    public Bound() {

    }

    public Fire<P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event];
        eventCallback && eventCallback(data);
    }

    public Destroy() {
        Destroy.All(this);
    }
}

export namespace Component {

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: any, constructor: ComponentConstructor<D, T, E>) {
        return ComponentNode.ToFunction<D, T, E>(type, namespace, constructor);
    }

    export function Register<D = void, T = void, E = void>(name: string, constructor: ComponentConstructor<D, T, E>) {
        const componentFunction = ToFunction(`${name}-component`, undefined, constructor);

        class WebComponent extends HTMLElement {
            constructor() {
                super();

                const shadowRoot = this.attachShadow({ mode: 'open' });
                const node = componentFunction({});
                Attach(shadowRoot, node);
            }
        }

        customElements.define(name, WebComponent);
    }

    export function Attach(node: Node, nodeRef: NodeRefTypes) {
        NodeRef.Init(nodeRef);
        var rootRef = NodeRef.Wrap(node);
        NodeRef.AddChild(rootRef, nodeRef);
    }

}

export type ComponentConstructor<D, T, E> = { new (data: {(): D | Promise<D>}, templates: T, nodeRef: INodeRefBase, componentEvents: ComponentNodeEvents<E>): Component<D, T, E> };