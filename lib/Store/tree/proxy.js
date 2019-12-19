"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IProxyType;
(function (IProxyType) {
    IProxyType[IProxyType["Value"] = 0] = "Value";
    IProxyType[IProxyType["Object"] = 1] = "Object";
    IProxyType[IProxyType["Array"] = 2] = "Array";
})(IProxyType = exports.IProxyType || (exports.IProxyType = {}));
var IProxy;
(function (IProxy) {
    function Type(proxy) {
        return proxy && proxy.___type || IProxyType.Value;
    }
    IProxy.Type = Type;
    function ValueType(value) {
        if (!value)
            return IProxyType.Value;
        if (Array.isArray(value))
            return IProxyType.Array;
        else if (typeof value === 'object')
            return IProxyType.Object;
        return IProxyType.Value;
    }
    IProxy.ValueType = ValueType;
    function Create(node, type) {
        var ret = null;
        switch (type) {
            case IProxyType.Array:
                ret = CreateArrayProxy(node);
                break;
            case IProxyType.Object:
                ret = CreateObjectProxy(node);
                break;
            default:
                throw "Can't create IProxy from Value type";
        }
        return ret;
    }
    IProxy.Create = Create;
})(IProxy = exports.IProxy || (exports.IProxy = {}));
function CreateArrayProxy(node) {
    return new Proxy([], {
        get: (obj, prop) => {
            switch (prop) {
                case '___type':
                    return IProxyType.Array;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CreateNodeCopy(node.Self);
                    };
                case 'length':
                    return node.Self.EnsureChild(prop).StoreValue;
                default:
                    if (typeof (prop) !== 'symbol' && !isNaN(parseInt(prop)))
                        return node.Self.EnsureChild(prop).Proxy;
                    var ret = obj[prop];
                    if (typeof ret === 'function') {
                        return ret.bind(node.ProxyArray);
                    }
                    return ret;
            }
        }
    });
}
function CreateObjectProxy(node) {
    return new Proxy({}, {
        get: (obj, prop) => {
            switch (prop) {
                case '___type':
                    return IProxyType.Object;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CreateNodeCopy(node.Self);
                    };
                default:
                    if (typeof (prop) !== 'symbol')
                        return node.Self.EnsureChild(prop).Proxy;
                    return obj[prop];
            }
        }
    });
}
function CreateNodeCopy(node) {
    var value = node.Value;
    if (IProxy.ValueType(value) === IProxyType.Value)
        return value;
    var ret = null;
    if (Array.isArray(value))
        ret = value.map((v, i) => CreateNodeCopy(node.Self.EnsureChild(i.toString()).Self));
    else {
        ret = {};
        for (var key in value) {
            var child = node.Self.EnsureChild(key);
            ret[key] = CreateNodeCopy(child.Self);
        }
    }
    return ret;
}
//# sourceMappingURL=proxy.js.map