import Emitter from "../emitter";
declare class GlobalEmitter {
    private emitterStack;
    Watch(callback: {
        (): void;
    }): Promise<Set<Emitter>>;
    Register(emitter: Emitter): void;
}
export declare var globalEmitter: GlobalEmitter;
export {};
