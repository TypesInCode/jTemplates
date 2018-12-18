import { Store } from './store';
import { Emitter } from '../../emitter';
export declare class StoreReader<T> {
    private store;
    private emitterSet;
    readonly Root: T;
    readonly Emitters: Set<Emitter>;
    constructor(store: Store<T>);
    Get<O>(id: string): O;
    private CreateGetterObject;
    private RegisterEmitter;
    private EmitSet;
}
