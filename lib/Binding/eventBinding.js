"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const bindingConfig_1 = require("./bindingConfig");
class EventBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, null);
    }
    Destroy() {
        super.Destroy();
        for (var key in this.boundEvents)
            bindingConfig_1.BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
    }
    Apply() {
        for (var key in this.boundEvents)
            bindingConfig_1.BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
        this.boundEvents = {};
        var value = this.Value;
        for (var key in value) {
            this.boundEvents[key] = value[key];
            bindingConfig_1.BindingConfig.addListener(this.BoundTo, key, value[key]);
        }
    }
}
exports.default = EventBinding;
//# sourceMappingURL=eventBinding.js.map