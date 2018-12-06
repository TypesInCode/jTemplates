function WorkerScope() {
    const ctx: Worker = self as any;

    // Post data to parent thread
    // ctx.postMessage({ foo: "foo" });

    // Respond to message from parent thread
    ctx.addEventListener("message", (event) => {
        var data = event.data as IMessage;
        var resp = {
            wasNull: !data.oldValue && data.oldValue !== 0,
            changedPaths: [],
            deletedPaths: [],
            processedIds: [],
            skipDependents: data.skipDependents,
            rootPath: data.path
        } as IPostMessage;

        ProcessChanges(data.path, data.newValue, data.oldValue, data.idFunction, resp);
        ctx.postMessage(resp);
    });

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    function ProcessChanges(path: string, value: any, oldValue: any, idFunction: {(val: any): any} | string, response: IPostMessage) {
        var localIdFunction = null as {(val: any): any};
        if(typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if(idFunction)
            localIdFunction = idFunction;

        response.changedPaths.push(path);
        // this.getterMap.delete(path);
        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);

        if(oldId && oldId !== newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
            /* var oldIdPaths = this.idToPathsMap.get(oldId);
            oldIdPaths.delete(path);
            if(oldIdPaths.size === 0)
                this.idToPathsMap.delete(oldId); */
        }

        // if(!skipDependents && newId) {
        /* if(newId) {
            var dependentPaths = this.idToPathsMap.get(newId);
            if(!dependentPaths) {
                dependentPaths = new Set([path]);
                this.idToPathsMap.set(newId, dependentPaths);
            }
            else if(!dependentPaths.has(path))
                dependentPaths.add(path);

            dependentPaths.forEach(p => {
                if(p === path || p.indexOf(rootPath) === 0)
                    return;
                
                this.WriteTo(p, value, true);
            });
        } */

        var skipProperties = new Set();
        if(!IsValue(value)) {
            for(var key in value) {
                var childPath = [path, key].join(".");
                ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
                skipProperties.add(key);
            }
        }

        CleanUp(oldValue, skipProperties, path, response);
        // this.CleanUp(oldValue, skipProperties, path);
        // this.EmitSet(path);
    }

    function CleanUp(value: any, skipProperties: Set<string>, path: string, response: IPostMessage) {
        if(!IsValue(value)) {
            for(var key in value) {
                if(!(skipProperties && skipProperties.has(key))) {
                    var childPath = [path, key].join(".");
                    response.deletedPaths.push(childPath);
                    this.CleanUp(value[key], null, childPath);
                }
            }

            if(!skipProperties || skipProperties.size === 0) {
                var id = this.getIdCallback && this.getIdCallback(value);
                if(id) {
                    response.processedIds.push({
                        newId: null,
                        oldId: id,
                        path: path
                    });

                    /* var paths = this.idToPathsMap.get(id);
                    if(paths) {
                        paths.delete(path);
                        if(paths.size === 0)
                            this.idToPathsMap.delete(id);
                    } */
                }
            }
        }
    }
}

var workerString = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
export namespace ObjectStoreWorker {
    export function Create() {
        return new Worker(workerString);
    }
}