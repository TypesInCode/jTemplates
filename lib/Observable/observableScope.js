"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const observable_1 = require("./observable");
class ObservableScope extends emitter_1.default {
    constructor(observableFunction, ...params) {
        super();
        this.parameters = params;
        this.observableFunction = observableFunction;
        this.childObservables = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    get Value() {
        this.Fire("get", this);
        if (!this.dirty)
            return this.value;
        this.UpdateValue();
        return this.value;
    }
    get Dirty() {
        return this.dirty;
    }
    Destroy() {
        this.ClearAll();
        this.childObservables.forEach(c => c.RemoveListener("set", this.setCallback));
        this.childObservables.clear();
    }
    UpdateValue() {
        var newObservables = observable_1.Observable.Watch("get", () => {
            this.value = this.observableFunction(...this.parameters);
            this.value && this.value.valueOf();
        });
        var newObsSet = new Set([...newObservables]);
        this.childObservables.forEach(obs => {
            if (!newObsSet.has(obs))
                obs.RemoveListener("set", this.setCallback);
        });
        newObsSet.forEach(obs => obs.AddListener("set", this.setCallback));
        this.childObservables = newObsSet;
        this.dirty = false;
    }
    SetCallback(observable) {
        this.dirty = true;
        this.Fire("set");
    }
}
exports.default = ObservableScope;
//# sourceMappingURL=observableScope.js.map