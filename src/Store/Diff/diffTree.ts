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

    enum Type {
        Value,
        Object,
        Array
    }

    function TypeOf(value: any): Type {
        if(!value)
            return Type.Value;

        if(jsonConstructor === value.constructor)
            return Type.Object;

        if(Array.isArray(value))
            return Type.Array;

        return Type.Value;
    }

    function JsonDiffRecursive(
        path: string,
        newValue: any,
        oldValue: any,
        resp: IDiffResponse
      ): boolean {
        if (newValue === oldValue) return false;
      
        const newType = TypeOf(newValue);
        const oldType = TypeOf(oldValue);
      
        const changedPathLength = resp.length;
        let allChildrenChanged = true;
      
        if (newType === oldType)
          switch (newType) {
            case Type.Array: {
              allChildrenChanged = JsonDiffArrays(path, newValue, oldValue, resp);
              break;
            }
            case Type.Object: {
              allChildrenChanged = JsonDiffObjects(path, newValue, oldValue, resp);
              break;
            }
          }
      
        if (allChildrenChanged) {
          resp.splice(changedPathLength);
          resp.push({
            path,
            value: newValue
          });
          return true;
        }
      
        return false;
      }
      
      function JsonDiffArrays(
        path: string,
        newValue: any[],
        oldValue: any[],
        resp: IDiffResponse
      ) {
        let allChildrenChanged = true;
      
        if (newValue.length !== oldValue.length)
          resp.push({
            path: path ? `${path}.length` : 'length',
            value: newValue.length
          });
      
        if (newValue.length > 0 || oldValue.length > 0) {
          for (let y = 0; y < newValue.length; y++) {
            const arrayPath = path ? `${path}.${y}` : `${y}`;
            allChildrenChanged = JsonDiffRecursive(arrayPath, newValue[y], oldValue[y], resp) && allChildrenChanged;
          }
        } else allChildrenChanged = false;
      
        return allChildrenChanged;
      }
      
      function JsonDiffObjects(
        path: string,
        newValue: { [key: string]: any },
        oldValue: { [key: string]: any },
        resp: IDiffResponse
      ) {
        let allChildrenChanged = true;
        const newKeys = Object.keys(newValue);
        const oldKeys = Object.keys(oldValue);
      
        if (newKeys.length === 0 && oldKeys.length === 0) {
          return false;
        }
      
        if (newKeys.length >= oldKeys.length) {
          let newKeyIndex = 0;
          let oldKeyIndex = 0;
          while (newKeyIndex < newKeys.length) {
            const childPath = path ? `${path}.${newKeys[newKeyIndex]}` : newKeys[newKeyIndex];
            if (oldKeyIndex < oldKeys.length && newKeys[newKeyIndex] === oldKeys[oldKeyIndex]) {
              allChildrenChanged =
                JsonDiffRecursive(childPath, newValue[newKeys[newKeyIndex]], oldValue[oldKeys[oldKeyIndex]], resp) &&
                allChildrenChanged;
              oldKeyIndex++;
            } else if (newValue[newKeys[newKeyIndex]] !== undefined) {
              resp.push({
                path: childPath,
                value: newValue[newKeys[newKeyIndex]]
              });
            }
      
            newKeyIndex++;
          }
      
          // newValue is missing a property in oldValue
          if (oldKeyIndex < oldKeys.length) allChildrenChanged = true;
        }
      
        return allChildrenChanged;
      }

      function BreakUpValue(path: string, parent: any, keyFunc?: (val: any) => string, prop?: string, map?: Map<string, any>): Map<string, any> {
        const value = prop ? parent[prop] : parent;
        const isValue = IsValue(value);

        if(!map && isValue)
            return new Map([[path, value]]);
        
        map = map || new Map();

        if(isValue)
            return map;

        const key = keyFunc ? keyFunc(value) : null;
        const keyRef = key && DiffTree.GetKeyRef(key);
        if(key && key !== path) {
            if(prop)
                parent[prop] = keyRef;

            BreakUpValue(key, value, keyFunc, null, map);
        }
        else {
            for(const subProp in value) {
                const childPath = `${path}.${subProp}`;
                BreakUpValue(childPath, value, keyFunc, subProp, map);
            }
        }

        if(!prop)
            map.set(path, key === path ? value : keyRef || value);
        
        return map;
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

                JsonDiffRecursive(key, value, currentValue, resp);
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
            
            return BreakUpValue(path, value, this.keyFunc);
        }
    }

    return DiffTree as IDiffTreeConstructor;
}