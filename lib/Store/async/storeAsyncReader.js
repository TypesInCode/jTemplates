"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const scopeCollector_1 = require("../scopeCollector");
const storeAsyncWriter_1 = require("./storeAsyncWriter");
class StoreAsyncReader {
    constructor(store) {
        this.store = store;
        this.watching = false;
        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(store);
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
        return __awaiter(this, void 0, void 0, function* () {
            var path = yield this.store.GetPathById(id);
            if (!path)
                return undefined;
            this.RegisterEmitter(path);
            return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
        });
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
                    var isInt = !isNaN(parseInt(prop));
                    if (isInt || prop === 'length') {
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
exports.StoreAsyncReader = StoreAsyncReader;
//# sourceMappingURL=storeAsyncReader.js.map