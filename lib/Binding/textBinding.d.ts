import { Binding } from "./binding";
declare class TextBinding extends Binding<any> {
    constructor(boundTo: Node, bindingFunction: () => any);
    protected Apply(): void;
}
export default TextBinding;
