export interface IDiffMethod {
    method: "create" | "diffpath" | "diffbatch" | "updatepath" | "getpath";
    arguments: Array<any>;
}

export type IDiffResponse = { path: string, value: any }[];

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
                case "getpath":
                    var ret = diffTree.GetPath(data.arguments[0]);
                    ctx.postMessage(ret);
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
            var resp: IDiffResponse = [];
;
            for(var x=0; x<data.length; x++)
                this.RunDiff(data[x].path, data[x].value, resp);

            return resp;
        }

        public DiffPath(path: string, value: any) {
            var resp: IDiffResponse = [];

            this.RunDiff(path, value, resp);
            return resp;
        }

        public UpdatePath(path: string, value: any) {
            this.SetPathValue(path, value);
        }

        public GetPath(path: string) {
            return this.GetPathValue(path);
        }

        private RunDiff(path: string, value: any, diffResp: IDiffResponse) {
            var breakupMap = this.GetBreakUpMap(path, value);
            var resp: IDiffResponse = diffResp || [];

            breakupMap.forEach((value, key) => {
                var currentValue = key.split(".").reduce((pre: any, curr: string, index) => {
                    if(index === 0)
                        return this.rootStateMap.get(curr);
    
                    return pre && pre[curr];
                }, null);

                this.DiffJson(key, value, currentValue, resp);
            });

            for(var x=0; x<resp.length; x++)
                this.SetPathValue(resp[x].path, resp[x].value);
        }

        private GetPathValue(path: string) {
            var parts = path.split(".");
            var curr = this.rootStateMap.get(parts[0]);
            for(var x=1; x<parts.length; x++)
                curr = curr && curr[parts[x]];

            return curr;
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
                    var childPath = `${path}.${subProp}`;
                    this.BreakUpValue(childPath, value, subProp, map);
                }
            }

            if(!prop)
                map.set(path, key === path ? value : keyRef || value);
            
            return map;
        }

        private DiffJson(path: string, newValue: any, oldValue: any, resp: IDiffResponse): boolean {
            const oldIsValue = IsValue(oldValue);
            const newIsValue = IsValue(newValue);

            if (oldIsValue || newIsValue) {
                if (oldValue !== newValue) {
                    resp.push({
                        path,
                        value: newValue
                    });
                    return true;
                }
                return false;
            }

            let allChildrenChanged = true;
            let childDeleted = false;
            const oldIsArray = Array.isArray(oldValue);
            const newIsArray = Array.isArray(newValue);
            if (oldIsArray !== newIsArray) {
                resp.push({
                    path,
                    value: newValue
                });
                return true;
            }

            const changedPathLength = resp.length;
            if (oldIsArray && newIsArray) {
                if (oldValue.length === 0 && newValue.length === 0)
                    return false;

                // tslint:disable-next-line: prefer-for-of
                for (let y = 0; y < newValue.length; y++) {
                    const arrayPath = path ? `${path}.${y}` : `${y}`;
                    allChildrenChanged = this.DiffJson(arrayPath, newValue[y], oldValue[y], resp) && allChildrenChanged;
                }
                if (!allChildrenChanged && newValue.length < oldValue.length)
                    resp.push({
                        path: path ? `${path}.length` : 'length',
                        value: newValue.length
                    });
            }
            else {
                const oldKeys = Reflect.ownKeys(oldValue) as string[];
                const newKeys = Reflect.ownKeys(newValue) as string[];
                if (oldKeys && oldKeys.length === 0 && newKeys.length === 0)
                    return false;

                const newKeysSet = new Set(newKeys);
                // tslint:disable-next-line: prefer-for-of
                for (let x = 0; x < oldKeys.length && !childDeleted; x++) {
                    const oldKey: string = oldKeys[x];
                    const childPath = path ? `${path}.${oldKey}` : `${oldKey}`;

                    if (newKeysSet.delete(oldKey))
                        allChildrenChanged = this.DiffJson(childPath, newValue[oldKey], oldValue[oldKey], resp) && allChildrenChanged;
                    else if (path)
                        childDeleted = true;
                    else
                        resp.push({
                            path: childPath,
                            value: undefined
                        });
                }

                newKeysSet.forEach(key => {
                    const childPath = path ? `${path}.${key}` : `${key}`;
                    resp.push({
                        path: childPath,
                        value: newValue[key]
                    });
                });
            }

            if (path && (allChildrenChanged || childDeleted)) {
                resp.splice(changedPathLength);
                resp.push({
                    path,
                    value: newValue
                });
                return true;
            }

            return false;
        }
    }

    return DiffTree as IDiffTreeConstructor;
}