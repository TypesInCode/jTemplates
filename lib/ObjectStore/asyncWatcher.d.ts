import Emitter from "../emitter";
declare class AsyncScope {
    private watcher;
    private emitters;
    constructor(watcher: AsyncWatcher);
    Watch(promise: Promise<any>): Promise<Set<Emitter>>;
    Add(emitter: Emitter): void;
}
declare class AsyncWatcher {
    private activeScope;
    private deferredQueue;
    Scope: AsyncScope;
    Get(): Promise<AsyncScope>;
    Next(): void;
    Register(emitter: Emitter): void;
}
export declare var asyncWatcher: AsyncWatcher;
export {};
