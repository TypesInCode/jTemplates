"use strict";
var Emitter = (function () {
    function Emitter() {
        this.callbackMap = {};
        this.firingEvents = false;
        this.removedEvents = [];
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
            var event = events.splice(ind, 1)[0];
            this.callbackMap[name] = events;
            if (this.firingEvents)
                this.removedEvents.push(event);
        }
    };
    Emitter.prototype.Fire = function (name) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.firingEvents = true;
        var events = (this.callbackMap[name] || []).slice();
        events.forEach(function (c, i) {
            if (_this.removedEvents.indexOf(c) < 0)
                c.apply(void 0, [_this].concat(args));
            else
                console.log("skipping event because it was removed");
        });
        this.firingEvents = false;
        this.removedEvents = [];
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