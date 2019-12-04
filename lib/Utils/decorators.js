"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeSync_1 = require("../Store/storeSync");
const scope_1 = require("../Store/scope/scope");
function Store() {
    return StoreDecorator;
}
exports.Store = Store;
function StoreDecorator(target, propertyKey) {
    var destroyDescriptor = DestroyDecorator(target, propertyKey, null);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = destroyDescriptor.get.apply(this);
            if (store)
                return store.Root.Value;
            return null;
        },
        set: function (val) {
            var store = destroyDescriptor.get.apply(this);
            if (!store)
                destroyDescriptor.set.apply(this, [new storeSync_1.StoreSync(val)]);
            else
                store.Merge(val);
        }
    };
}
function Scope() {
    return ScopeDecorator;
}
exports.Scope = Scope;
function ScopeDecorator(target, propertyKey, descriptor) {
    if (!(descriptor && descriptor.get))
        throw "Scope decorator requires a getter";
    var destroyDescriptor = DestroyDecorator(target, propertyKey, null);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var scope = destroyDescriptor.get.apply(this);
            if (!scope) {
                destroyDescriptor.set.apply(this, [new scope_1.Scope(descriptor.get.bind(this))]);
                scope = destroyDescriptor.get.apply(this);
            }
            return scope.Value;
        },
        set: function () {
            throw "Scope decorator: setter not supported";
        }
    };
}
function Inject(type) {
    return InjectorDecorator.bind(null, type);
}
exports.Inject = Inject;
function InjectorDecorator(type, target, propertyKey, descriptor) {
    var parentGet = descriptor && descriptor.get;
    var parentSet = descriptor && descriptor.set;
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            parentGet && parentGet.apply(this);
            return this.Injector.Get(type);
        },
        set: function (val) {
            parentSet && parentSet.apply(this, [val]);
            this.Injector.Set(type, val);
        }
    };
}
function Destroy() {
    return DestroyDecorator;
}
exports.Destroy = Destroy;
function DestroyDecorator(target, propertyKey, descriptor) {
    var parentGet = descriptor && descriptor.get;
    var parentSet = descriptor && descriptor.set;
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            return parentGet && parentGet.apply(this) || this[`DestroyDecorator_${propertyKey}`];
        },
        set: function (val) {
            var thisObj = this;
            parentSet && parentSet.apply(thisObj, [val]);
            var loc = this[`DestroyDecorator_${propertyKey}`];
            if (loc === val)
                return;
            if (loc && thisObj.Destroyables.has(loc)) {
                thisObj.Destroyables.delete(loc);
                loc.Destroy();
            }
            this[`DestroyDecorator_${propertyKey}`] = val;
            val && thisObj.Destroyables.add(val);
        }
    };
}
//# sourceMappingURL=decorators.js.map