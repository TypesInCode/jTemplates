import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
declare class DataBinding extends Binding<{
    (c: any, i: number): BindingDefinitions;
}> {
    private rebind;
    childrenFunction: (c: any, i: number) => BindingDefinitions;
    activeTemplates: Array<Array<Template<any, any>>>;
    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions, rebind: boolean);
    Destroy(): void;
    protected Init(childrenFunction: {
        (c: any, i: number): BindingDefinitions;
    }): void;
    protected Apply(): void;
    private DestroyTemplates;
}
export default DataBinding;
