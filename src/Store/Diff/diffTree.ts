export interface IDiffMethod {
    method: "create" | "diffpath" | "diffbatch" | "updatepath";
    arguments: Array<any>;
}

export interface IDiffResponse {
    changedPaths: Array<{ path: string, value: any }>;
    deletedPaths: Array<string>;
}

export interface IDiffTree {
    DiffBatch(data: Array<{path: string, value: any }>): IDiffResponse;
    DiffPath(path: string, value: any): IDiffResponse;
    UpdatePath(path: string, value: any): void;
}

export interface IDiffTreeConstructor {
    new (keyFunc?: {(val: any): string}): IDiffTree;
    GetKeyRef(key: string): string;
    ReadKeyRef(ref: string): string;
}

export function DiffTreeScope(worker?: boolean) {

    const ctx: Worker = this as any;
    if(ctx && worker) {
        let diffTree: DiffTree = null;

        ctx.onmessage = function(event: any) {
            var data = event.data as IDiffMethod;
            switch(data.method) {
                case "create":
                    var keyFunc = data.arguments[0] ? eval(data.arguments[0]) : undefined;
                    diffTree = new DiffTree(keyFunc);
                    ctx.postMessage(null);
                    break;
                case "diffpath":
                    var diff = diffTree.DiffPath(data.arguments[0], data.arguments[1]);
                    ctx.postMessage(diff);
                    break;
                case "diffbatch":
                    var diff = diffTree.DiffBatch(data.arguments[0]);
                    ctx.postMessage(diff);
                    break;
                case "updatepath":
                    diffTree.UpdatePath(data.arguments[0], data.arguments[1]);
                    ctx.postMessage(null);
                    break;
            }
        }
    }

    const jsonConstructor = {}.constructor;
    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(jsonConstructor === value.constructor || Array.isArray(value));
    }

    class DiffTree implements IDiffTree {

        private rootStateMap = new Map<string, any>();

        constructor(private keyFunc?: {(val: any): string}) { }

        public static GetKeyRef(key: string) {
            return `___DiffTreeKeyRef.${key}`;
        }

        public static ReadKeyRef(ref: string) {
            if(!ref)
                return undefined;

            var matches = ref.match(/^___DiffTreeKeyRef\.([^.]+$)/);
            if(!matches)
                return undefined;

            return matches[1];
        }

        public DiffBatch(data: Array<{path: string, value: any }>) {
            var resp: IDiffResponse = {
                changedPaths: [],
                deletedPaths: []
            };
;
            for(var x=0; x<data.length; x++)
                this.RunDiff(data[x].path, data[x].value, resp);

            return resp;
        }

        public DiffPath(path: string, value: any) {
            var resp: IDiffResponse = {
                changedPaths: [],
                deletedPaths: []
            };

            this.RunDiff(path, value, resp);
            return resp;
        }

        public UpdatePath(path: string, value: any) {
            this.SetPathValue(path, value);
        }

        private RunDiff(path: string, value: any, diffResp: IDiffResponse) {
            var breakupMap = this.GetBreakUpMap(path, value);
            var resp: IDiffResponse = diffResp || {
                changedPaths: [],
                deletedPaths: []
            };

            breakupMap.forEach((value, key) => {
                var currentValue = key.split(".").reduce((pre: any, curr: string, index) => {
                    if(index === 0)
                        return this.rootStateMap.get(curr);
    
                    return pre && pre[curr];
                }, null);

                this.DiffValues(key, value, currentValue, resp);
            });

            resp.changedPaths.forEach(val => {
                this.SetPathValue(val.path, val.value);
            });
        }

        private SetPathValue(path: string, value: any) {
            var parts = path.split(".");
            if(parts.length === 1)
                this.rootStateMap.set(parts[0], value);
            else {
                var curr = this.rootStateMap.get(parts[0]);
                for(var x=1; x<parts.length - 1; x++)
                    curr = curr[parts[x]];

                curr[parts[parts.length - 1]] = value;
            }  
        }

        private GetBreakUpMap(path: string, value: any) {
            if(!this.keyFunc)
                return new Map([[path, value]]);
            
            return this.BreakUpValue(path, value);
        }
    
        private BreakUpValue(path: string, parent: any, prop?: string, map?: Map<string, any>): Map<string, any> {
            var value = prop ? parent[prop] : parent;
            var isValue = IsValue(value);

            if(!map && isValue)
                return new Map([[path, value]]);
            
            map = map || new Map();

            if(isValue)
                return map;

            var key = this.keyFunc ? this.keyFunc(value) : null;
            var keyRef = key && DiffTree.GetKeyRef(key);
            if(key && key !== path) {
                if(prop)
                    parent[prop] = keyRef;

                this.BreakUpValue(key, value, null, map);
            }
            else {
                for(var subProp in value) {
                    var childPath = `${path}.${subProp}`; //[path, subProp].join(".");
                    this.BreakUpValue(childPath, value, subProp, map);
                }
            }

            if(!prop)
                map.set(path, key === path ? value : keyRef || value);
            
            return map;
        }

        private DiffValues(path: string, newValue: any, oldValue: any, resp: IDiffResponse) {
            var changedPathLength = resp.changedPaths.length;
            var oldIsValue = IsValue(oldValue);
            
            if(oldIsValue) {
                if(oldValue !== newValue) {
                    resp.changedPaths.push({
                        path: path,
                        value: newValue
                    });
                    return true;
                }
                return false;
            }

            var oldKeys = Array.isArray(oldValue) ? null : Object.keys(oldValue);
            var newIsValue = IsValue(newValue);
            if(newIsValue) {
                resp.changedPaths.push({
                    path: path,
                    value: newValue
                });

                for(var x=0; x<(oldKeys || oldValue).length; x++)
                    resp.deletedPaths.push(`${path}.${oldKeys ? oldKeys[x] : x}`);

                return true;
            }

            var deleted = false;
            var allChanged = true;
            var newKeys = Object.keys(newValue);
            var newKeysSet = new Set(newKeys);
            for(var x=0; x<(oldKeys || oldValue).length; x++) {
                var oldKey: string = oldKeys ? oldKeys[x] : x.toString();
                var childPath = `${path}.${oldKey}`;
                var stays = newKeysSet.delete(oldKey);
                if(stays)
                    allChanged = this.DiffValues(childPath, newValue[oldKey], oldValue[oldKey], resp) && allChanged;
                else {
                    deleted = true;
                    resp.deletedPaths.push(childPath);
                }
            }

            if(allChanged || deleted) { // || newKeys.size > 0) {
                resp.changedPaths.splice(changedPathLength);
                resp.changedPaths.push({
                    path: path,
                    value: newValue
                });
                return true;
            }
            else if(newKeysSet.size > 0) {
                newKeysSet.forEach(function(key) {
                    resp.changedPaths.push({
                        path: `${path}.${key}`,
                        value: newValue[key]
                    });
                });
            }

            return false;
        }

    }

    return DiffTree as IDiffTreeConstructor;
}