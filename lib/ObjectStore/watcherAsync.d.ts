import Emitter from "../emitter";
declare class ScopeAsync {
    private watcher;
    private emitters;
    constructor(watcher: WatcherAsync);
    Watch(promiseCallback: () => Promise<any>): Promise<any[]>;
    Add(emitter: Emitter): void;
}
declare class WatcherAsync {
    private activeScope;
    private deferredQueue;
    Scope: ScopeAsync;
    Get(): Promise<ScopeAsync>;
    Next(): void;
    Register(emitter: Emitter): void;
}
export declare var watcherAsync: WatcherAsync;
export {};
