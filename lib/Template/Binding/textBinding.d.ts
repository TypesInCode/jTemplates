import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
declare class TextBinding extends Binding<any> {
    constructor(boundTo: Node, bindingFunction: FunctionOr<string>);
    protected Apply(): void;
}
export default TextBinding;
