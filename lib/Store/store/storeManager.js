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
const tree_1 = require("../tree/tree");
const treeNode_1 = require("../tree/treeNode");
const utils_1 = require("../utils");
const treeNodeRefId_1 = require("../tree/treeNodeRefId");
class StoreManager {
    constructor(idFunction, diff) {
        this.idFunction = idFunction;
        this.data = { root: null, id: {} };
        this.tree = new tree_1.Tree((path) => this.ResolvePropertyPath(path));
        this.diff = diff;
    }
    GetNode(path) {
        return this.tree.GetNode(path);
    }
    GetIdNode(id) {
        return this.tree.GetIdNode(id);
    }
    ResolvePropertyPath(path) {
        if (!path)
            return this.data;
        var value = path.split(".").reduce((pre, curr) => {
            return pre && pre[curr];
        }, this.data);
        return value;
    }
    Write(value) {
        return __awaiter(this, void 0, void 0, function* () {
            var id = this.idFunction(value);
            if (!id)
                throw "Written value must have an id";
            var path = ["id", id].join(".");
            yield this.WritePath(path, value);
        });
    }
    WritePath(path, updateCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            var value = this.ResolveUpdateCallback(path, updateCallback);
            var breakUpMap = new Map();
            var brokenValue = this.BreakUpValue(path, value, breakUpMap);
            var batch = [{ path: path, newValue: brokenValue, oldValue: this.ResolvePropertyPath(path) }];
            breakUpMap.forEach((value, key) => {
                batch.push({
                    path: key,
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(key)
                });
            });
            var diff = yield this.diff.DiffBatch(batch);
            for (var x = 0; x < batch.length; x++)
                this.AssignPropertyPath(batch[x].newValue, batch[x].path);
            this.ProcessDiff(diff);
        });
    }
    EmitSet(pathNode) {
        var node = null;
        if (pathNode instanceof treeNode_1.TreeNode)
            node = pathNode;
        else
            node = this.GetNode(pathNode);
        node && node.Emitter.emit("set");
    }
    Destroy() {
        this.data.root = null;
        this.tree.Destroy();
        this.diff.Destroy();
    }
    BreakUpValue(path, value, map) {
        if (value && value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();
        if (utils_1.IsValue(value)) {
            return value;
        }
        var id = this.idFunction && this.idFunction(value);
        var idPath = ["id", id].join(".");
        if ((id || id === 0) && path !== idPath && !map.has(idPath)) {
            map.set(idPath, value);
            this.BreakUpValue(idPath, value, map);
            return treeNodeRefId_1.TreeNodeRefId.GetString(id);
        }
        for (var key in value) {
            var childPath = [path, key].join(".");
            value[key] = this.BreakUpValue(childPath, value[key], map);
        }
        return value;
    }
    AssignPropertyPath(value, path) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
        parentObj[prop] = value;
    }
    ResolveUpdateCallback(path, updateCallback) {
        if (typeof updateCallback === 'function') {
            var node = this.tree.GetNode(path);
            var localValue = utils_1.CreateCopy(this.ResolvePropertyPath(node.Self.Path));
            updateCallback(localValue);
            return localValue;
        }
        return updateCallback;
    }
    ProcessDiff(data) {
        var emit = new Set();
        data.changedPaths.forEach(p => {
            var match = p.match(/(.+)\.[^.]+$/);
            var parent = match && match[1];
            if (parent && !emit.has(parent) && Array.isArray(this.ResolvePropertyPath(parent)))
                emit.add(parent);
            this.EmitSet(p);
        });
        emit.forEach(path => this.EmitSet(path));
        data.deletedPaths.forEach(p => {
            var node = this.GetNode(p);
            node && node.Destroy();
        });
    }
}
exports.StoreManager = StoreManager;
//# sourceMappingURL=storeManager.js.map