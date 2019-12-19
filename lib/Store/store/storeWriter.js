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
class StoreWriter {
    constructor(store) {
        this.store = store;
    }
    Write(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.Write(value);
        });
    }
    Update(readOnly, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = readOnly && readOnly.___node.Path;
            if (!path)
                return;
            yield this.store.WritePath(path, value);
        });
    }
    Merge(readOnly, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = readOnly && readOnly.___node.Path;
            if (!path)
                return;
            var keys = Object.keys(value);
            var writes = keys.map(key => [[path, key].join("."), value[key]]);
            yield this.store.WritePaths(writes);
        });
    }
    Push(readOnly, newValue) {
        return __awaiter(this, void 0, void 0, function* () {
            var node = readOnly.___node;
            var lengthNode = node.EnsureChild('length');
            var length = lengthNode.StoreValue;
            var childPath = [node.Path, length].join(".");
            yield this.store.WritePath(childPath, newValue);
            this.store.EmitSet(node.Path);
        });
    }
    Splice(readOnly, start, deleteCount, ...items) {
        return __awaiter(this, void 0, void 0, function* () {
            var node = readOnly.___node;
            var array = node.Proxy.toJSON();
            var ret = array.splice(start, deleteCount, ...items);
            yield this.Update(node.Proxy, array);
            return ret;
        });
    }
}
exports.StoreWriter = StoreWriter;
//# sourceMappingURL=storeWriter.js.map