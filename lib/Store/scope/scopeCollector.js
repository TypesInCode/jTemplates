"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ScopeCollector;
(function (ScopeCollector) {
    var currentSet = null;
    function Watch(action) {
        var parentSet = currentSet;
        currentSet = new Set();
        action();
        var lastSet = currentSet;
        currentSet = parentSet;
        return lastSet;
    }
    ScopeCollector.Watch = Watch;
    function Register(emitter) {
        if (!currentSet)
            return;
        if (!currentSet.has(emitter))
            currentSet.add(emitter);
    }
    ScopeCollector.Register = Register;
})(ScopeCollector = exports.ScopeCollector || (exports.ScopeCollector = {}));
//# sourceMappingURL=scopeCollector.js.map