"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const scopeCollector_1 = require("../scopeCollector");
const storeWriter_1 = require("./storeWriter");
class StoreReader {
    constructor(store) {
        this.store = store;
        this.watching = false;
        this.writer = new storeWriter_1.StoreWriter(store);
    }
    get Root() {
        var root = this.store.ResolvePropertyPath("root");
        this.RegisterEmitter("root");
        return this.CreateGetterObject(root, "root");
    }
    get Emitters() {
        return this.emitterSet;
    }
    get Watching() {
        return this.watching;
    }
    set Watching(val) {
        this.emitterSet = val ? new Set() : this.emitterSet;
        this.watching = val;
    }
    Get(id) {
        var path = this.store.GetPathById(id);
        if (!path)
            return undefined;
        this.RegisterEmitter(path);
        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
    }
    Destroy() {
        this.destroyed = true;
        this.watching = false;
        this.emitterSet.clear();
    }
    GetArray(path) {
        var localArray = this.store.ResolvePropertyPath(path);
        var cachedArray = new Array(localArray.length);
        for (var x = 0; x < cachedArray.length; x++)
            cachedArray[x] = this.CreateGetterObject(localArray[x], [path, x].join("."));
        return cachedArray;
    }
    CreateGetterObject(source, path) {
        if (utils_1.IsValue(source) || source.___storeProxy) {
            this.RegisterEmitter(path);
            return source;
        }
        var ret = null;
        if (Array.isArray(source)) {
            ret = new Proxy([], {
                get: (obj, prop) => {
                    if (prop === '___storeProxy')
                        return true;
                    if (prop === '___path')
                        return path;
                    if (prop === 'toJSON')
                        return () => {
                            return this.store.ResolvePropertyPath(path);
                        };
                    if (typeof prop !== 'symbol') {
                        var isInt = !isNaN(parseInt(prop));
                        var childPath = [path, prop].join(".");
                        if (isInt)
                            this.RegisterEmitter(childPath);
                        if (isInt || prop === 'length')
                            return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                    }
                    var ret = obj[prop];
                    if (typeof ret === 'function') {
                        var cachedArray = this.GetArray(path);
                        return ret.bind(cachedArray);
                    }
                    return ret;
                },
                set: (obj, prop, value) => {
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if (isInt) {
                        this.writer.WritePath(childPath, value);
                    }
                    else {
                        obj[prop] = value;
                    }
                    return true;
                }
            });
        }
        else {
            ret = new Proxy({}, {
                get: (obj, prop) => {
                    if (prop === '___storeProxy')
                        return true;
                    if (prop === '___path')
                        return path;
                    if (prop === 'toJSON')
                        return () => {
                            return this.store.ResolvePropertyPath(path);
                        };
                    if (typeof prop !== 'symbol') {
                        var childPath = [path, prop].join(".");
                        this.RegisterEmitter(childPath);
                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                    }
                    return obj[prop];
                },
                set: (obj, prop, value) => {
                    var childPath = [path, prop].join(".");
                    this.writer.WritePath(childPath, value);
                    return true;
                }
            });
        }
        return ret;
    }
    RegisterEmitter(path) {
        if (this.destroyed)
            return;
        var emitter = this.store.EnsureEmitter(path);
        if (this.watching && !this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);
        scopeCollector_1.scopeCollector.Register(emitter);
    }
}
exports.StoreReader = StoreReader;
//# sourceMappingURL=storeReader.js.map