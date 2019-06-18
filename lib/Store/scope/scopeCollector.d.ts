import Emitter from "../../emitter";
declare class ScopeCollector {
    private emitterStack;
    Watch(callback: {
        (): void;
    }): Set<Emitter>;
    Register(emitter: Emitter): void;
}
export declare var scopeCollector: ScopeCollector;
export {};
