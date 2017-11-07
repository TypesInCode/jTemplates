"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var binding_1 = require("../../binding");
var browser_1 = require("../browser");
var pendingUpdates = [];
var updateScheduled = false;
function ScheduleUpdate(callback) {
    var ind = pendingUpdates.indexOf(callback);
    if (ind < 0) {
        pendingUpdates.push(callback);
    }
    if (!updateScheduled) {
        updateScheduled = true;
        browser_1.default.requestAnimationFrame(function () {
            updateScheduled = false;
            while (pendingUpdates.length > 0)
                pendingUpdates.shift()();
        });
    }
}
var NodeBinding = (function (_super) {
    __extends(NodeBinding, _super);
    function NodeBinding(boundTo, binding) {
        _super.call(this, boundTo, binding, ScheduleUpdate);
    }
    return NodeBinding;
}(binding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NodeBinding;
//# sourceMappingURL=nodeBinding.js.map