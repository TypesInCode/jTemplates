import { ObservableTree } from "./observableTree";
import { Emitter } from "../../Utils/emitter";
import { Type, ObservableProxy } from "./observableProxy";
import { ObservableScope } from "./observableScope";

export class ObservableNode {

    private children = new Map<string, ObservableNode>();
    private emitter = Emitter.Create();

    // Cached values
    private path: string = undefined;
    private value: any = undefined;
    private type: Type = undefined;
    private oldType: Type = undefined;
    private self: ObservableNode = undefined;
    private proxy: ObservableProxy = undefined;
    private proxyArray: Array<any> = undefined;

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
        return this.ProxyInternal;
    }

    public get ProxyArray() {
        if(this.Type !== Type.Array)
            return null;

        if(!this.proxyArray)
            this.proxyArray = (this.Value as Array<any>).map((c, i) => this.EnsureChild(i.toString()).ProxyInternal);

        return this.proxyArray;
    }

    public get Parent() {
        return this.parent;
    }

    public get Children() {
        return this.children;
    }

    private get ProxyInternal(): any {
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
        this.proxyArray = undefined;

        this.children.forEach(node => node.Update());
        this.EmitSet();
    }

    public ArrayUpdate() {
        this.value = undefined;
        this.proxyArray = undefined;
        this.EnsureChild("length").Update();
        this.EmitSet();
    }

    public EmitSet() {
        Emitter.Emit(this.emitter, "set");
    }

    public Destroy() {
        this.parent && this.parent.Children.delete(this.key);
        this.emitter.clear();
        this.children.forEach(c => c.Destroy())
    }

}