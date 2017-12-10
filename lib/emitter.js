"use strict";
var Emitter = (function () {
    function Emitter() {
        this.callbackMap = {};
    }
    Emitter.prototype.AddListener = function (name, callback) {
        var events = this.callbackMap[name] || [];
        var ind = events.indexOf(callback);
        if (ind >= 0)
            throw "Event already registered";
        events.push(callback);
        this.callbackMap[name] = events;
    };
    Emitter.prototype.RemoveListener = function (name, callback) {
        var events = this.callbackMap[name] || [];
        var ind = events.indexOf(callback);
        if (ind >= 0) {
            events.splice(ind, 1);
            this.callbackMap[name] = events;
        }
    };
    Emitter.prototype.Fire = function (name) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var events = this.callbackMap[name] || [];
        events.forEach(function (c) {
            c.apply(void 0, [_this].concat(args));
        });
    };
    Emitter.prototype.Clear = function (name) {
        this.callbackMap[name] = null;
    };
    Emitter.prototype.ClearAll = function () {
        for (var key in this.callbackMap)
            this.Clear(key);
    };
    return Emitter;
}());
exports.Emitter = Emitter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Emitter;
//# sourceMappingURL=emitter.js.map