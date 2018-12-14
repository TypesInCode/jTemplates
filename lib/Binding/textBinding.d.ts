import { Binding } from "./binding";
import { PromiseOr } from "../template.types";
declare class TextBinding extends Binding<any> {
    constructor(boundTo: Node, bindingFunction: PromiseOr<string>);
    protected Apply(): void;
}
export default TextBinding;
