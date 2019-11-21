"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeSync_1 = require("../Store/storeSync");
const scope_1 = require("../Store/scope/scope");
function Store() {
    return function (target, propertyKey, descriptor) {
        return {
            configurable: false,
            enumerable: true,
            get: function () {
                var store = this[`_${propertyKey}`];
                if (store)
                    return store.Root.Value;
                return null;
            },
            set: function (val) {
                var store = this[`_${propertyKey}`];
                if (!store) {
                    store = this[`_${propertyKey}`] = new storeSync_1.StoreSync(val);
                    this.Destroyables.push(store);
                }
                else
                    store.Merge(val);
            }
        };
    };
}
exports.Store = Store;
function Scope() {
    return function (target, propertyKey, descriptor) {
        return {
            configurable: false,
            enumerable: false,
            get: function () {
                var scope = this[`_${propertyKey}`];
                if (!scope) {
                    scope = this[`_${propertyKey}`] = new scope_1.Scope(descriptor.get.bind(this));
                    this.Destroyables.push(scope);
                }
                return scope.Value;
            }
        };
    };
}
exports.Scope = Scope;
function Inject(type) {
    return function (target, propertyKey) {
        return {
            configurable: false,
            enumerable: true,
            get: function () {
                return this.Injector.Get(type);
            },
            set: function (val) {
                this.Injector.Set(type, val);
            }
        };
    };
}
exports.Inject = Inject;
//# sourceMappingURL=decorators.js.map