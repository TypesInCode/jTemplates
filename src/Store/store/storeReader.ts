import { StoreManager } from './storeManager';
import { Emitter } from '../../Utils/emitter';

export class StoreReader<T> {
    
    private emitterSet: Set<Emitter>;
    private watching: boolean;

    public get Root(): T {
        var node = this.store.GetNode("root");
        return node.Proxy as any as T;
    }

    public get Emitters() {
        return this.emitterSet;
    }

    public get Watching() {
        return this.watching;
    }

    public set Watching(val: boolean) {
        this.emitterSet = val ? new Set() : this.emitterSet;
        this.watching = val;
    }

    constructor(private store: StoreManager<T>) {
        this.watching = false;
    }

    public Get<O>(id: string): O {
        return this.store.GetIdNode(id).Proxy as any as O;
    }

    public Destroy() {
        this.watching = false;
        this.emitterSet.clear();
    } 

}