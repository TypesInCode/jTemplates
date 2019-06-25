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
                    tracker = Create();
                    break;
                case "diff":
                    return tracker.Diff.apply(tracker, data.arguments);
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
    function Create() {
        return new ObjectDiffTracker();
    }
    class ObjectDiffTracker {
        constructor() {
            this.idToPathsMap = new Map();
        }
        GetPath(id) {
            var paths = this.idToPathsMap.get(id);
            if (paths)
                return paths.values().next().value;
            return null;
        }
        Diff(path, newValue, oldValue) {
            var resp = {
                changedPaths: [],
                deletedPaths: [],
            };
            this.DiffValues(path, path, newValue, oldValue, resp);
            resp.changedPaths = resp.changedPaths.reverse();
            return resp;
        }
        DiffValues(rootPath, path, newValue, oldValue, resp) {
            var newIsObject = !IsValue(newValue);
            var oldIsObject = !IsValue(oldValue);
            if (!newIsObject && !oldIsObject) {
                if (oldValue !== undefined && newValue !== oldValue)
                    resp.changedPaths.push(path);
                return;
            }
            var newKeys = new Set();
            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
            if (oldKeys.length > 0 && newIsObject)
                newKeys = new Set(Object.keys(newValue));
            var pathChanged = false;
            for (var x = 0; x < oldKeys.length; x++) {
                var key = oldKeys[x];
                var childPath = [path, key].join(".");
                var deletedKey = !newKeys.has(key);
                if (!deletedKey)
                    newKeys.delete(key);
                pathChanged = pathChanged || deletedKey;
                if (deletedKey)
                    resp.deletedPaths.push(childPath);
                else
                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], resp);
            }
            if (oldValue !== undefined && pathChanged || newKeys.size > 0)
                resp.changedPaths.push(path);
        }
    }
    return CreateScope;
}
exports.ObjectDiffScope = ObjectDiffScope;
exports.ObjectDiff = ObjectDiffScope(true);
//# sourceMappingURL=objectDiff.js.map