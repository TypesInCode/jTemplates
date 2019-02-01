import { StoreManager } from './storeManager';
import { Emitter } from '../../emitter';
export declare class StoreReader<T> {
    private store;
    private emitterSet;
    private writer;
    private watching;
    private destroyed;
    readonly Root: T;
    readonly Emitters: Set<Emitter>;
    Watching: boolean;
    constructor(store: StoreManager<T>);
    Get<O>(id: string): O;
    Destroy(): void;
    private GetArray;
    private CreateGetterObject;
    private RegisterEmitter;
}
