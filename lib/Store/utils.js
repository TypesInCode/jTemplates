"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function IsValue(value) {
    if (!value)
        return true;
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
}
exports.IsValue = IsValue;
function CreateProxy(node, reader) {
    var value = node && node.Value;
    reader && reader.Register(node.Emitter);
    if (node !== node.Self)
        reader && reader.Register(node.Self.Emitter);
    if (IsValue(value))
        return value;
    return CreateProxyObject(node, reader, value);
}
exports.CreateProxy = CreateProxy;
function CreateProxyObject(node, reader, value) {
    var ret = null;
    if (Array.isArray(value)) {
        ret = new Proxy([], {
            get: (obj, prop) => {
                if (node.Destroyed)
                    return undefined;
                if (prop === '___storeProxy')
                    return true;
                if (prop === "___node")
                    return node;
                if (prop === 'toJSON')
                    return () => {
                        return node.Self.Value;
                    };
                var isInt = typeof (prop) !== 'symbol' && !isNaN(parseInt(prop));
                if (isInt || prop === 'length') {
                    var childNode = node.Self.EnsureChild(prop);
                    if (!childNode)
                        return null;
                    if (isInt || prop === 'length')
                        return CreateProxy(childNode, reader);
                }
                var ret = obj[prop];
                if (typeof ret === 'function') {
                    var cachedArray = CreateProxyArray(node.Self, reader);
                    return ret.bind(cachedArray);
                }
                return ret;
            }
        });
    }
    else {
        ret = new Proxy({}, {
            get: (obj, prop) => {
                if (node.Destroyed)
                    return undefined;
                if (prop === '___storeProxy')
                    return true;
                if (prop === '___node')
                    return node;
                if (prop === 'toJSON')
                    return () => {
                        return node.Self.Value;
                    };
                if (typeof prop !== 'symbol') {
                    var childNode = node.Self.EnsureChild(prop);
                    if (!childNode)
                        return null;
                    return CreateProxy(childNode, reader);
                }
                return obj[prop];
            }
        });
    }
    return ret;
}
function CreateProxyArray(node, reader) {
    var localArray = node.Value;
    if (node.NodeCache) {
        var cache = node.NodeCache;
        if (cache && Array.isArray(cache) && cache.length === localArray.length)
            return cache;
    }
    var proxyArray = new Array(localArray.length);
    for (var x = 0; x < proxyArray.length; x++) {
        var childNode = node.EnsureChild(x.toString());
        proxyArray[x] = CreateProxy(childNode, reader);
    }
    node.NodeCache = proxyArray;
    return proxyArray;
}
exports.CreateProxyArray = CreateProxyArray;
function CreateCopy(source) {
    if (IsValue(source))
        return source;
    var ret = null;
    if (Array.isArray(source)) {
        ret = new Array(source.length);
        for (var x = 0; x < source.length; x++)
            ret[x] = this.CreateCopy(source[x]);
        return ret;
    }
    ret = {};
    for (var key in source)
        ret[key] = this.CreateCopy(source[key]);
    return ret;
}
exports.CreateCopy = CreateCopy;
//# sourceMappingURL=utils.js.map