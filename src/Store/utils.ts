import { TreeNode } from "./tree/treeNode";
import { StoreReader } from "./store/storeReader";

export function IsValue(value: any) {
    if(!value)
        return true;
    
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
}

export function CreateProxy(node: TreeNode, reader: StoreReader<any>): any { //, manager: StoreManager<any>): any {
    // var value = node && node.Value;
    reader && reader.Register(node.Emitter);
    var self = node.Self;
    if(node !== self)
        reader && reader.Register(node.Self.Emitter);

    var value = self.Value;
    if(IsValue(value))
        return value;

    return CreateProxyObject(node, reader, value);
}

function CreateProxyObject(node: TreeNode, reader: StoreReader<any>, value: any): any { //, manager: StoreManager<any>): any {    
    var ret = null;

    if(Array.isArray(value)) {
        ret = new Proxy([], {
            get: (obj: any, prop: any) => {
                if(node.Destroyed)
                    return undefined;
                
                if(prop === '___storeProxy')
                    return true;

                if(prop === "___node")
                    return node;

                if(prop === 'toJSON')
                    return () => {
                        return CreateNodeCopy(node.Self);
                        // return node.Self.Value;
                    };
                
                var isInt = typeof(prop) !== 'symbol' && !isNaN(parseInt(prop));
                if(isInt || prop === 'length') {
                    var childNode = node.Self.EnsureChild(prop);
                    if(!childNode)
                        return null;

                    /* if(isInt)
                        reader.Register(childNode.Emitter); */
                    
                    if(isInt || prop === 'length')
                        return CreateProxy(childNode, reader); //, manager);
                }
                
                var ret = obj[prop];
                if(typeof ret === 'function') {
                    var cachedArray = CreateProxyArray(node.Self, reader); //, manager);
                    return ret.bind(cachedArray);
                }

                return ret;
            }/* ,
            set: (obj: any, prop: any, value: any) => {
                var isInt = !isNaN(parseInt(prop));
                var childPath = [node.Self.Path, prop].join(".");
                if(isInt) {
                    manager.WritePath(childPath, value);
                }
                else {
                    // obj[prop] = value;
                    throw "Modifying non-integer array properties is not supported";
                }

                return true;
            } */
        });
    }
    else {
        ret = new Proxy({}, {
            get: (obj: any, prop: any) => {
                if(node.Destroyed)
                    return undefined;
                
                if(prop === '___storeProxy')
                    return true;

                if(prop === '___node')
                    return node;

                if(prop === 'toJSON')
                    return () => {
                        var copy = CreateNodeCopy(node.Self);
                        for(var key in obj)
                            copy[key] = obj[key];

                        return copy;
                        // return node.Self.Value;
                    };

                if(typeof prop !== 'symbol') {
                    if(typeof obj[prop] !== 'undefined')
                        return obj[prop];
                    
                    var childNode = node.Self.EnsureChild(prop);
                    if(!childNode) 
                        return null;

                    // reader.Register(childNode.Emitter);
                    return CreateProxy(childNode, reader); //, manager);
                }

                return obj[prop];
            },
            set: (obj: any, prop: any, value: any) => {
                // var childPath = [node.Self.Path, prop].join(".");
                // manager.WritePath(childPath, value);
                obj[prop] = value;
                return true;
            }
        });
    }

    return ret;
}

export function CreateProxyArray(node: TreeNode, reader: StoreReader<any>) { //, manager: StoreManager<any>) {
    if(node.NodeCache)
        return node.NodeCache;

    var localArray = node.Value;
    var proxyArray = new Array(localArray.length);
    for(var x=0; x<proxyArray.length; x++) {
        var childNode = node.EnsureChild(x.toString());
        proxyArray[x] = CreateProxy(childNode, reader); //, manager);
    }

    node.NodeCache = proxyArray;
    return proxyArray;
}

function CreateNodeCopy(node: TreeNode) {
    var value = node.Value;
    if(IsValue(value))
        return value;
    
    var ret: any = null;
    if(Array.isArray(value))
        ret = [];
    else
        ret = {};
    
    for(var key in value) {
        var child = node.Self.EnsureChild(key);
        ret[key] = CreateNodeCopy(child);
    }

    return ret;
}

export function CreateCopy<O>(source: O): O {
    if(IsValue(source))
        return source;

    var ret = null;
    if(Array.isArray(source)) {
        ret = new Array(source.length);
        for(var x=0; x<source.length; x++)
            ret[x] = this.CreateCopy(source[x]);

        return ret as any as O;
    }
    else {
        ret = {} as { [key: string]: any };
        for(var key in source)
            ret[key] = this.CreateCopy(source[key]);
    }

    return ret as any as O;
}