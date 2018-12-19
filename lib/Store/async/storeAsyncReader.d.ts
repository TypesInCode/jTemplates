import { StoreAsync } from './storeAsync';
import { Emitter } from '../../emitter';
import { StoreAsyncWriter } from '../..';
export declare class StoreAsyncReader<T> {
    private store;
    private emitterSet;
    readonly Writer: StoreAsyncWriter<T>;
    readonly Emitters: Set<Emitter>;
    constructor(store: StoreAsync<T>);
    Get<O>(id: string): Promise<O>;
    private CreateGetterObject;
    private RegisterEmitter;
}
