import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { ComponentConstructor } from "./component";
export declare type ComponentNodeEvents<E> = {
    [P in keyof E]: {
        (data?: E[P]): void;
    };
};
export interface ComponentNodeFunctionParam<D, T, E> {
    immediate?: boolean;
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<ComponentNodeEvents<E>>;
    static?: D | Array<D>;
    data?: {
        (): D | Array<D>;
    };
    templates?: T;
}
export declare class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    private component;
    private componentEvents;
    constructor(nodeDef: NodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T);
    SetEvents(): void;
    Fire<P extends keyof E>(event: P, data?: E[P]): void;
    Init(): void;
    Destroy(): void;
    private SetChildren;
    private AddTemplate;
}
export declare namespace ComponentNode {
    function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>): (nodeDef: ComponentNodeFunctionParam<D, T, E>, templates?: T) => ComponentNode<D, T, E>;
}
