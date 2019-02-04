import { Emitter } from "../../emitter";
import { ObjectDiff } from "../objectDiff";

export class StoreManager<T> {

    private root: T;
    private emitterMap: Map<string, Emitter>;
    private diff: {(data: IDiffMethod): any};

    constructor(idFunction: {(val: any): any}) {
        this.emitterMap = new Map();
        this.diff = ObjectDiff();
        this.diff({
            method: "create",
            arguments: [idFunction]
        });
    }

    public Diff(path: string, newValue: any, skipDependents: boolean) {
        var oldValue = this.ResolvePropertyPath(path);
        if(oldValue && oldValue.___storeProxy)
                oldValue = oldValue.toJSON();
        
        if(newValue && newValue.___storeProxy)
            newValue = newValue.toJSON();
        
        return this.diff({
            method: "diff",
            arguments: [path, newValue, oldValue, skipDependents]
        }) as IDiffResponse;
    }

    public GetPathById(id: string): string {
        var path = this.diff({
            method: "getpath",
            arguments: [id]
        }) as string;
        if(!path)
            return;
        
        return path;
    }

    public EnsureEmitter(path: string): Emitter {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }

        return emitter;
    }

    public AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));

        (parentObj as any)[prop] = value;
    }

    public ResolvePropertyPath(path: string) {
        if(!path)
            return this;
        
        return path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this);
    }

    public DeleteEmitter(path: string) {
        var emitter = this.emitterMap.get(path);
        if(emitter) {
            this.emitterMap.delete(path);
            emitter.emit("destroy", emitter);
        }
    }

    public Destroy() {
        this.root = null;
        this.emitterMap.forEach(value => value.removeAllListeners());
        this.emitterMap.clear();
    }

}