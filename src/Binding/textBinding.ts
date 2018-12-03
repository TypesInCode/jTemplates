import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";

class TextBinding extends Binding<any> {

    constructor(boundTo: Node, bindingFunction: {(): string} | string) {
        super(boundTo, bindingFunction, null);
    }

    protected Apply() {
        BindingConfig.setText(this.BoundTo, this.Value);
    }
}

export default TextBinding;