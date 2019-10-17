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
class StoreWriter {
    constructor(store) {
        this.store = store;
    }
    Write(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.Write(value);
        });
    }
    Update(readOnly, updateCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = null;
            if (typeof readOnly === 'string') {
                var node = this.store.GetIdNode(readOnly);
                path = node && node.Path;
            }
            var path = path || readOnly && readOnly.___node.Path;
            if (!path)
                return;
            yield this.store.WritePath(path, updateCallback);
        });
    }
    Merge(readOnly, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = null;
            if (typeof readOnly === 'string') {
                var node = this.store.GetIdNode(readOnly);
                path = node && node.Path;
            }
            var path = path || readOnly && readOnly.___node.Path;
            if (!path)
                return;
            for (var key in value) {
                var childPath = [path, key].join(".");
                yield this.store.WritePath(childPath, value[key]);
            }
        });
    }
    Push(readOnly, newValue) {
        return __awaiter(this, void 0, void 0, function* () {
            var node = readOnly.___node;
            var lengthPath = [node.Path, 'length'].join(".");
            var length = this.store.ResolvePropertyPath(lengthPath);
            var childPath = [node.Path, length].join(".");
            yield this.store.WritePath(childPath, newValue);
            this.store.EmitSet(node.Path);
        });
    }
    Pop(readOnly) {
        var node = readOnly.___node;
        var localValue = this.store.ResolvePropertyPath(node.Path);
        var ret = localValue.pop();
        this.store.EmitSet(node.Path);
        return ret;
    }
    Splice(readOnly, start, deleteCount, ...items) {
        var args = Array.from(arguments).slice(1);
        var arrayNode = readOnly.___node;
        var localValue = this.store.ResolvePropertyPath(arrayNode.Path);
        var proxyArray = utils_1.CreateProxyArray(arrayNode, null);
        var removedProxies = proxyArray.splice.apply(proxyArray, args);
        for (var x = 0; x < removedProxies.length; x++) {
            let node = removedProxies[x] && removedProxies[x].___node;
            if (node)
                node.Destroy();
        }
        for (var x = start + items.length; x < proxyArray.length; x++) {
            let node = proxyArray[x] && proxyArray[x].___node;
            if (node) {
                node.Property = x.toString();
            }
        }
        var ret = localValue.splice.apply(localValue, args);
        this.store.EmitSet(arrayNode);
        return ret;
    }
}
exports.StoreWriter = StoreWriter;
//# sourceMappingURL=storeWriter.js.map