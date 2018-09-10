import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
declare class DataBinding extends Binding<{
    (c: any, i: number): BindingDefinitions;
}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions;
    activeTemplates: Array<Array<Template<any, any>>>;
    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions);
    Destroy(): void;
    protected Init(childrenFunction: {
        (c: any, i: number): BindingDefinitions;
    }): void;
    protected Apply(): void;
    private DestroyTemplates;
}
export default DataBinding;
