import { StoreManager } from './storeManager';
export declare class StoreReader<T> {
    private store;
    readonly Root: T;
    constructor(store: StoreManager<T>);
    Get<O>(id: string): O;
}
