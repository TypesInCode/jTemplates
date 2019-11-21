import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Injector } from "../Utils/injector";
export declare class Component<D = void, T = void, E = void> {
    private templates;
    private nodeRef;
    private injector;
    private scope;
    private destroyables;
    readonly Injector: Injector;
    readonly Destroyables: {
        Destroy: () => void;
    }[];
    protected readonly Data: D;
    protected readonly NodeRef: ComponentNode<D, T, E>;
    protected readonly Templates: T;
    constructor(data: {
        (): D;
    } | D, templates: T, nodeRef: ComponentNode<D, T, E>, injector: Injector);
    Template(): NodeRef | NodeRef[];
    Bound(): void;
    Fire<P extends keyof E>(event: P, data?: E[P]): void;
    Destroy(): void;
    protected Init(): void;
}
export declare namespace Component {
    function ToFunction<D = void, T = void, E = void>(type: any, namespace: any, constructor: ComponentConstructor<D, T, E>): (nodeDef: import("../../../../Development/jTemplates_git/src/Node/componentNode").ComponentNodeFunctionParam<D, T, E>, templates?: T) => ComponentNode<D, T, E>;
    function Attach(node: Node, nodeRef: NodeRef): void;
}
export declare type ComponentConstructor<D, T, E> = {
    new (data: {
        (): D;
    } | D, templates: T, nodeRef: NodeRef, injector: Injector): Component<D, T, E>;
};
