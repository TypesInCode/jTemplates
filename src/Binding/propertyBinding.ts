import { Binding } from "./binding";

class PropertyBinding extends Binding<any> {
    private lastValue: any = {};

    constructor(boundTo: Node, bindingFunction: () => any) {
        super(boundTo, bindingFunction, null);
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
            if(val !== null && typeof val === 'object' && val.constructor === {}.constructor) {
                target[key] = target[key] || {};
                lastValue[key] = lastValue[key] || {};
                this.ApplyRecursive(target[key], lastValue[key], val);
            }
            else {
                val = val && val.valueOf();
                if(lastValue[key] !== val)
                    target[key] = val;
            }
        }
    }
}

export default PropertyBinding;