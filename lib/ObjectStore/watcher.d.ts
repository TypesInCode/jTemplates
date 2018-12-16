import Emitter from "../emitter";
declare class Watcher {
    private emitterStack;
    private asyncQueue;
    Watch(callback: {
        (): void;
    }): Set<Emitter>;
    WatchAsync(callback: {
        (): Promise<any>;
    }): Promise<Set<Emitter>>;
    Register(emitter: Emitter): void;
    private ProcessAsyncQueue;
}
export declare var watcher: Watcher;
export {};
