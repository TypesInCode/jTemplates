import { Binding } from "./binding";

class PropertyBinding extends Binding<any> {

    constructor(boundTo: Node, bindingFunction: () => any) {
        super(boundTo, bindingFunction, null);
    }

    protected Apply() {
        this.ApplyRecursive(this.BoundTo, this.Value);
    }

    private ApplyRecursive(target: {[key: string]: any}, source: {[key: string]: any}) {
        if(typeof source !== "object")
            throw "Property binding must resolve to an object";

        for(var key in source) {
            var val = source[key];
            if(val !== null && typeof val === 'object' && val.constructor === {}.constructor) {
                target[key] = target[key] || {};
                this.ApplyRecursive(target[key], val);
            }
            else {
                val = val && val.valueOf();
                if(target[key] !== val)
                    target[key] = val;
            }
        }
    }
}

export default PropertyBinding;