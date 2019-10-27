import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";

class AttributeBinding extends Binding<any> {

    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    protected Apply() {
        this.BoundTo.SetAttributes(this.Value);
    }

    /* protected Apply() {
        var value = this.Value;
        for(var key in value) {
            var val = BindingConfig.getAttribute(this.BoundTo, key);
            if(val !== value[key])
                BindingConfig.setAttribute(this.BoundTo, key, value[key]);
        }
    } */
}

export default AttributeBinding;