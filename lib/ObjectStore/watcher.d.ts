import Emitter from "../emitter";
declare class Watcher {
    private emitterStack;
    Watch(callback: {
        (): void;
    }): Set<Emitter>;
    Register(emitter: Emitter): void;
}
export declare var watcher: Watcher;
export {};
