import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";
declare class PropertyBinding extends Binding<any> {
    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
}
export default PropertyBinding;
