"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class EventBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {});
    }
    Apply() {
        this.BoundTo.SetEvents(this.Value);
    }
}
exports.default = EventBinding;
//# sourceMappingURL=eventBinding.js.map