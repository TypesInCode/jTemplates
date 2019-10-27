import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";
declare class TextBinding extends Binding<any> {
    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<string>);
    protected Apply(): void;
}
export default TextBinding;
