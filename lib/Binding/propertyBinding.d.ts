import { Binding } from "./binding";
declare class PropertyBinding extends Binding<any> {
    constructor(boundTo: Node, bindingFunction: () => any);
    protected Apply(): void;
    private ApplyRecursive;
}
export default PropertyBinding;
