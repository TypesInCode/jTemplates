import { Binding } from "./binding";
import { PromiseOr } from "../template.types";
declare class PropertyBinding extends Binding<any> {
    private lastValue;
    constructor(boundTo: Node, bindingFunction: PromiseOr<any>);
    protected Apply(): void;
    private ApplyRecursive;
}
export default PropertyBinding;
