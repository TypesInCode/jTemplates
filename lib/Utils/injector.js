"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Injector {
    constructor() {
        this.parent = Injector.Current();
        this.typeMap = new Map();
    }
    Get(type) {
        if (this.typeMap.size === 0)
            return this.parent && this.parent.Get(type);
        var ret = this.typeMap.get(type);
        if (!ret)
            ret = this.parent && this.parent.Get(type);
        return ret;
    }
    Set(type, instance) {
        this.typeMap.set(type, instance);
    }
}
exports.Injector = Injector;
(function (Injector) {
    var currentScopes = new Array();
    function Current() {
        return currentScopes[currentScopes.length - 1];
    }
    Injector.Current = Current;
    function Scope(injector, action) {
        currentScopes.push(injector);
        action();
        currentScopes.pop();
    }
    Injector.Scope = Scope;
})(Injector = exports.Injector || (exports.Injector = {}));
//# sourceMappingURL=injector.js.map