import { NodeRef } from "./nodeRef";
export declare type FunctionOr<T> = {
    (...args: Array<any>): T;
} | T;
export interface NodeDefinition<T> {
    type: any;
    namespace: string;
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
    static?: T | Array<T>;
    data?: any;
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}
export declare function defaultChildren(): Array<NodeRef>;
export declare class BoundNode extends NodeRef {
    private lastProperties;
    private lastEvents;
    private textScope;
    private propertiesScope;
    private attributesScope;
    private eventsScope;
    private setText;
    private setProperties;
    private setAttributes;
    private setEvents;
    constructor(nodeDef: NodeDefinition<any>);
    ScheduleSetText(): void;
    SetText(): void;
    ScheduleSetProperties(): void;
    SetProperties(): void;
    ScheduleSetAttributes(): void;
    SetAttributes(): void;
    ScheduleSetEvents(): void;
    SetEvents(): void;
    Destroy(): void;
    private SetPropertiesRecursive;
}
