import { ObservableTree } from "../Tree/observableTree";
import { StoreWriter } from "./storeWriter";

export class Store<T> {

    private observableTree = new ObservableTree();
    private storeWriter = new StoreWriter(this.observableTree);
    private rootScope = this.observableTree.Scope<T, T>("ROOT", root => root);

    public get Root() {
        return this.rootScope;
    }

    constructor(init?: T) {
        if(init)
            this.Write(init);
    }

    public Action(action: {(root: T, writer: StoreWriter): void}) {
        /* var node = this.observableTree.GetNode("ROOT");
        action(node.Proxy, this.storeWriter); */
        var proxy = this.observableTree.Get<T>("ROOT");
        action(proxy, this.storeWriter);
    }
    
    public Write(data: T) {
        this.Action((root, writer) => 
            writer.Write(root, data)
        );
    }

    public Merge(data: Partial<T>) {
        this.Action((root, writer) => 
            writer.Merge(root, data)
        );
    }

    public Destroy() {
        this.rootScope.Destroy();
        // this.observableTree.Destroy();
    }

}
