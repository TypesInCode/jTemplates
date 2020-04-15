import { ObservableTree } from "../Tree/observableTree";
import { DiffAsync } from "../Diff/diffAsync";
import { StoreAsyncWriter } from "./StoreAsyncWriter";
import { ObservableNode } from "../Tree/observableNode";

export class StoreAsync {

    private idFunc: {(val: any): string};
    private diffAsync: DiffAsync;
    private observableTree: ObservableTree;
    private asyncWriter: StoreAsyncWriter;

    constructor(idFunc: { (val: any): string }, init?: any) { 
        this.idFunc = idFunc;
        this.diffAsync = new DiffAsync(this.idFunc);
        this.observableTree = new ObservableTree(DiffAsync.ReadKeyRef);
        this.asyncWriter = new StoreAsyncWriter(this.idFunc, this.diffAsync, this.observableTree);
        if(init) {
            var id = this.idFunc(init);
            this.observableTree.Write(id, init);
            this.Write(init);
        }
    }

    public Scope<T, R = T>(id: string, func?: {(val: T): R}) {
        if(func)
            return this.observableTree.Scope<T, R>(id, func);

        return this.observableTree.Scope<T, T>(id, (val: T) => val);
    }

    public async Action<T>(id: string, action: {(val: T, writer: StoreAsyncWriter): Promise<void>}) {
        var node: ObservableNode;
        if(id)
            node = this.observableTree.GetNode(id);
        
        await action(node && node.Proxy, this.asyncWriter);
    }

    public async Write(data: any) {
        await this.Action(null, async (val, writer) => {
            await writer.Write(data);
        });
    }

    public async Merge(id: string, data: any) {
        await this.Action(id, async (val, writer) => {
            await writer.Merge(val, data);
        });
    }

    public Destroy() {
        this.diffAsync.Destroy();
        this.observableTree.Destroy();
    }

}