import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
import { FunctionOr, ChildrenOr } from "../template.types";
declare class DataBinding extends Binding<{
    children: ChildrenOr<any>;
    key: {
        (val: any): any;
    };
}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    keyFunction: (val: any) => any;
    constructor(boundTo: Node, bindingFunction: FunctionOr<any>, childrenFunction: ChildrenOr<any>, keyFunction: (val: any) => any);
    Destroy(parentDestroyed?: boolean): void;
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
