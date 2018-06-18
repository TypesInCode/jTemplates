"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeBinding_1 = require("./nodeBinding");
class EventBinding extends nodeBinding_1.default {
    constructor(element, eventName, bindingFunction) {
        super(element, bindingFunction);
        this.eventName = eventName;
    }
    Destroy() {
        this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
    }
    Apply() {
        if (this.eventCallback)
            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
        this.eventCallback = this.Value;
        if (this.eventCallback)
            this.BoundTo.addEventListener(this.eventName, this.eventCallback);
    }
}
exports.default = EventBinding;
//# sourceMappingURL=eventBinding.js.map