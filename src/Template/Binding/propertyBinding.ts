import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
import { BindingConfig } from "./bindingConfig";
import { NodeRef } from "../nodeRef";

class PropertyBinding extends Binding<any> {
    
    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    protected Apply() {
        this.BoundTo.SetProperties(this.Value);
    }

    /* protected Apply() {
        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
        this.lastValue = this.Value;
        if(Object.keys(this.lastValue).indexOf("value") >= 0)
            this.scheduleUpdate = false;
        else
            this.scheduleUpdate = true;
    }

    private ApplyRecursive(target: {[key: string]: any}, lastValue: {[key: string]: any}, source: {[key: string]: any}) {
        if(typeof source !== "object")
            throw "Property binding must resolve to an object";

        for(var key in source) {
            var val = source[key];
            if(typeof val === 'object') {
                if(!target[key])
                    target[key] = {};
                
                this.ApplyRecursive(target[key], lastValue && lastValue[key], val);
            }
            else if(!lastValue || lastValue[key] !== val) {
                if(BindingConfig.setPropertyOverrides[key])
                    BindingConfig.setPropertyOverrides[key](target, val);
                else
                    target[key] = val;
            }
        }
    } */
}

export default PropertyBinding;