import { ObservableTree } from "./observableTree";
import { Type, ObservableProxy } from "./observableProxy";
import { IObservableScope, ObservableScope } from "./observableScope";

export class ObservableNode {

    private destroyed = false;
    private children = new Map<string, ObservableNode>();

    private path: string = undefined;
    private scope: IObservableScope<{ value: any, type: Type, self: ObservableNode, proxy: ObservableProxy }> = ObservableScope.Create(() => {
        var value = this.tree.Get(this.Path);
        var type = ObservableProxy.TypeOf(value);
        var resolvedPath = this.valuePathResolver && type === Type.Value && typeof value === 'string' ? this.valuePathResolver(value) || this.Path : this.Path;
        var self = this.Path === resolvedPath ? this : this.tree.GetNode(resolvedPath);
        var proxy = this === self ? 
            type === Type.Value ? 
                value : 
                ObservableProxy.CreateFrom(this, type) : 
            self.Proxy;

        return {
            value: value,
            type: ObservableProxy.TypeOf(value),
            self: self,
            proxy: proxy
        }
    });

    private arrayScope: IObservableScope<any[]>;

    public get Key() {
        return this.key;
    }

    public get Path() {
        if(this.path === undefined)
            this.path = (this.parent ? this.parent.Path + "." : "") + this.key;
        
        return this.path;
    }

    public get Value() {
        return ObservableScope.Value(this.scope).value;
    }

    public get Type() {
        return ObservableScope.Value(this.scope).type;
    }

    public get Self() {
        return ObservableScope.Value(this.scope).self;
    }

    public get Proxy(): any {
        return ObservableScope.Value(this.scope).proxy;
    }

    public get ProxyArray() {
        if(this.Type !== Type.Array) {
            this.arrayScope && this.arrayScope.Destroy();
            this.arrayScope = null;
            return null;
        }

        this.arrayScope = this.arrayScope || ObservableScope.Create(() => 
            (this.Value as any[]).map((c, i) => this.EnsureChild(i.toString()).Proxy)
        );

        return ObservableScope.Value(this.arrayScope);
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

    public UpdateKey(newKey: string) {
        if(!this.parent)
            return;

        this.parent.children.delete(this.key);
        this.parent.children.set(newKey, this);
        this.key = newKey;
        this.path = undefined;
    }

    public EnsureChild(key: string) {
        var child = this.children.get(key);
        if(!child) {
            child = new ObservableNode(this.tree, key, this, this.valuePathResolver);
            this.children.set(key, child);
        }

        return child;
    }

    public Update() {
        this.children.clear();
        ObservableScope.Update(this.scope);
    }

    public ArrayUpdate() {
        ObservableScope.Update(this.arrayScope);
        
        var lengthNode = this.children.get('length');
        if(lengthNode)
            lengthNode.Update();
        
        ObservableScope.Emit(this.scope);
    }

    public Destroy() {
        this.destroyed = true;
        this.parent && !this.parent.destroyed && this.parent.Children.delete(this.key);
        this.children.forEach(c => c.Destroy());
        ObservableScope.Destroy(this.scope);
        ObservableScope.Destroy(this.arrayScope);
    }

    public Push(data: any) {
        var array = this.Value;
        if(!Array.isArray(array))
            throw new Error("Node value is not an array.");

        var ret = array.push(data);
        this.ArrayUpdate();
        return ret;
    }

    public Splice(start: number, deleteCount?: number, ...items: Array<any>) {
        deleteCount = deleteCount || 0;
        var array = this.Value;
        if(!Array.isArray(array))
            throw new Error("Node value is not an array.");

        var startLength = array.length;
        var ret = array.splice(start, deleteCount, ...items);
        var x = start;
        var key: string = null;
        var newKey: string = null;
        var child: ObservableNode = null;

        for(; x<(start + deleteCount); x++) {
            key = x.toString();
            child = this.Children.get(key);
            if(child)
                child.Destroy();
        }

        if(startLength < array.length)
            for(var y=startLength - 1; y >= x; y--) {
                key = y.toString();
                child = this.Children.get(key);
                if(child) {
                    newKey = (y - deleteCount + items.length).toString();
                    child.UpdateKey(newKey);
                }
            }
        else
            for(; x<startLength; x++) {
                key = x.toString();
                child = this.Children.get(key);
                if(child) {
                    newKey = (x - deleteCount + items.length).toString();
                    child.UpdateKey(newKey);
                }
            }

        this.ArrayUpdate();
        return ret;
    }

}