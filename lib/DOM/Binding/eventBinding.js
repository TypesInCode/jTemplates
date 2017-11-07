"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var EventBinding = (function (_super) {
    __extends(EventBinding, _super);
    function EventBinding(element, eventName, bindingFunction) {
        _super.call(this, element, bindingFunction);
        this.eventName = eventName;
    }
    EventBinding.prototype.Destroy = function () {
        this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
    };
    EventBinding.prototype.Apply = function () {
        if (this.eventCallback)
            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
        this.eventCallback = this.Value;
        this.BoundTo.addEventListener(this.eventName, this.eventCallback);
    };
    return EventBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventBinding;
//# sourceMappingURL=eventBinding.js.map