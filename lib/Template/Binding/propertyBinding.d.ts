import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
declare class PropertyBinding extends Binding<any> {
    private lastValue;
    constructor(boundTo: Node, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
    private ApplyRecursive;
}
export default PropertyBinding;
