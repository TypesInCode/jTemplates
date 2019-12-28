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
const treeNodeRefId_1 = require("../tree/treeNodeRefId");
const proxy_1 = require("../tree/proxy");
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
        var node = this.tree.GetIdNode(id);
        return node;
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
            this.EnsurePropertyPath(path);
            yield this.WritePath(path, value);
        });
    }
    WritePaths(keyValues) {
        return __awaiter(this, void 0, void 0, function* () {
            var batch = new Array();
            for (var x = 0; x < keyValues.length; x++) {
                var path = keyValues[x][0];
                var value = keyValues[x][1];
                var breakUpMap = this.BreakUpValue(path, value);
                breakUpMap.forEach((value, key) => {
                    batch.push({
                        path: key,
                        newValue: value,
                        oldValue: this.ResolvePropertyPath(key)
                    });
                });
            }
            var diff = yield this.diff.DiffBatch(batch);
            for (var x = 0; x < batch.length; x++)
                this.AssignPropertyPath(batch[x].newValue, batch[x].path);
            this.ProcessDiff(diff);
        });
    }
    WritePath(path, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var breakUpMap = this.BreakUpValue(path, value);
            var batch = new Array(breakUpMap.size);
            var index = 0;
            breakUpMap.forEach((value, key) => {
                batch[index] = {
                    path: key,
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(key)
                };
                index++;
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
    BreakUpValue(path, parent, key, map) {
        var value = key ? parent[key] : parent;
        var id = this.idFunction && this.idFunction(value);
        var hasId = id || id === 0;
        var idPath = hasId && ["id", id].join(".");
        var treeNodeRef = hasId && treeNodeRefId_1.TreeNodeRefId.GetString(id);
        if (!map) {
            map = new Map();
            map.set(path, hasId && path !== idPath ? treeNodeRef : value);
        }
        if (value && value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();
        if (proxy_1.IProxy.ValueType(value) === proxy_1.IProxyType.Value) {
            return map;
        }
        if (hasId && path !== idPath) {
            if (key)
                parent[key] = treeNodeRef;
            map.set(idPath, value);
            this.BreakUpValue(idPath, value, null, map);
        }
        else {
            for (var key in value) {
                var childPath = [path, key].join(".");
                this.BreakUpValue(childPath, value, key, map);
            }
        }
        return map;
    }
    AssignPropertyPath(value, path) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
        parentObj[prop] = value;
    }
    EnsurePropertyPath(path) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
        if (parentObj[prop] === undefined)
            parentObj[prop] = null;
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
