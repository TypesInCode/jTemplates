import { ObservableTree } from "./observableTree";
import { Emitter } from "../../Utils/emitter";
import { Type, ObservableProxy } from "./observableProxy";
import { ObservableScope } from "./observableScope";

export class ObservableNode {

    private children = new Map<string, ObservableNode>();
    private emitter = new Emitter();

    // Cached values
    private path: string = undefined;
    private value: any = undefined;
    private type: Type = undefined;
    private oldType: Type = undefined;
    private self: ObservableNode = undefined;
    private proxy: ObservableProxy = undefined;
    // private proxyArray: Array<ObservableProxy> = undefined;
    private nodeArray: Array<ObservableNode> = undefined;

    public get Path() {
        if(this.path === undefined)
            this.path = (this.parent ? this.parent.Path + "." : "") + this.key;
        
        return this.path;
    }

    public get Value() {
        if(this.value === undefined)
            this.value = this.tree.Get(this.Path);

        return this.value;
    }

    public get Type() {
        if(this.type === undefined)
            this.type = ObservableProxy.TypeOf(this.Value);

        return this.type;
    }

    public get Self() {
        var resolvedPath: string;
        if( 
            this.self === undefined         && 
            this.Type === Type.Value        &&
            this.valuePathResolver          && 
            typeof this.Value === 'string'  && 
            (resolvedPath = this.valuePathResolver(this.Value))
        )
            this.self = this.tree.GetNode(resolvedPath);
        else if(this.self === undefined)
            this.self = this;

        return this.self;
    }

    public get Proxy(): any {
        ObservableScope.Register(this.emitter);

        if(this.oldType !== undefined) {
            if(this.oldType !== this.Type)
                this.proxy = undefined;

            this.oldType = undefined;
        }

        if(this.proxy)
            return this.proxy;
        
        if(this.Self !== this)
            return this.Self.Proxy;

        if(this.Type === Type.Value)
            return this.Value;

        this.proxy = ObservableProxy.CreateFrom(this, this.Type);
        return this.proxy;
    }

    /* public get ProxyArray() {
        this.UpdateProxyArray(true);
        return this.proxyArray;
    } */
    public get NodeArray() {
        this.UpdateNodeArray(true);
        return this.nodeArray;
    }

    public get Parent() {
        return this.parent;
    }

    public get Children() {
        return this.children;
    }

    constructor(
        private tree: ObservableTree, 
        private key: string, 
        private parent: ObservableNode, 
        private valuePathResolver: { (value: string): string }
    ) { }

    public EnsureChild(key: string) {
        var child = this.children.get(key);
        if(!child) {
            child = new ObservableNode(this.tree, key, this, this.valuePathResolver);
            this.children.set(key, child);
        }

        return child;
    }

    public Update() {
        if(this.oldType === undefined)
            this.oldType = this.Type;

        this.path = undefined;
        this.value = undefined;
        this.type = undefined;
        this.self = undefined;

        /* if(oldType !== this.Type)
            this.proxy = undefined; */

        this.EmitSet();
        this.children.forEach(node => node.Update());

        // this.UpdateProxyArray();
        // this.UpdateNodeArray();
        // if(this.parent && this.parent.Type === Type.Array)
            // this.parent.UpdateNodeArrayIndex(parseInt(this.key), this);
            // this.parent.UpdateProxyArrayIndex(parseInt(this.key), this.Proxy);
    }

    public ArrayUpdate() {
        this.value = undefined;
        this.EnsureChild("length").Update();
        this.EmitSet();
    }

    public EmitSet() {
        this.emitter.Emit("set");
    }

    /* public UpdateProxyArrayIndex(index: number, value: ObservableProxy) {
        if(this.proxyArray)
            this.proxyArray[index] = value;
    } */

    /* public UpdateNodeArrayIndex(index: number, value: ObservableNode) {
        if(this.nodeArray)
            this.nodeArray[index] = value;
    } */

    public Destroy() {
        this.parent && this.parent.Children.delete(this.key);
        this.emitter.Clear();
        this.children.forEach(c => c.Destroy())
    }

    /* private UpdateProxyArray(force?: boolean) {
        if(this.Type === Type.Array && (this.proxyArray || force)) {
            var proxyArrayLength = this.proxyArray ? this.proxyArray.length : 0;
            var array = this.Value as Array<any>;
            this.proxyArray = this.proxyArray || new Array(array.length);
            if(array.length > proxyArrayLength) {
                for(var x=proxyArrayLength; x<array.length; x++)
                    this.proxyArray[x] = this.EnsureChild(x.toString()).Proxy;
            }
            else if(array.length < proxyArrayLength)
                this.proxyArray.splice(array.length);
        }
        else
            this.proxyArray = null;
    } */

    private UpdateNodeArray(force?: boolean) {
        if(this.Type === Type.Array && (this.nodeArray || force)) {
            var nodeArrayLength = this.nodeArray ? this.nodeArray.length : 0;
            var array = this.Value as Array<any>;
            this.nodeArray = this.nodeArray || new Array(array.length);
            if(array.length > nodeArrayLength) {
                for(var x=nodeArrayLength; x<array.length; x++)
                    this.nodeArray[x] = this.EnsureChild(x.toString());
            }
            else if(array.length < nodeArrayLength)
                this.nodeArray.splice(array.length);
        }
        else
            this.nodeArray = null;
    }

}