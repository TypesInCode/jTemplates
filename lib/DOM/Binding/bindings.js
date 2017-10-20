"use strict";
var browser_1 = require("../browser");
var Bindings;
(function (Bindings) {
    var pendingUpdates = [];
    var updateScheduled = false;
    function BindingMethods() {
        return [
            require("./textBinding").default.Create,
            require("./componentBinding").default.Create,
            require("./eventBinding").default.Create,
            require("./eventBinding").default.Create,
            require("./arrayBinding").default.Create,
            require("./propertyBinding").default.Create
        ];
    }
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
    Bindings.ScheduleUpdate = ScheduleUpdate;
    function Bind(element, parameters) {
        var bindingMethods = BindingMethods();
        var ret = [];
        var skipChildren = false;
        if (element.nodeType != element.DOCUMENT_FRAGMENT_NODE) {
            for (var x = 0; x < bindingMethods.length; x++) {
                var bindings = bindingMethods[x](element, parameters, ScheduleUpdate);
                for (var y = 0; y < bindings.length; y++) {
                    skipChildren = skipChildren || bindings[y].BindsChildren;
                    ret.push(bindings[y]);
                }
            }
        }
        for (var z = 0; z < element.childNodes.length && !skipChildren; z++) {
            var childBindings = Bind(element.childNodes[z], parameters);
            for (var i = 0; i < childBindings.length; i++)
                ret.push(childBindings[i]);
        }
        return ret;
    }
    Bindings.Bind = Bind;
})(Bindings || (Bindings = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Bindings;
//# sourceMappingURL=bindings.js.map