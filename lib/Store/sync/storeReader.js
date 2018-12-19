"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const scopeCollector_1 = require("../scopeCollector");
class StoreReader {
    constructor(store) {
        this.store = store;
        this.emitterSet = new Set();
    }
    get Writer() {
        return this.store.GetWriter();
    }
    get Root() {
        var root = this.store.ResolvePropertyPath('root');
        return this.CreateGetterObject(root, 'root');
    }
    get Emitters() {
        return this.emitterSet;
    }
    Get(id) {
        var path = this.store.GetPathById(id);
        if (!path)
            return undefined;
        this.RegisterEmitter(path);
        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
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
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if (isInt)
                        this.RegisterEmitter(childPath);
                    if (isInt || prop === 'length')
                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                    var ret = obj[prop];
                    if (typeof ret === 'function') {
                        var arr = this.store.ResolvePropertyPath(path);
                        var tempArr = new Array(arr.length);
                        for (var x = 0; x < arr.length; x++)
                            tempArr[x] = this.CreateGetterObject(arr[x], [path, x].join("."));
                        return ret.bind(tempArr);
                    }
                    return ret;
                },
                set: (obj, prop, value) => {
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if (isInt) {
                        this.Writer.WritePath(childPath, value);
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
                    var childPath = [path, prop].join(".");
                    this.RegisterEmitter(childPath);
                    return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), path);
                },
                set: (obj, prop, value) => {
                    var childPath = [path, prop].join(".");
                    this.Writer.WritePath(childPath, value);
                    return true;
                }
            });
        }
        return ret;
    }
    RegisterEmitter(path) {
        var emitter = this.store.EnsureEmitter(path);
        if (!this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);
        scopeCollector_1.scopeCollector.Register(emitter);
    }
    EmitSet(path) {
        var emitter = this.store.EnsureEmitter(path);
        emitter.emit("set");
    }
}
exports.StoreReader = StoreReader;
//# sourceMappingURL=storeReader.js.map