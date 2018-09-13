import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
declare class DataBinding extends Binding<{
    (c: any, i: number): BindingDefinitions<any, any>;
}> {
    private rebind;
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplates: Array<Array<Template<any, any>>>;
    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, rebind: boolean);
    Destroy(): void;
    protected Init(childrenFunction: {
        (c: any, i: number): BindingDefinitions<any, any>;
    }): void;
    protected Apply(): void;
    private DestroyTemplates;
}
export default DataBinding;
