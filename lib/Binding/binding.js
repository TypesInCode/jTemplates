"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectStoreScope_1 = require("../ObjectStore/objectStoreScope");
const bindingConfig_1 = require("./bindingConfig");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
    BindingStatus[BindingStatus["Destroyed"] = 3] = "Destroyed";
})(BindingStatus || (BindingStatus = {}));
class Binding {
    constructor(boundTo, binding, config) {
        this.boundTo = boundTo;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        if (typeof binding === 'function') {
            this.observableScope = new objectStoreScope_1.Scope(binding);
            this.observableScope.addListener("set", this.setCallback);
        }
        else {
            this.isStatic = true;
            this.staticValue = binding;
        }
        this.Init(config);
        this.Update();
    }
    get Value() {
        return this.isStatic ?
            this.staticValue :
            this.observableScope.Value;
    }
    get BoundTo() {
        return this.boundTo;
    }
    Update() {
        if (this.status === BindingStatus.Destroyed)
            return;
        if (this.status === BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
        else if (this.status !== BindingStatus.Updating) {
            this.status = BindingStatus.Updating;
            bindingConfig_1.BindingConfig.scheduleUpdate(() => {
                if (this.status === BindingStatus.Destroyed)
                    return;
                this.Apply();
                this.status = BindingStatus.Updated;
            });
        }
    }
    Destroy() {
        this.observableScope && this.observableScope.Destroy();
        this.status = BindingStatus.Destroyed;
    }
    Init(config) { }
    ;
}
exports.Binding = Binding;
//# sourceMappingURL=binding.js.map