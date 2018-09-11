"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxyObservableScope_1 = require("../ProxyObservable/proxyObservableScope");
const bindingConfig_1 = require("./bindingConfig");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
})(BindingStatus || (BindingStatus = {}));
class Binding {
    constructor(boundTo, binding, config) {
        this.boundTo = boundTo;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        this.observableScope = new proxyObservableScope_1.ProxyObservableScope(binding);
        this.observableScope.addListener("set", this.setCallback);
        this.Init(config);
        this.Update();
    }
    get Value() {
        return this.observableScope.Value;
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
            bindingConfig_1.BindingConfig.scheduleUpdate(() => {
                this.Apply();
                this.status = BindingStatus.Updated;
            });
        }
    }
    Destroy() {
        this.observableScope && this.observableScope.Destroy();
    }
    Init(config) { }
    ;
}
exports.Binding = Binding;
//# sourceMappingURL=binding.js.map