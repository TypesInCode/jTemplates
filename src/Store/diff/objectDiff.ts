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
                    tracker = Create();
                    break;
                case "diff" :
                    return tracker.Diff.apply(tracker, data.arguments);
                case "diffbatch" :
                    return tracker.DiffBatch.apply(tracker, data.arguments);
                default :
                    throw `${data.method} is not supported`;
            }
        }

        return Call;
    }

    var jsonConstructor = {}.constructor;
    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || jsonConstructor === value.constructor)
    }

    function Create() { 
        return new ObjectDiffTracker();
    }

    class ObjectDiffTracker {

        public DiffBatch(batch: Array<{ path: string, newValue: any, oldValue: any }>) {
            var resp = {
                changedPaths: [] as Array<string>,
                deletedPaths: [] as Array<string>
            };

            for(var x=0; x<batch.length; x++) {
                var diffResp = this.Diff(batch[x].path, batch[x].newValue, batch[x].oldValue);
                resp.changedPaths.push(...diffResp.changedPaths);
                resp.deletedPaths.push(...diffResp.deletedPaths);
            }

            return resp;
        }

        public Diff(path: string, newValue: any, oldValue: any) {
            var resp = {
                changedPaths: [],
                deletedPaths: [],
            } as IDiffResponse;
            this.DiffValues(path, path, newValue, oldValue, resp);
            return resp;
        }

        private DiffValues(rootPath: string, path: string, newValue: any, oldValue: any, resp: IDiffResponse) {
            if(oldValue === undefined)
                return;

            if(oldValue === null && newValue !== null) {
                resp.changedPaths.push(path);
                return;
            }
            
            var newIsObject = !IsValue(newValue);
            var oldIsObject = !IsValue(oldValue);

            if(!newIsObject && !oldIsObject && newValue !== oldValue) {
                resp.changedPaths.push(path);
                return;
            }

            var newKeys = new Set();
            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
            if(newIsObject)
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
                    resp.deletedPaths.push(childPath);
                else
                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], resp);
            }

            if(oldValue !== undefined && pathChanged || newKeys.size > 0)
                resp.changedPaths.push(path);
        }
    }

    return CreateScope;
}

export var ObjectDiff = ObjectDiffScope(true);