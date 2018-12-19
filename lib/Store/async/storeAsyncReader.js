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
class StoreAsyncReader {
    constructor(store) {
        this.store = store;
        this.emitterSet = new Set();
    }
    get Writer() {
        return this.store.GetWriter();
    }
    get Emitters() {
        return this.emitterSet;
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
    CreateGetterObject(source, path) {
        if (utils_1.IsValue(source)) {
            this.RegisterEmitter(path);
            return source;
        }
        var ret = null;
        if (Array.isArray(source)) {
            ret = new Proxy([], {
                get: (obj, prop) => {
                    if (prop === '___path')
                        return path;
                    var isInt = typeof prop !== 'symbol' && !isNaN(parseInt(prop));
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
                    var isInt = typeof prop !== 'symbol' && !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if (isInt) {
                        this.store.AssignPropertyPath(value, childPath);
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
                    if (prop === '___path')
                        return path;
                    var childPath = [path, prop].join(".");
                    this.RegisterEmitter(childPath);
                    return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                },
                set: (obj, prop, value) => {
                    var childPath = [path, prop].join(".");
                    this.store.AssignPropertyPath(value, childPath);
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
}
exports.StoreAsyncReader = StoreAsyncReader;
//# sourceMappingURL=storeAsyncReader.js.map