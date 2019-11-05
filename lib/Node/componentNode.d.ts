import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { Scope } from "../Store/scope/scope";
import { ComponentConstructor } from "./component";
export interface IComponentContext<D, T> {
    scope: Scope<D>;
    templates: T;
}
export interface ComponentNodeFunctionParam<D, T> {
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    static?: D | Array<D>;
    data?: {
        (): D | Array<D>;
    };
    templates?: T;
}
export declare class ComponentNode<D, T = any> extends BoundNode {
    private component;
    constructor(nodeDef: NodeDefinition<D>, constructor: ComponentConstructor<D, T>, templates: T);
    private setChildren;
    ScheduleSetChildren(): void;
    SetChildren(): void;
    Destroy(): void;
}
export declare namespace ComponentNode {
    function ToFunction<D, T>(type: any, namespace: string, constructor: ComponentConstructor<D, T>): (nodeDef: ComponentNodeFunctionParam<D, T>, templates?: T) => ComponentNode<D, T>;
}
