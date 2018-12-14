import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
import { PromiseOr } from "../template.types";
import { Scope } from "../ObjectStore/objectStoreScope";
declare class DataBinding extends Binding<{
    children: {
        (c: any, i: number): BindingDefinitions<any, any>;
    };
    key: (val: any) => any;
}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    activeKeys: Array<any>;
    keyFunction: (val: any) => any;
    dataObservableScope: Scope<Array<{
        key: any;
        value: any;
    }>>;
    constructor(boundTo: Node, bindingFunction: PromiseOr<any>, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, keyFunction: (val: any) => any);
    Destroy(): void;
    protected Init(config: {
        children: {
            (c: any, i: number): BindingDefinitions<any, any>;
        };
        key: (val: any) => any;
    }): void;
    protected Apply(): void;
    private DestroyTemplates;
}
export default DataBinding;
