import { ObservableNode } from "./observableNode";

export enum Type {
    Value,
    Object,
    Array
}


export interface ObservableProxy {
    ___storeProxy: boolean;
    ___type: Type;
    ___node: ObservableNode;
    toJSON(): any;
}

export namespace ObservableProxy {

    export function TypeOf(value: any): Type {
        if(!value)
            return Type.Value;

        if(Array.isArray(value))
            return Type.Array;
        else if(typeof value === 'object')
            return Type.Object;

        return Type.Value;
    }

    export function CreateFrom(node: ObservableNode, type: Type) {
        switch(type) {
            case Type.Array:
                return CreateArrayProxy(node);
            case Type.Object:
                return CreateObjectProxy(node);
            default:
                throw new Error("Can't create proxy from Value type");
        }
    }

    export function CopyValue<T>(value: T): T {
        var type = TypeOf(value);
        if(type === Type.Value)
            return value;
        
        if(typeof (value as any).toJSON === 'function')
            return (value as any).toJSON();

        if(type === Type.Array)
            return (value as any as Array<any>).map(v => CopyValue(v)) as any as T;
        else if(type === Type.Object) {
            var ret = {} as T;
            for(var key in value)
                ret[key] = CopyValue(value[key]);

            return ret;
        }

        return null;
    }

}

function CreateArrayProxy(node: ObservableNode) {
    return new Proxy([], {
        get: (obj: any, prop: any) => {
            switch(prop) {
                case '___type':
                    return Type.Array;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CopyNode(node);
                    };
                case 'length':
                    return node.EnsureChild(prop).Value;
                default:
                    if(typeof(prop) === 'symbol')
                        return node.ProxyArray[prop as any];
                    
                    if(!isNaN(parseInt(prop)))
                        return node.EnsureChild(prop).Proxy;

                    var func = obj[prop];
                    return func && func.bind(node.ProxyArray);
            }
        },
        ownKeys: () => {
            return Reflect.ownKeys(node.Value);
        }
    }) as ObservableProxy;
}

function CreateObjectProxy(node: ObservableNode) {
    return new Proxy({}, {
        get: (obj: any, prop: any) => {  
            switch(prop) {
                case '___type':
                    return Type.Object;
                case '___storeProxy':
                    return true;
                case '___node':
                    return node;
                case 'toJSON':
                    return () => {
                        return CopyNode(node);
                    };
                default:
                    if(typeof(prop) !== 'symbol')
                        return node.EnsureChild(prop).Proxy;
                    
                    return obj[prop];
            }
        },
        ownKeys: () => {
            return Reflect.ownKeys(node.Value);
        }
    });
}

function CopyNode(node: ObservableNode) {
    if(node.Type === Type.Value)
        return node.Value;
    
    var ret: any = null;
    if(node.Type === Type.Array)
        ret = (node.Value as Array<any>).map((v, i) => CopyNode(node.Self.EnsureChild(i.toString()).Self));
    else {
        ret = {};   
        for(var key in node.Value) {
            var child = node.Self.EnsureChild(key);
            ret[key] = CopyNode(child.Self);
        }
    }

    return ret;
}