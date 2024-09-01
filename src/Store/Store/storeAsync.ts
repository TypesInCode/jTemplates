// import { ObservableTree } from "../Tree/observableTree";
// import { DiffAsync } from "../Diff/diffAsync";
// import { StoreAsyncWriter } from "./storeAsyncWriter";
// import { AsyncQueue } from "../../Utils/asyncQueue";

// export class StoreAsync {

//     private idFunc: {(val: any): string};
//     private diffAsync: DiffAsync;
//     private observableTree: ObservableTree;
//     private asyncWriter: StoreAsyncWriter;
//     private asyncQueue: AsyncQueue;

//     constructor(idFunc: { (val: any): string }, init?: any) { 
//         this.idFunc = idFunc;
//         this.diffAsync = new DiffAsync(this.idFunc);
//         this.observableTree = new ObservableTree(DiffAsync.ReadKeyRef);
//         this.asyncWriter = new StoreAsyncWriter(this.idFunc, this.diffAsync, this.observableTree);
//         this.asyncQueue = new AsyncQueue();
//         if(init) {
//             var id = this.idFunc(init);
//             this.observableTree.Write(id, init);
//             this.Write(init);
//         }
//     }

//     public Scope<T, R>(id: string, func: {(val: T): R}) {
//         return this.observableTree.Scope(id, func);
//     }

//     public async Action<T>(id: string, action: {(val: T, writer: StoreAsyncWriter): Promise<void>}) {
//         await this.asyncQueue.Next(async () => {
//             await action(id && this.observableTree.Get<T>(id), this.asyncWriter)
//         });
//     }

//     public async Write(data: any) {
//         await this.Action(null, async (val, writer) => {
//             await writer.Write(val, data);
//         });
//     }

//     public async Merge(id: string, data: any) {
//         await this.Action(id, async (val, writer) => {
//             await writer.Merge(val, data);
//         });
//     }

//     public Destroy() {
//         this.asyncQueue.Stop();
//         this.diffAsync.Destroy();
//         // this.observableTree.Destroy();
//     }

// }
