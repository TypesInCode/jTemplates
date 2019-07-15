import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
declare class AttributeBinding extends Binding<any> {
    constructor(boundTo: Node, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
}
export default AttributeBinding;
