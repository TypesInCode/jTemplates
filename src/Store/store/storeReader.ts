import { StoreManager } from './storeManager';

export class StoreReader<T> {

    public get Root(): T {
        var node = this.store.GetNode("root");
        return node.Proxy as any as T;
    }
    
    constructor(private store: StoreManager<T>) {
        
    }

    public Get<O>(id: string): O {
        return this.store.GetIdNode(id).Proxy as any as O;
    }

}