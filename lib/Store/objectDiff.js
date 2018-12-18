"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ObjectDiffScope(notWorker) {
    const ctx = this;
    if (ctx && !notWorker) {
        let diff = CreateScope();
        ctx.onmessage = function (event) {
            var resp = diff(event.data);
            ctx.postMessage(resp);
        };
    }
    function CreateScope() {
        var tracker = null;
        function Call(data) {
            switch (data.method) {
                case "create":
                    tracker = Create(data.arguments[0]);
                    break;
                case "diff":
                    return tracker.Diff.apply(tracker, data.arguments);
                case "getpath":
                    return tracker.GetPath.apply(tracker, data.arguments);
                default:
                    throw `${data.method} is not supported`;
            }
        }
        return Call;
    }
    function IsValue(value) {
        if (!value)
            return true;
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
    }
    function Create(idFunction) {
        var localIdFunction = null;
        if (typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if (idFunction)
            localIdFunction = idFunction;
        return new ObjectDiffTracker(localIdFunction);
    }
    class ObjectDiffTracker {
        constructor(idFunction) {
            this.idFunction = idFunction;
            this.idToPathsMap = new Map();
        }
        GetPath(id) {
            var paths = this.idToPathsMap.get(id);
            if (paths)
                return paths.values().next().value;
            return null;
        }
        Diff(path, newValue, oldValue, skipDepentsProcessing) {
            var resp = {
                changedPaths: [],
                deletedPaths: [],
                pathDependencies: []
            };
            this.DiffValues(path, path, newValue, oldValue, skipDepentsProcessing, resp);
            resp.changedPaths = resp.changedPaths.reverse();
            return resp;
        }
        DiffValues(rootPath, path, newValue, oldValue, skipDependentsProcessing, resp) {
            var newIsObject = !IsValue(newValue);
            var oldIsObject = !IsValue(oldValue);
            if (!newIsObject && !oldIsObject) {
                if (newValue !== oldValue)
                    resp.changedPaths.push(path);
                return;
            }
            var newId = newIsObject && newValue && this.idFunction && this.idFunction(newValue);
            var oldId = oldIsObject && oldValue && this.idFunction && this.idFunction(oldValue);
            if (oldId && oldId !== newId) {
                this.RemoveIdPath(oldId, path);
            }
            if (newId) {
                var dependentPaths = this.AddIdPath(newId, path);
                if (!skipDependentsProcessing) {
                    var dependency = { path: path, targets: [] };
                    dependentPaths.forEach(p => {
                        if (p === path || p.indexOf(rootPath) === 0)
                            return;
                        dependency.targets.push(p);
                    });
                    if (dependency.targets.length > 0)
                        resp.pathDependencies.push(dependency);
                }
            }
            var newKeys = newIsObject ? new Set(Object.keys(newValue)) : new Set();
            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
            var pathChanged = false;
            for (var x = 0; x < oldKeys.length; x++) {
                var key = oldKeys[x];
                var childPath = [path, key].join(".");
                var deletedKey = !newKeys.has(key);
                if (!deletedKey)
                    newKeys.delete(key);
                pathChanged = pathChanged || deletedKey;
                if (deletedKey)
                    this.DeletePaths(childPath, oldValue[key], resp);
                else
                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], skipDependentsProcessing, resp);
            }
            newKeys.forEach(key => this.FindNewIds([path, key].join("."), newValue[key]));
            if (pathChanged || newKeys.size > 0)
                resp.changedPaths.push(path);
        }
        RemoveIdPath(id, path) {
            var oldIdPaths = this.idToPathsMap.get(id);
            if (oldIdPaths) {
                oldIdPaths.delete(path);
                if (oldIdPaths.size === 0)
                    this.idToPathsMap.delete(id);
            }
        }
        AddIdPath(id, path) {
            var dependentPaths = this.idToPathsMap.get(id);
            if (!dependentPaths) {
                dependentPaths = new Set([path]);
                this.idToPathsMap.set(id, dependentPaths);
            }
            else if (!dependentPaths.has(path))
                dependentPaths.add(path);
            return dependentPaths;
        }
        FindNewIds(path, value) {
            if (IsValue(value))
                return;
            var id = value && this.idFunction && this.idFunction(value);
            if (id)
                this.AddIdPath(id, path);
            for (var key in value)
                this.FindNewIds([path, key].join("."), value[key]);
        }
        DeletePaths(path, value, resp) {
            resp.deletedPaths.push(path);
            var id = value && this.idFunction && this.idFunction(value);
            if (id)
                this.RemoveIdPath(id, path);
            if (IsValue(value))
                return;
            for (var key in value)
                this.DeletePaths([path, key].join("."), value[key], resp);
        }
    }
    return CreateScope;
}
exports.ObjectDiffScope = ObjectDiffScope;
exports.ObjectDiff = ObjectDiffScope(true);
//# sourceMappingURL=objectDiff.js.map