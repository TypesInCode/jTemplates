import { AsyncActionCallback, ActionCallback, FuncCallback } from "./store.types";
import { StoreManager } from "./storeManager";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
// import { PromiseQueue } from "../../Promise/promiseQueue";
import { Diff } from "../diff/diff.types";
import { Scope } from "../scope/scope";
import { AsyncQueue } from "../../Utils/asyncQueue";

export class AbstractStore {
    public ActionSync(action: ActionCallback<any>) { }

    public async Action(action: AsyncActionCallback<any>): Promise<void> { }

    public async Update(updateCallback: { (val: any): void } | any): Promise<void> { }

    public async Merge(value: Partial<any>): Promise<void> { }

    public async Write(value: any): Promise<void> { }

    // public async Get(id?: string): Promise<any> { }

    public Query<O>(queryFunc: FuncCallback<any, O>): Scope<O> {
        return null;
    }
}

export class Store<T extends {} | Array<any>> implements AbstractStore {

    private manager: StoreManager<T>;
    private reader: StoreReader<T>;
    private writer: StoreWriter<T>;
    // private promiseQueue: PromiseQueue<any>;
    private asyncQueue: AsyncQueue<void>;
    private rootScope: Scope<T>;

    public get Root() {
        return this.rootScope;
    }

    constructor(idFunction: (val: any) => any, init: T, diff: Diff) {
        // this.destroyed = false;
        this.manager = new StoreManager(idFunction, diff);
        this.reader = new StoreReader<T>(this.manager);
        this.writer = new StoreWriter<T>(this.manager);
        // this.promiseQueue = new PromiseQueue();
        this.asyncQueue = new AsyncQueue();
        this.Action(async () => {
            await this.manager.WritePath("root", init);
        });
        
        this.rootScope = new Scope(() => {
            var value = null;
            this.ActionSync(reader => value = reader.Root);
            return value || init;
        });
    }

    public async Action(action: AsyncActionCallback<T>): Promise<void> {
        return new Promise(resolve => {
            this.asyncQueue.Add(async next => {
                await action(this.reader, this.writer);
                resolve();
                next();
            });
            this.asyncQueue.Start();
        });
    }

    public ActionSync(action: ActionCallback<T>) {
        action(this.reader);
    }

    public async Update(value: T) {
        await this.Action(async (reader, writer) => {
            await writer.Update(reader.Root, value);
        });
    }

    public async Merge(value: Partial<T>) {
        await this.Action(async (reader, writer) => {
            await writer.Merge(reader.Root, value);
        });
    }

    public async Write(value: any) {
        await this.Action(async (reader, writer) => {
            await writer.Write(value);
        });
    }

    public Query<O>(queryFunc: FuncCallback<T, O>): Scope<O> {
        return new Scope<O>(() => {
            var value = null;
            this.ActionSync(reader => value = queryFunc(reader));
            return value;
        });
    }

    public Destroy() {
        this.asyncQueue.Stop();
        this.rootScope.Destroy();
        this.manager.Destroy();
    }

}