import { StoreSync } from "../Store/storeSync";
import { Store as StoreClass } from "../Store/store/store";
import { Scope as ScopeClass } from "../Store/scope/scope";
import { Component } from "../Node/component";
import { NodeRef } from "..";
import { StoreAsync } from "../Store";
import { NodeConfig } from "../Node/nodeConfig";

export function Store(): any {
    return StoreDecorator;
}

function StoreDecorator<T extends Component<any, any, any> & Record<K, StoreClass<any>>, K extends string>(target: T, propertyKey: K) {

    DestroyDecorator(target, `StoreDecorator_${propertyKey}`);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = this[`StoreDecorator_${propertyKey}`];
            return store ? store.Root.Value : null;
        },
        set: function (val: any) {
            var store = this[`StoreDecorator_${propertyKey}`];
            if(!store)
                this[`StoreDecorator_${propertyKey}`] = new StoreSync(val);
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

    DestroyDecorator(target as T & Record<K, ScopeClass<any>>, `ScopeDecorator_${propertyKey}`);
    return {
        configurable: false,
        enumerable: true,
        get: function() {
            var scope = this[`ScopeDecorator_${propertyKey}`];
            if(!scope)
                scope = this[`ScopeDecorator_${propertyKey}`] = new ScopeClass(descriptor.get.bind(this));

            return scope.Value;
        }
    } as PropertyDescriptor;
}

export function Computed() {
    return ComputedDecorator.bind(null, StoreSync) as <T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) => any;
}

export function ComputedAsync() {
    return ComputedDecorator.bind(null, StoreAsync) as <T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor) => any;
}

function ComputedDecorator<T extends Component<any, any, any>, K extends string>(storeConstructor: { new(init: any): StoreClass<any> }, target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    if(!(descriptor && descriptor.get))
        throw "Computed decorator requires a getter";

    if(descriptor && descriptor.set)
        throw "Computed decorator does not support setters";

    DestroyDecorator(target as T & Record<K, ScopeClass<any>>, `ComputedDecorator_Scope_${propertyKey}`);
    DestroyDecorator(target as T & Record<K, StoreSync<any>>, `ComputedDecorator_Store_${propertyKey}`);

    var updateScheduled = false;
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = this[`ComputedDecorator_Store_${propertyKey}`] as StoreSync<any>;
            if(!store) {
                var scope = this[`ComputedDecorator_Scope_${propertyKey}`] = new ScopeClass(descriptor.get.bind(this));
                store = this[`ComputedDecorator_Store_${propertyKey}`] = new storeConstructor(scope.Value);
                scope.Watch(scope => {
                    if(updateScheduled)
                        return;

                    updateScheduled = true;
                    NodeConfig.scheduleUpdate(() => {
                        updateScheduled = false;
                        if(!(this as Component).Destroyed)
                            store.Update(scope.Value);
                    });
                });
            }

            return store.Root.Value;
        }
    } as PropertyDescriptor;
}

export function Inject<I>(type: { new (): I }) {
    return InjectorDecorator.bind(null, type) as <F extends I, T extends Component<any, any, any> & Record<K, F>, K extends string>(target: T, propertyKey: K, descriptor?: PropertyDescriptor) => any;
}

function InjectorDecorator<I, F extends I, T extends Component<any, any, any> & Record<K, F>, K extends string>(type: { new (): I }, target: T, propertyKey: K, descriptor?: PropertyDescriptor): any {
    var parentGet = descriptor && descriptor.get;
    var parentSet = descriptor && descriptor.set;

    return {
        configurable: false,
        enumerable: true,
        get: function() {
            parentGet && parentGet.apply(this);
            return (this as Component).Injector.Get(type);
        },
        set: function(val: any) {
            parentSet && parentSet.apply(this, [val]);
            (this as Component).Injector.Set(type, val);
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

    export function All(value: any) {
        var arr = Get(value);
        arr.map(prop => value[prop] as { Destroy: {(): void} })
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

