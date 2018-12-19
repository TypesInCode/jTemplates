import { Emitter } from "../../emitter";
import { ObjectDiff } from "../objectDiff";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";

export class Store<T> {

    private root: T;
    private emitterMap: Map<string, Emitter>;
    private diff: {(data: IDiffMethod): any};
    // private arrayCacheMap: Map<string, Array<any>>;

    constructor(idFunction: {(val: any): any}) {
        this.emitterMap = new Map();
        this.diff = ObjectDiff();
        this.diff({
            method: "create",
            arguments: [idFunction]
        });
        // this.arrayCacheMap = new Map();
    }

    public GetReader(): StoreReader<T> {
        return new StoreReader(this);
    }

    public GetWriter(): StoreWriter<T> {
        return new StoreWriter(this);
    }

    public Diff(path: string, newValue: any, skipDependents: boolean) {
        var oldValue = this.ResolvePropertyPath(path);
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
        this.emitterMap.delete(path);
    }

    /* public GetCachedArray(path: string) {
        return this.arrayCacheMap.get(path);
    }

    public SetCachedArray(path: string, array: Array<any>) {
        this.arrayCacheMap.set(path, array);
    } */

}

export namespace Store {
    export function Create<T>(init: T, idFunction?: {(val: any): any}): StoreWriter<T> {
        var store = new Store<T>(idFunction);
        var writer = store.GetWriter();
        writer.Root = init;
        return writer;
    }
}