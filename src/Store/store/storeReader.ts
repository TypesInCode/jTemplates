import { StoreManager } from './storeManager';
import { Emitter } from '../../Utils/emitter';
import { CreateProxy } from '../utils';
import { ScopeCollector } from '../scope/scopeCollector';
// import { StoreWriter } from './storeWriter';


export class StoreReader<T> {
    
    private emitterSet: Set<Emitter>;
    // private writer: StoreWriter<T>;
    private watching: boolean;

    public get Root(): T {
        var node = this.store.GetNode("root");
        node && this.Register(node.Emitter);
        return CreateProxy(node, this); //, this.store);
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
        // this.writer = new StoreWriter<T>(store);
    }

    public Get<O>(id: string): O {
        /* var path = this.store.GetPathById(id);
        if(!path)
            return undefined;
        
        var node = this.store.GetNode(path); */
        var node = this.store.GetIdNode(id);
        node && this.Register(node.Emitter);
        return node && CreateProxy(node, this); //, this.store);
    }

    public Register(emitter: Emitter) {
        if(this.watching && !this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);

        ScopeCollector.Register(emitter);
    }

    public Destroy() {
        this.watching = false;
        this.emitterSet.clear();
    } 

}