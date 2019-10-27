import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";

class TextBinding extends Binding<any> {

    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<string>) {
        super(boundTo, bindingFunction, "");
    }

    protected Apply() {
        // BindingConfig.setText(this.BoundTo, this.Value);
        this.BoundTo.SetText(this.Value);
    }
}

export default TextBinding;