import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { PromiseOr } from "../template.types";

class TextBinding extends Binding<any> {

    constructor(boundTo: Node, bindingFunction: PromiseOr<string>) {
        super(boundTo, bindingFunction, "");
    }

    protected Apply() {
        BindingConfig.setText(this.BoundTo, this.Value);
    }
}

export default TextBinding;