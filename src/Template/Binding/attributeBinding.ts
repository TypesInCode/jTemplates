import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr } from "../template.types";

class AttributeBinding extends Binding<any> {

    constructor(boundTo: Node, bindingFunction: FunctionOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    protected Apply() {
        var value = this.Value;
        for(var key in value) {
            var val = BindingConfig.getAttribute(this.BoundTo, key);
            if(val !== value[key])
                BindingConfig.setAttribute(this.BoundTo, key, value[key]);
        }
    }
}

export default AttributeBinding;