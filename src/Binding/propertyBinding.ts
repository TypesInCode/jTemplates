import { Binding } from "./binding";
import { PromiseOr } from "../template.types";

class PropertyBinding extends Binding<any> {
    private lastValue: any;

    constructor(boundTo: Node, bindingFunction: PromiseOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    protected Apply() {
        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
        this.lastValue = this.Value;
    }

    private ApplyRecursive(target: {[key: string]: any}, lastValue: {[key: string]: any}, source: {[key: string]: any}) {
        if(typeof source !== "object")
            throw "Property binding must resolve to an object";

        for(var key in source) {
            var val = source[key];
            if(typeof val === 'object') {
                this.ApplyRecursive(target[key] || {}, lastValue && lastValue[key], val);
            }
            else if(!lastValue || lastValue[key] !== val)
                target[key] = val;
        }
    }
}

export default PropertyBinding;