import { IDiffMethod, IDiffResponse } from "./diff.types";

export function ObjectDiffScope(notWorker: boolean) {

        const ctx: Worker = this as any;
        if(ctx && !notWorker) {
            let diff = CreateScope();
            ctx.onmessage = function(event: any) {
                var resp = diff(event.data);
                ctx.postMessage(resp);
            };
        }
    
    function CreateScope() {
        var tracker: ObjectDiffTracker = null;

        function Call(data: IDiffMethod) {            
            switch(data.method) {
                case "create" :
                    tracker = Create(); // data.arguments[0]);
                    break;
                case "diff" :
                    return tracker.Diff.apply(tracker, data.arguments);
                /* case "getpath" :
                    return tracker.GetPath.apply(tracker, data.arguments); */
                default :
                    throw `${data.method} is not supported`;
            }
        }

        return Call;
    }

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    function Create() { // idFunction: {(val: any): any} | string) {
        /* var localIdFunction = null as {(val: any): any};
        if(typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if(idFunction)
            localIdFunction = idFunction; */

        return new ObjectDiffTracker();
    }

    class ObjectDiffTracker {
        private idToPathsMap: Map<any, Set<string>> = new Map();

        constructor() { }

        public GetPath(id: string) {
            var paths = this.idToPathsMap.get(id);
            if(paths)
                return paths.values().next().value;

            return null;
        }

        public Diff(path: string, newValue: any, oldValue: any) {
            var resp = {
                changedPaths: [],
                deletedPaths: [],
                pathDependencies: []
            } as IDiffResponse;
            this.DiffValues(path, path, newValue, oldValue, resp);
            resp.changedPaths = resp.changedPaths.reverse();
            return resp;
        }

        private DiffValues(rootPath: string, path: string, newValue: any, oldValue: any, resp: IDiffResponse) {
            var newIsObject = !IsValue(newValue);
            var oldIsObject = !IsValue(oldValue);

            if(!newIsObject && !oldIsObject) {
                if(oldValue !== undefined && newValue !== oldValue)
                    resp.changedPaths.push(path);
                
                return;
            }

            /* var newId = newIsObject && newValue && this.idFunction && this.idFunction(newValue);
            var oldId = oldIsObject && oldValue && this.idFunction && this.idFunction(oldValue);
            
            if(oldId && oldId !== newId) {
                this.RemoveIdPath(oldId, path);
            }

            if(newId) {
                var dependentPaths = this.AddIdPath(newId, path);

                if(!skipDependentsProcessing) {
                    var dependency = { path: path, targets: [] as Array<string> };
                    dependentPaths.forEach(p => {
                        if(p === path || p.indexOf(rootPath) === 0)
                            return;
                        
                        dependency.targets.push(p);
                    });
                    if(dependency.targets.length > 0)
                        resp.pathDependencies.push(dependency);
                }
            } */

            var newKeys = new Set(); // newIsObject ? new Set(Object.keys(newValue)) : new Set();
            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
            if(oldKeys.length > 0 && newIsObject)
                newKeys = new Set(Object.keys(newValue));

            var pathChanged = false;
            for(var x=0; x<oldKeys.length; x++) {
                var key = oldKeys[x];
                var childPath = [path, key].join(".");
                var deletedKey = !newKeys.has(key);
                if(!deletedKey)
                    newKeys.delete(key);
                
                pathChanged = pathChanged || deletedKey;
                if(deletedKey)
                    // this.DeletePaths(childPath, oldValue[key], resp);
                    resp.deletedPaths.push(childPath);
                else
                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], resp);
            }

            /* newKeys.forEach(key => 
                this.FindNewIds([path, key].join("."), newValue[key])); */

            if(oldValue !== undefined && pathChanged || newKeys.size > 0)
                resp.changedPaths.push(path);
        }

        /* private RemoveIdPath(id: string, path: string) {
            var oldIdPaths = this.idToPathsMap.get(id);
            if(oldIdPaths) {
                oldIdPaths.delete(path);
                if(oldIdPaths.size === 0)
                    this.idToPathsMap.delete(id);
            }
        }

        private AddIdPath(id: string, path: string) {
            var dependentPaths = this.idToPathsMap.get(id);
            if(!dependentPaths) {
                dependentPaths = new Set([path]);
                this.idToPathsMap.set(id, dependentPaths);
            }
            else if(!dependentPaths.has(path))
                dependentPaths.add(path);

            return dependentPaths;
        } */

        /* private FindNewIds(path: string, value: any) {
            if(IsValue(value))
                return;

            var id = value && this.idFunction && this.idFunction(value);
            if(id)
                this.AddIdPath(id, path);

            for(var key in value)
                this.FindNewIds([path, key].join("."), value[key]);
        } */

        /* private DeletePaths(path: string, value: any, resp: IDiffResponse) {
            resp.deletedPaths.push(path);
            var id = value && this.idFunction && this.idFunction(value);
            if(id)
                this.RemoveIdPath(id, path);

            if(IsValue(value))
                return;

            for(var key in value)
                this.DeletePaths([path, key].join("."), value[key], resp);
        } */
    }

    return CreateScope;
}

export var ObjectDiff = ObjectDiffScope(true);