import { Binding } from "./binding";
declare class PropertyBinding extends Binding<any> {
    private lastValue;
    constructor(boundTo: Node, bindingFunction: {
        (): any;
    } | any);
    protected Apply(): void;
    private ApplyRecursive;
}
export default PropertyBinding;
