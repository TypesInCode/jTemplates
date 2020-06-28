import { Store as StoreSync } from "../Store/Store/store";
import { Component } from "../Node/component";
import { NodeRef } from "..";
import { StoreAsync } from "../Store";
import { ObservableScope } from "../Store/Tree/observableScope";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";

export function State(): any {
    return StateDecorator;
}

function StateDecorator<T extends Component<any, any, any> & Record<K, StoreSync<any>>, K extends string>(target: T, propertyKey: K) {

    const propKey = `StoreDecorator_${propertyKey}`;
    DestroyDecorator(target, propKey);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var map = (this as T).DecoratorMap;
            var store = map.get(propKey) as StoreSync<any>;
            return store ? store.Root.Value : null;
        },
        set: function (val: any) {
            var map = (this as T).DecoratorMap;
            var store = map.get(propKey) as StoreSync<any>;
            if(!store)
                map.set(propKey, new StoreSync(val));
            else
                store.Merge(val);
        }
    } as PropertyDescriptor;
}

export function Scope() {
    return ScopeDecorator;
}

function ScopeDecorator<T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    if(!(descriptor && descriptor.get))
        throw "Scope decorator requires a getter";

    if(descriptor && descriptor.set)
        throw "Scope decorator does not support setters";

    const propKey = `ScopeDecorator_${propertyKey}`;
    DestroyDecorator(target as T & Record<K, ObservableScope<any>>, propKey);
    return {
        configurable: false,
        enumerable: true,
        get: function() {
            var map = (this as T).DecoratorMap;
            var scope = map.get(propKey) as ObservableScope<any>;
            if(!scope) {
                const getter = descriptor.get.bind(this);
                scope = new ObservableScope(getter);
                map.set(propKey, scope);
            }

            return scope.Value;
        }
    } as PropertyDescriptor;
}

export function SharedScope() {
    return SharedScopeDecorator;
}

function SharedScopeDecorator<T extends Component<any, any, any> & Record<K, {(...args: Array<string | number>): {(): any}}>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        value: function(...args: Array<any>) {
            var argsKey = args.join();
            var map = (this as T).DecoratorMap;
            const funcKey = `SharedScopeDecorator_Func_${propertyKey}_${argsKey}`;
            if(!map.has(funcKey)) {
                var func = (descriptor.value as {(...args: Array<any>): {(): any}}).apply(this, args);
                map.set(funcKey, func);
                var scope = new ObservableScopeAsync(func);
                (this as T).Injector.Set(func, scope);

                const scopeKey = `SharedScopeDecorator_${propertyKey}_${argsKey}`;
                DestroyDecorator(target as T & Record<K, ObservableScope<any>>, scopeKey);
                map.set(scopeKey, scope);
            }

            return map.get(funcKey);
        }
    } as PropertyDescriptor;
}

export function Computed() {
    return ComputedDecorator as <T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) => any;
}

function ComputedDecorator<T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    if(!(descriptor && descriptor.get))
        throw "Computed decorator requires a getter";

    if(descriptor && descriptor.set)
        throw "Computed decorator does not support setters";

    const scopeKey = `ComputedDecorator_Scope_${propertyKey}`;
    const storeKey = `ComputedDecorator_Store_${propertyKey}`
    DestroyDecorator(target as T & Record<K, ObservableScope<any>>, scopeKey);
    DestroyDecorator(target as T & Record<K, StoreSync<any>>, storeKey);

    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var map = (this as T).DecoratorMap;
            var store = map.get(storeKey) as StoreSync<any>;
            if(!store) {
                const getter = descriptor.get.bind(this);
                const scope = new ObservableScope(getter);
                store = new StoreSync(scope.Value);
                scope.Watch(scope => {
                    if(!(this as T).Destroyed)
                        store.Write(scope.Value);
                });

                map.set(scopeKey, scope);
                map.set(storeKey, store);
            }

            return store.Root.Value;
        }
    } as PropertyDescriptor;
}


export function ComputedAsync() {
    return ComputedAsyncDecorator as <T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) => any;
}

function ComputedAsyncDecorator<T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    if(!(descriptor && descriptor.get))
        throw "ComputedAsync decorator requires a getter";

    if(descriptor && descriptor.set)
        throw "ComputedAsync decorator does not support setters";

    const scopeKey = `ComputedDecorator_Scope_${propertyKey}`;
    const storeKey = `ComputedDecorator_Store_${propertyKey}`;
    const storeScopeKey = `ComputedDecorator_StoreScope_${propertyKey}`;
    DestroyDecorator(target as T & Record<K, ObservableScope<any>>, scopeKey);
    DestroyDecorator(target as T & Record<K, StoreSync<any>>, storeKey);
    DestroyDecorator(target as T & Record<K, StoreSync<any>>, storeScopeKey);

    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var map = (this as T).DecoratorMap;
            var storeScope = map.get(storeScopeKey) as ObservableScope<any>;
            if(!storeScope) {
                const getter = descriptor.get.bind(this);
                const scope = new ObservableScope(() => {
                    var value = getter();
                    if(value && typeof value.toJSON === 'function')
                        value = value.toJSON();

                    return value;
                });
                const store = new StoreAsync((val: any) => val._id, { _id: "ROOT", data: scope.Value })
                scope.Watch(scope => {
                    if(!(this as T).Destroyed)                        
                        store.Write({ _id: "ROOT", data: scope.Value });
                });
                storeScope = store.Scope("ROOT", (val: { _id: string, data: any }) => val.data);

                map.set(storeScopeKey, storeScope);
                map.set(scopeKey, scope);
                map.set(storeKey, store);
            }

            return storeScope.Value;
        }
    } as PropertyDescriptor;
}

export function Inject<I>(type: { new (): I }) {
    return InjectorDecorator.bind(null, type) as <F extends I, T extends Component<any, any, any> & Record<K, F>, K extends string>(target: T, propertyKey: K, descriptor?: PropertyDescriptor) => any;
}

function InjectorDecorator<I, F extends I, T extends Component<any, any, any> & Record<K, F>, K extends string>(type: { new (): I }, target: T, propertyKey: K, descriptor?: PropertyDescriptor): any {

    return {
        configurable: false,
        enumerable: true,
        get: function() {
            return (this as T).Injector.Get(type);
        },
        set: function(val: any) {
            (this as T).Injector.Set(type, val);
        }
    }
}

export function Destroy() {
    return DestroyDecorator;
}

export namespace Destroy {
    function Get(value: any): Array<string> {
        return value && value.DestroyDecorator_Destroys || [];
    }

    export function All(value: Component<any, any, any>) {
        var arr = Get(value);
        arr.map(prop => ((value as any)[prop] || value.DecoratorMap.get(prop)) as { Destroy: {(): void} })
            .filter(o => !!o)
            .forEach(o => o.Destroy());
    }
}

function DestroyDecorator<T extends Component<any, any, any> & Record<K, { Destroy: {(): void} }>, K extends string>(target: T, propertyKey: K): any {
    var proto = target as any;
    proto.DestroyDecorator_Destroys = proto.DestroyDecorator_Destroys || [];
    proto.DestroyDecorator_Destroys.push(propertyKey);
}

export function PreReqTemplate(template: {(): NodeRef | NodeRef[]}) {
    return PreReqTemplateDecorator.bind(null, template) as <T extends Component<any, any, any>>(target: { new(...args: Array<any>): T }) => any;
}

export namespace PreReqTemplate {
    export function Get(value: any): NodeRef[] {
        var func = value && value.PreReqTemplateDecorator_Template;
        var ret: NodeRef[] = func ? func() : [];
        if(!Array.isArray(ret))
            ret = [ret];

        return ret;
    }
}

function PreReqTemplateDecorator<T extends Component<any, any, any>>(template: {(): NodeRef | NodeRef[]}, target: { new(...args: Array<any>): T }) {
    var proto = target.prototype as any;
    proto.PreReqTemplateDecorator_Template = template;
}

export function PreReq() {
    return PreReqDecorator;
}

export namespace PreReq {
    function Get(value: any): Array<string> {
        return value && value.PreReqDecorator_PreReqs || [];
    }

    export function All(value: any) {
        var arr = Get(value).map((prop: string) => (value[prop] && value[prop].Init) as Promise<void> || Promise.resolve());
        return Promise.all(arr);
    }

    export function Has(value: any) {
        return Get(value).length > 0;
    }
}

function PreReqDecorator<T extends Record<K, { Init: Promise<void> }>, K extends string>(target: T, propertyKey: K): any {
    var proto = target as any;
    proto.PreReqDecorator_PreReqs = proto.PreReqDecorator_PreReqs || [];
    proto.PreReqDecorator_PreReqs.push(propertyKey);
}

