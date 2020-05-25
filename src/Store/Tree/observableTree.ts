import { ObservableNode } from "./observableNode";
import { Type } from "./observableProxy";
import { ObservableScope } from "./observableScope";

export class ObservableTree {

    private rootStateMap = new Map<string, any>();
    private rootNodeMap = new Map<string, ObservableNode>(); // update any to be tree node type

    constructor(private valuePathResolver?: { (value: string): string }) { }

    public Write(path: string, value: any): void {
        this.WritePath(path, value);
        this.UpdatePathNode(path);
    }

    public WriteAll(data: Array<{ path: string, value: any }>) {
        for(var x=0; x<data.length; x++)
            this.WritePath(data[x].path, data[x].value);

        for(var y=0; y<data.length; y++)
            this.UpdatePathNode(data[y].path);
    }

    public Get<O>(path?: string): O {
        return path.split(".").reduce((pre: any, curr: string, index) => {
            if(index === 0)
                return this.rootStateMap.get(curr);

            return pre && pre[curr];
        }, null);
    }

    public GetNode(path: string): ObservableNode {
        return path.split(".").reduce((pre: ObservableNode, curr: string, index) => {
            if(index === 0) {
                var ret = this.rootNodeMap.get(curr);
                if(!ret) {
                    ret = new ObservableNode(this, curr, null, this.valuePathResolver);
                    this.rootNodeMap.set(curr, ret);
                }

                return ret;
            }
                
            return pre.EnsureChild(curr);
        }, null);
    }

    public Delete(path: string) {
        var node = this.GetNode(path);
        node.Destroy();
    }

    public Destroy() {
        this.rootStateMap.clear();
        this.rootNodeMap.forEach(node => node.Destroy());
        this.rootNodeMap.clear();
    }

    public Scope<O, R>(path: string, func?: {(val: O): R}): ObservableScope<R> {
        return new ObservableScope(() => {
            var node = this.GetNode(path);
            return func && func(node.Proxy) || node.Proxy;
        });
    }

    private WritePath(path: string, value: any) {
        var pathParts = path.split(".");
        var rootPart = pathParts[0];
        if(pathParts.length === 1)
            this.rootStateMap.set(rootPart, value);
        else {
            var curValue = this.rootStateMap.get(rootPart);
            for(var x=1; x<pathParts.length - 1; x++) {
                if(!curValue)
                    throw new Error("Unable to write path: " + path + ". Falsey value found at: " + pathParts.slice(0, x).join("."));

                curValue = curValue[pathParts[x]];
            }

            if(!curValue)
                throw new Error("Unable to write path: " + path + ". Falsey value found at: " + pathParts.slice(0, x).join("."));

            curValue[pathParts[x]] = value;
        }
    }

    private UpdatePathNode(path: string) {
        var node = this.GetNode(path);
        node.Update();
            // node.EmitSet();

        if(node.Parent && node.Parent.Type === Type.Array)
            node.Parent.ArrayUpdate();
    }

}