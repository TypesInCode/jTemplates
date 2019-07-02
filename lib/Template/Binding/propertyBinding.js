"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class PropertyBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {});
        this.scheduleUpdate = true;
    }
    get ScheduleUpdate() {
        return this.scheduleUpdate;
    }
    Apply() {
        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
        this.lastValue = this.Value;
        if (Object.keys(this.lastValue).indexOf("value") >= 0)
            this.scheduleUpdate = false;
        else
            this.scheduleUpdate = true;
    }
    ApplyRecursive(target, lastValue, source) {
        if (typeof source !== "object")
            throw "Property binding must resolve to an object";
        for (var key in source) {
            var val = source[key];
            if (typeof val === 'object') {
                this.ApplyRecursive(target[key] || {}, lastValue && lastValue[key], val);
            }
            else if (!lastValue || lastValue[key] !== val)
                target[key] = val;
        }
    }
}
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map