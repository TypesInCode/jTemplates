import { StoreAsyncManager } from './storeAsyncManager';
import { Emitter } from '../../emitter';
export declare class StoreAsyncReader<T> {
    private store;
    private emitterSet;
    private writer;
    private watching;
    private destroyed;
    readonly Root: T;
    readonly Emitters: Set<Emitter>;
    Watching: boolean;
    constructor(store: StoreAsyncManager<T>);
    Get<O>(id: string): Promise<O>;
    Destroy(): void;
    private GetArray;
    private CreateGetterObject;
    private RegisterEmitter;
}
