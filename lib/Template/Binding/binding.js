"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scope_1 = require("../../Store/scope/scope");
const bindingConfig_1 = require("./bindingConfig");
const injector_1 = require("../../injector");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
    BindingStatus[BindingStatus["Destroyed"] = 3] = "Destroyed";
})(BindingStatus || (BindingStatus = {}));
class Binding {
    constructor(boundTo, binding, config) {
        this.injector = injector_1.Injector.Current();
        this.boundTo = boundTo;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        binding = this.OverrideBinding(binding, config);
        if (typeof binding === 'function') {
            this.observableScope = new scope_1.Scope(binding);
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
    get Injector() {
        return this.injector;
    }
    get BoundTo() {
        return this.boundTo;
    }
    get IsStatic() {
        return this.isStatic;
    }
    get ScheduleUpdate() {
        return true;
    }
    Update() {
        if (this.status === BindingStatus.Destroyed)
            return;
        if (this.status === BindingStatus.Init || !this.ScheduleUpdate) {
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
    Destroy(parentDestroyed = false) {
        this.observableScope && this.observableScope.Destroy();
        this.status = BindingStatus.Destroyed;
    }
    OverrideBinding(binding, config) {
        return binding;
    }
    Init(config) { }
    ;
}
exports.Binding = Binding;
//# sourceMappingURL=binding.js.map