import { TreeNode } from "./treeNode";

export enum IProxyType {
    Value,
    Object,
    Array
}

export interface IProxy {
    ___type: IProxyType;
    ___storeProxy: boolean;
    ___node: TreeNode;
    toJSON(): any;
}

export namespace IProxy {

    export function Type(proxy: IProxy) {
        return proxy && proxy.___type || IProxyType.Value;
    }

    export function ValueType(value: any): IProxyType {
        if(!value)
            return IProxyType.Value;

        if(Array.isArray(value))
            return IProxyType.Array;
        else if(typeof value === 'object')
            return IProxyType.Object;

        return IProxyType.Value;
    }

    export function Create(node: TreeNode, type: IProxyType): any {
        var ret = null;
    
        switch(type) {
            case IProxyType.Array:
                ret = CreateArrayProxy(node);
                break;
            case IProxyType.Object:
                ret = CreateObjectProxy(node);
                break;
            default:
                throw "Can't create IProxy from Value type";
        }
    
        return ret;
    }
}

function CreateArrayProxy(node: TreeNode) {
    return new Proxy([], {
        get: (obj: any, prop: any) => {
            switch(prop) {
                case '___type':
                    return IProxyType.Array;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CreateNodeCopy(node.Self);
                    };
                case 'length':
                    return node.Self.EnsureChild(prop).StoreValue;
                default:
                    if(typeof(prop) !== 'symbol' && !isNaN(parseInt(prop)))
                        return node.Self.EnsureChild(prop).Proxy;
                    
                    var ret = obj[prop];
                    if(typeof ret === 'function') {
                        return ret.bind(node.ProxyArray);
                    }
        
                    return ret;
            }
        }
    }) as IProxy;
}

function CreateObjectProxy(node: TreeNode) {
    return new Proxy({}, {
        get: (obj: any, prop: any) => {  
            switch(prop) {
                case '___type':
                    return IProxyType.Object;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CreateNodeCopy(node.Self);
                    };
                default:
                    if(typeof(prop) !== 'symbol')
                        return node.Self.EnsureChild(prop).Proxy;
                    
                    return obj[prop];
            }
        }
    });
}

function CreateNodeCopy(node: TreeNode) {
    var value = node.Value;
    if(IProxy.ValueType(value) === IProxyType.Value)
        return value;
    
    var ret: any = null;
    if(Array.isArray(value))
        ret = value.map((v, i) => CreateNodeCopy(node.Self.EnsureChild(i.toString()).Self));
    else {
        ret = {};   
        for(var key in value) {
            var child = node.Self.EnsureChild(key);
            ret[key] = CreateNodeCopy(child.Self);
        }
    }

    return ret;
}