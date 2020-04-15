import { ObservableTree } from "../Tree/observableTree";
import { ObservableProxy, Type } from "../Tree/observableProxy";
import { StoreWriter } from "./StoreWriter";

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
            // this.observableTree.Write("ROOT", init);
    }

    public Action(action: {(root: T, writer: StoreWriter): void}) {
        var node = this.observableTree.GetNode("ROOT", true);
        action(node.Proxy, this.storeWriter);
    }
    
    public Write(data: T) {
        this.Action((root, writer) => 
            writer.Write(root, data)
        );
        // this.observableTree.Write("ROOT", data);
    }

    public Merge(data: Partial<T>) {
        this.Action((root, writer) => 
            writer.Merge(root, data)
        );
        /* if(ObservableProxy.TypeOf(data) === Type.Value)
            this.observableTree.Write("ROOT", data);
        else
            for(var key in data)
                this.observableTree.Write(`ROOT.${key}`, data[key]); */
    }

    public Destroy() {
        this.rootScope.Destroy();
        this.observableTree.Destroy();
    }

}