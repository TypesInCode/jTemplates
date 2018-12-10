"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function WorkerScope() {
    const ctx = self;
    ctx.addEventListener("message", (event) => {
        var data = event.data;
        var resp = {
            wasNull: !data.oldValue && data.oldValue !== 0,
            changedPaths: null,
            deletedPaths: [],
            processedIds: [],
            skipDependents: data.skipDependents,
            rootPath: data.path
        };
        resp.changedPaths = ProcessChanges(data.path, data.newValue, data.oldValue, data.idFunction, resp);
        ctx.postMessage(resp);
    });
    function IsValue(value) {
        if (!value)
            return true;
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
    }
    function ProcessChanges(path, value, oldValue, idFunction, response) {
        var localIdFunction = null;
        if (typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if (idFunction)
            localIdFunction = idFunction;
        var newIsValue = IsValue(value);
        var oldIsValue = IsValue(oldValue);
        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if (oldId || newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }
        var skipProperties = new Set();
        var pathChanged = false;
        var childChanges = [];
        if (newIsValue)
            pathChanged = value !== oldValue;
        else {
            pathChanged = oldIsValue;
            if (!pathChanged) {
                for (var key in value) {
                    pathChanged = pathChanged || !(key in oldValue);
                    var childPath = [path, key].join(".");
                    childChanges = childChanges.concat(ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response));
                    skipProperties.add(key);
                }
            }
        }
        var deletedCount = response.deletedPaths.length;
        DeleteProperties(oldValue, skipProperties, path, response, localIdFunction);
        pathChanged = pathChanged || deletedCount !== response.deletedPaths.length;
        if (pathChanged)
            return [path].concat(childChanges);
        return childChanges;
    }
    function DeleteProperties(value, skipProperties, path, response, idFunction) {
        if (IsValue(value))
            return;
        for (var key in value) {
            if (!skipProperties || !skipProperties.has(key)) {
                var childPath = [path, key].join(".");
                response.deletedPaths.push(childPath);
                DeleteProperties(value[key], null, childPath, response, idFunction);
            }
        }
        if (!skipProperties) {
            var id = idFunction && idFunction(value);
            if (id) {
                response.processedIds.push({
                    newId: null,
                    oldId: id,
                    path: path
                });
            }
        }
    }
}
var ObjectStoreWorker;
(function (ObjectStoreWorker) {
    var workerConstructor = null;
    var workerParameter = null;
    if (typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
    }
    else {
        workerConstructor = require("webworker-threads").Worker;
        workerParameter = WorkerScope;
    }
    function Create() {
        return new workerConstructor(workerParameter);
    }
    ObjectStoreWorker.Create = Create;
})(ObjectStoreWorker = exports.ObjectStoreWorker || (exports.ObjectStoreWorker = {}));
//# sourceMappingURL=objectStoreWorker.js.map