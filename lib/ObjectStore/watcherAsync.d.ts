import Emitter from "../emitter";
declare class ScopeAsync {
    private watcher;
    private parent;
    private emitters;
    constructor(watcher: WatcherAsync, parent: any);
    Watch(promiseCallback: () => Promise<any>): Promise<Set<Emitter>>;
    Add(emitter: Emitter): void;
}
declare class WatcherAsync {
    private activeScope;
    private deferredQueue;
    Scope: ScopeAsync;
    Get(parent: any): Promise<ScopeAsync>;
    Next(): void;
    Register(emitter: Emitter): void;
}
export declare var watcherAsync: WatcherAsync;
export {};
