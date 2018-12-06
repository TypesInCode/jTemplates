"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function WorkerScope() {
    const ctx = self;
    ctx.addEventListener("message", (event) => {
        var data = event.data;
        var resp = {
            wasNull: !data.oldValue && data.oldValue !== 0,
            changedPaths: [],
            deletedPaths: [],
            processedIds: [],
            skipDependents: data.skipDependents,
            rootPath: data.path
        };
        ProcessChanges(data.path, data.newValue, data.oldValue, data.idFunction, resp);
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
        response.changedPaths.push(path);
        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if (oldId && oldId !== newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }
        var skipProperties = new Set();
        if (!IsValue(value)) {
            for (var key in value) {
                var childPath = [path, key].join(".");
                ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
                skipProperties.add(key);
            }
        }
        DeleteProperties(oldValue, skipProperties, path, response);
    }
    function DeleteProperties(value, skipProperties, path, response) {
        if (!IsValue(value)) {
            for (var key in value) {
                if (!(skipProperties && skipProperties.has(key))) {
                    var childPath = [path, key].join(".");
                    response.deletedPaths.push(childPath);
                    DeleteProperties(value[key], null, childPath, response);
                }
            }
            if (!skipProperties || skipProperties.size === 0) {
                var id = this.getIdCallback && this.getIdCallback(value);
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
}
var workerString = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
var ObjectStoreWorker;
(function (ObjectStoreWorker) {
    function Create() {
        return new Worker(workerString);
    }
    ObjectStoreWorker.Create = Create;
})(ObjectStoreWorker = exports.ObjectStoreWorker || (exports.ObjectStoreWorker = {}));
//# sourceMappingURL=objectStoreWorker.js.map