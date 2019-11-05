import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Injector } from "../Utils/injector";
export declare class Component<D = any, T = any> {
    private templates;
    private nodeRef;
    private injector;
    private scope;
    protected readonly Scope: Scope<D>;
    protected readonly Data: D;
    protected readonly NodeRef: NodeRef;
    protected readonly Injector: Injector;
    protected readonly Templates: T;
    constructor(data: {
        (): D;
    } | D, templates: T, nodeRef: NodeRef, injector: Injector);
    Template(): NodeRef | NodeRef[];
    Bound(): void;
    Destroy(): void;
    protected Init(): void;
}
export declare namespace Component {
    function ToFunction<D, T>(type: any, namespace: any, constructor: ComponentConstructor<D, T>): (nodeDef: import("../../../../Development/jTemplates_git/src/Node/componentNode").ComponentNodeFunctionParam<D, T>, templates?: T) => ComponentNode<D, T>;
    function Render(node: Node, type: any, namespace: string, constructor: ComponentConstructor<any, any>): void;
}
export declare type ComponentConstructor<D, T> = {
    new (data: {
        (): D;
    } | D, templates: T, nodeRef: NodeRef, injector: Injector): Component<D, T>;
};
