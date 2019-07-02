import { Binding } from "./binding";
import { FunctionOr } from "../template.types";

class PropertyBinding extends Binding<any> {
    private lastValue: any;
    private scheduleUpdate = true;

    protected get ScheduleUpdate() {
        return this.scheduleUpdate;
    }

    constructor(boundTo: Node, bindingFunction: FunctionOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    protected Apply() {
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
                this.ApplyRecursive(target[key] || {}, lastValue && lastValue[key], val);
            }
            else if(!lastValue || lastValue[key] !== val)
                target[key] = val;
        }
    }
}

export default PropertyBinding;