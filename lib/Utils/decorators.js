"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeSync_1 = require("../Store/storeSync");
const scope_1 = require("../Store/scope/scope");
function Store() {
    return StoreDecorator;
}
exports.Store = Store;
function StoreDecorator(target, propertyKey) {
    DestroyDecorator(target, `StoreDecorator_${propertyKey}`);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = this[`StoreDecorator_${propertyKey}`];
            return store ? store.Root.Value : null;
        },
        set: function (val) {
            var store = this[`StoreDecorator_${propertyKey}`];
            if (!store)
                this[`StoreDecorator_${propertyKey}`] = new storeSync_1.StoreSync(val);
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
    if (descriptor && descriptor.set)
        throw "Scope decorator does not support setters";
    DestroyDecorator(target, `ScopeDecorator_${propertyKey}`);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var scope = this[`ScopeDecorator_${propertyKey}`];
            if (!scope)
                scope = this[`ScopeDecorator_${propertyKey}`] = new scope_1.Scope(descriptor.get.bind(this));
            return scope.Value;
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
(function (Destroy) {
    function Get(value) {
        return value && value.DestroyDecorator_Destroys || [];
    }
    function All(value) {
        var arr = Get(value);
        arr.map(prop => value[prop])
            .filter(o => !!o)
            .forEach(o => o.Destroy());
    }
    Destroy.All = All;
})(Destroy = exports.Destroy || (exports.Destroy = {}));
function DestroyDecorator(target, propertyKey) {
    var proto = target;
    proto.DestroyDecorator_Destroys = proto.DestroyDecorator_Destroys || [];
    proto.DestroyDecorator_Destroys.push(propertyKey);
}
function PreReqTemplate(template) {
    return PreReqTemplateDecorator.bind(null, template);
}
exports.PreReqTemplate = PreReqTemplate;
(function (PreReqTemplate) {
    function Get(value) {
        var func = value && value.PreReqTemplateDecorator_Template;
        var ret = func ? func() : [];
        if (!Array.isArray(ret))
            ret = [ret];
        return ret;
    }
    PreReqTemplate.Get = Get;
})(PreReqTemplate = exports.PreReqTemplate || (exports.PreReqTemplate = {}));
function PreReqTemplateDecorator(template, target) {
    var proto = target.prototype;
    proto.PreReqTemplateDecorator_Template = template;
}
function PreReq() {
    return PreReqDecorator;
}
exports.PreReq = PreReq;
(function (PreReq) {
    function Get(value) {
        return value && value.PreReqDecorator_PreReqs || [];
    }
    function All(value) {
        var arr = Get(value).map((prop) => (value[prop] && value[prop].Init) || Promise.resolve());
        return Promise.all(arr);
    }
    PreReq.All = All;
    function Has(value) {
        return Get(value).length > 0;
    }
    PreReq.Has = Has;
})(PreReq = exports.PreReq || (exports.PreReq = {}));
function PreReqDecorator(target, propertyKey) {
    var proto = target;
    proto.PreReqDecorator_PreReqs = proto.PreReqDecorator_PreReqs || [];
    proto.PreReqDecorator_PreReqs.push(propertyKey);
}
//# sourceMappingURL=decorators.js.map