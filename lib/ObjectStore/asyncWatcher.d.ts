import Emitter from "../emitter";
declare class AsyncScope {
    private watcher;
    private parent;
    private emitters;
    constructor(watcher: AsyncWatcher, parent: any);
    Watch(promiseCallback: () => Promise<any>): Promise<Set<Emitter>>;
    Add(emitter: Emitter): void;
}
declare class AsyncWatcher {
    private activeScope;
    private deferredQueue;
    Scope: AsyncScope;
    Get(parent: any): Promise<AsyncScope>;
    Next(): void;
    Register(emitter: Emitter): void;
}
export declare var asyncWatcher: AsyncWatcher;
export {};
