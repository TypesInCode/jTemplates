"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observableScope_1 = require("./Observable/observableScope");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
})(BindingStatus || (BindingStatus = {}));
class Binding {
    constructor(boundTo, binding, scheduleUpdate) {
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        if (typeof binding == 'function') {
            this.hasStaticValue = false;
            this.observableScope = new observableScope_1.default(binding);
            this.observableScope.AddListener("set", this.setCallback);
        }
        else {
            this.hasStaticValue = true;
            this.staticValue = binding;
        }
    }
    get Value() {
        return this.hasStaticValue ? this.staticValue : this.observableScope.Value;
    }
    get BoundTo() {
        return this.boundTo;
    }
    Update() {
        if (this.status == BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
        else if (this.status != BindingStatus.Updating) {
            this.status = BindingStatus.Updating;
            this.scheduleUpdate(() => {
                this.Apply();
                this.status = BindingStatus.Updated;
            });
        }
    }
    Destroy() {
        this.observableScope && this.observableScope.Destroy();
    }
}
exports.default = Binding;
//# sourceMappingURL=binding.js.map