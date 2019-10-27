import { Binding } from "./binding";
import { Template } from "../template";
import { FunctionOr, ChildrenOr, BindingDefinitions } from "../template.types";
import { NodeRef } from "../nodeRef";
declare class DataBinding extends Binding<{
    children: ChildrenOr<any>;
    key: {
        (val: any): any;
    };
}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    keyFunction: (val: any) => any;
    protected readonly SynchInit: boolean;
    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>, childrenFunction: ChildrenOr<any>, keyFunction: (val: any) => any);
    Destroy(): void;
    protected OverrideBinding(bindingFunction: FunctionOr<any>, config: {
        key: (val: any) => any;
    }): (() => {
        value: any;
        key: any;
    }[]) | {
        value: any;
        key: any;
    }[];
    protected Init(config: {
        children: ChildrenOr<any>;
        key: (val: any) => any;
    }): void;
    protected Apply(): void;
    private DestroyTemplates;
}
export default DataBinding;
