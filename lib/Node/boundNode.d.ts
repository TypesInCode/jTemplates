import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";
export declare type FunctionOr<T> = {
    (...args: Array<any>): T;
} | T;
export declare type BoundNodeEvents = {
    [name: string]: {
        (...args: Array<any>): void;
    };
};
export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    immediate?: boolean;
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<BoundNodeEvents>;
    static?: T | Array<T>;
    data?: any;
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}
export declare function defaultChildren(): Array<NodeRef>;
export declare abstract class BoundNode extends NodeRef {
    private nodeDef;
    private lastProperties;
    private immediate;
    private setText;
    private setProperties;
    private setAttributes;
    private setEvents;
    protected textScope: Scope<string>;
    protected propertiesScope: Scope<{
        [name: string]: any;
    }>;
    protected attributesScope: Scope<{
        [name: string]: string;
    }>;
    protected eventsScope: Scope<{
        [name: string]: (...args: Array<any>) => void;
    }>;
    protected readonly Immediate: boolean;
    constructor(nodeDef: NodeDefinition);
    ScheduleSetText(): void;
    SetText(): void;
    ScheduleSetProperties(): void;
    SetProperties(): void;
    ScheduleSetAttributes(): void;
    SetAttributes(): void;
    ScheduleSetEvents(): void;
    abstract SetEvents(): void;
    Init(): void;
    Destroy(): void;
    private SetPropertiesRecursive;
}
export declare namespace BoundNode {
    var Immediate: boolean;
}
