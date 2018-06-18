"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("../../binding");
const browser_1 = require("../browser");
var pendingUpdates = [];
var updateScheduled = false;
function ScheduleUpdate(callback) {
    pendingUpdates.push(callback);
    if (!updateScheduled) {
        updateScheduled = true;
        browser_1.default.requestAnimationFrame(() => {
            updateScheduled = false;
            for (var x = 0; x < pendingUpdates.length; x++)
                pendingUpdates[x]();
            pendingUpdates = [];
        });
    }
}
class NodeBinding extends binding_1.default {
    constructor(boundTo, binding) {
        super(boundTo, binding, ScheduleUpdate);
    }
}
exports.default = NodeBinding;
//# sourceMappingURL=nodeBinding.js.map