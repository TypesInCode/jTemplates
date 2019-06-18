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
    Diff(path, newValue) {
        return this.diff.Diff(path, newValue, () => this.ResolvePropertyPathInternal(path, true));
    }
    GetNode(path) {
        return this.tree.GetNode(path);
    }
    GetIdNode(id) {
        return this.tree.GetIdNode(id);
    }
    ResolvePropertyPath(path) {
        return this.ResolvePropertyPathInternal(path, false);
    }
    WritePath(path, updateCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            var value = this.ResolveUpdateCallback(path, updateCallback);
            var breakUpMap = new Map();
            var brokenValue = this.BreakUpValue(path, value, breakUpMap);
            var diff = yield this.Diff(path, brokenValue);
            this.AssignPropertyPath(brokenValue, path);
            var promises = [];
            breakUpMap.forEach((breakValue, breakPath) => {
                promises.push(new Promise((resolve, reject) => {
                    this.Diff(breakPath, breakValue).then((val) => {
                        this.AssignPropertyPath(breakValue, breakPath);
                        diff.changedPaths.push(...val.changedPaths);
                        diff.deletedPaths.push(...val.deletedPaths);
                        resolve();
                    });
                }));
            });
            yield Promise.all(promises);
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
        var parentObj = this.ResolvePropertyPathInternal(parentParts.join("."), true);
        parentObj[prop] = value;
    }
    ResolvePropertyPathInternal(path, skipCopy) {
        if (!path)
            return this.data;
        var value = path.split(".").reduce((pre, curr) => {
            return pre && pre[curr];
        }, this.data);
        return skipCopy ? value : utils_1.CreateCopy(value);
    }
    ResolveUpdateCallback(path, updateCallback) {
        if (updateCallback && updateCallback.___storeProxy)
            return updateCallback.toJSON();
        if (typeof updateCallback === 'function') {
            var node = this.tree.GetNode(path);
            var localValue = node.Value;
            var ret = updateCallback(localValue);
            return typeof ret === 'undefined' ? localValue : ret;
        }
        return updateCallback;
    }
    ProcessDiff(data) {
        data.changedPaths.forEach(p => {
            this.EmitSet(p);
        });
        data.deletedPaths.forEach(p => {
            var node = this.GetNode(p);
            node && node.Destroy();
        });
        data.pathDependencies.forEach(dep => {
            var value = this.ResolvePropertyPathInternal(dep.path, false);
            dep.targets.forEach(target => {
                this.WritePath(target, value);
            });
        });
    }
}
exports.StoreManager = StoreManager;
//# sourceMappingURL=storeManager.js.map