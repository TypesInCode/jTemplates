import Emitter from "../emitter";
declare class Watcher {
    private emitterStack;
    private asyncQueue;
    private processingAsync;
    Watch(callback: {
        (): void;
    }): Set<Emitter>;
    WatchAsync(callback: {
        (): Promise<any>;
    }): Promise<{
        emitters: Set<Emitter>;
        value: any;
    }>;
    Register(emitter: Emitter): void;
    GoAsync(): void;
    private ProcessAsyncQueue;
}
export declare var watcher: Watcher;
export {};
