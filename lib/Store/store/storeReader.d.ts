import { StoreManager } from './storeManager';
import { Emitter } from '../../emitter';
export declare class StoreReader<T> {
    private store;
    private emitterSet;
    private watching;
    readonly Root: T;
    readonly Emitters: Set<Emitter>;
    Watching: boolean;
    constructor(store: StoreManager<T>);
    Get<O>(id: string): O;
    Register(emitter: Emitter): void;
    Destroy(): void;
}
