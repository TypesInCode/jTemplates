function WorkerScope() {
    const ctx: Worker = self as any;
    // Post data to parent thread
    // ctx.postMessage({ foo: "foo" });

    // Respond to message from parent thread
    ctx.addEventListener("message", (event) => {
        var data = event.data as IMessage;
        var resp = {
            wasNull: !data.oldValue && data.oldValue !== 0,
            changedPaths: null,
            deletedPaths: [],
            processedIds: [],
            skipDependents: data.skipDependents,
            rootPath: data.path
        } as IPostMessage;

        resp.changedPaths = ProcessChanges(data.path, data.newValue, data.oldValue, data.idFunction, resp);
        ctx.postMessage(resp);
    });

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    function ProcessChanges(path: string, value: any, oldValue: any, idFunction: {(val: any): any} | string, response: IPostMessage): Array<string> {
        // debugger;
        var localIdFunction = null as {(val: any): any};
        if(typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if(idFunction)
            localIdFunction = idFunction;

        var newIsValue = IsValue(value);
        var oldIsValue = IsValue(oldValue);

        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if(oldId || newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }

        var skipProperties = new Set();
        var pathChanged = false;
        var childChanges: Array<string> = [];
        if(newIsValue)
            pathChanged = value !== oldValue;
        else {
            pathChanged = oldIsValue;
            if(!pathChanged) {
                for(var key in value) {
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

        if(pathChanged)
            return [path].concat(childChanges);
        
        return childChanges;
    }

    function DeleteProperties(value: any, skipProperties: Set<string>, path: string, response: IPostMessage, idFunction: {(val: any): any}) {
        if(IsValue(value))
            return;
        
        for(var key in value) {
            if(!skipProperties || !skipProperties.has(key)) {
                var childPath = [path, key].join(".");
                response.deletedPaths.push(childPath);
                DeleteProperties(value[key], null, childPath, response, idFunction);
            }
        }

        if(!skipProperties) {
            var id = idFunction && idFunction(value);
            if(id) {
                response.processedIds.push({
                    newId: null,
                    oldId: id,
                    path: path
                });
            }
        }
    }
}

export namespace ObjectStoreWorker {
    var workerConstructor: any = null;
    var workerParameter: any = null;
    if(typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
    }
    else {
        workerConstructor = (require("webworker-threads") as any).Worker;
        workerParameter = WorkerScope;
    }

    export function Create() {
        // return new Worker(workerString);
        /* if(typeof Worker != "undefined") {
            var workerString = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
            return new Worker(workerString);
        }
        else {
            return new (require("webworker-threads") as any).Worker(WorkerScope);
        } */
        return new workerConstructor(workerParameter) as Worker;
    }
}