export function ObjectDiffScope(asWorker: boolean) {

    // event registration if being used as a Web Worker
    if(asWorker) {
        const ctx: Worker = self as any;
        ctx.addEventListener && ctx.addEventListener("message", (event) => {
            var data = event.data as IMessage;
            var resp = Start(data.path, data.newValue, data.oldValue, data.idFunction);
            ctx.postMessage(resp);
        });
    }

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    class ObjectDiff {

        private changedPaths: Array<string> = [];
        private deletedPaths: Array<string> = [];
        private processedIds: Array<{ newId: string, oldId: string, path: string}> = [];

        private result: IPostMessage;
        get Result(): IPostMessage {
            if(!this.result) {
                this.Execute();
                this.result = Object.freeze({
                    changedPaths: this.changedPaths.reverse(),
                    deletedPaths: this.deletedPaths,
                    processedIds: this.processedIds,
                    rootPath: this.rootPath
                });
            }

            return this.result;
        }

        constructor(private rootPath: string, private newValue: any, private oldvalue: any, private idFunction: {(val: any): any}) {}

        private Execute() {
            this.DiffValues(this.rootPath, this.newValue, this.oldvalue);
        }

        private DiffValues(path: string, newValue: any, oldValue: any) {
            var newIsObject = !IsValue(newValue);
            var oldIsObject = !IsValue(oldValue);

            var newId = newIsObject && newValue && this.idFunction && this.idFunction(newValue);
            var oldId = oldIsObject && oldValue && this.idFunction && this.idFunction(oldValue);
            if(oldId || newId) {
                this.processedIds.push({
                    newId: newId,
                    oldId: oldId,
                    path: path
                });
            }

            if(!newIsObject && !oldIsObject) {
                if(newValue !== oldValue)
                    this.changedPaths.push(path);
                
                return;
            }

            var newKeys = newIsObject ? new Set(Object.keys(newValue)) : new Set();
            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];

            var pathChanged = false;
            for(var x=0; x<oldKeys.length; x++) {
                var key = oldKeys[x];
                var childPath = [path, key].join(".");
                var deletedKey = !newKeys.has(key);
                if(!deletedKey)
                    newKeys.delete(key);
                
                pathChanged = pathChanged || deletedKey;
                if(deletedKey)
                    this.DeletePaths(childPath, oldValue[key]);
                else
                    this.DiffValues(childPath, newValue && newValue[key], oldValue[key])
            }

            newKeys.forEach(key => 
                this.FindNewIds([path, key].join("."), newValue[key]));

            if(pathChanged || newKeys.size > 0)
                this.changedPaths.push(path);
        }

        private FindNewIds(path: string, value: any) {
            if(IsValue(value))
                return;

            var id = value && this.idFunction && this.idFunction(value);
            if(id)
                this.processedIds.push({
                    newId: id,
                    oldId: null,
                    path: path
                });

            for(var key in value)
                this.FindNewIds([path, key].join("."), value[key]);
        }

        private DeletePaths(path: string, value: any) {
            this.deletedPaths.push(path);
            var id = value && this.idFunction && this.idFunction(value);
            if(id)
                this.processedIds.push({
                    newId: null,
                    oldId: id,
                    path: path
                });

            if(IsValue(value))
                return;

            for(var key in value) {
                var childPath = [path, key].join(".");
                this.DeletePaths(childPath, value[key]);
            }
        }

    }

    function Start(path: string, newValue: any, oldValue: any, idFunction: {(val: any): any} | string): IPostMessage {
        var localIdFunction = null as {(val: any): any};
        if(typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if(idFunction)
            localIdFunction = idFunction;

        return (new ObjectDiff(path, newValue, oldValue, localIdFunction)).Result;
    }

    return Start;
}

export var ObjectDiff = ObjectDiffScope(false);