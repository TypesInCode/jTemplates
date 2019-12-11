import { StoreSync } from "../Store/storeSync";
import { StoreBase as StoreClass, StoreBase } from "../Store/store/storeBase";
import { Scope as ScopeClass } from "../Store/scope/scope";
import { Component } from "../Node/component";
import { ScopeBase } from "../Store/scope/scopeBase";
import { NodeRef } from "..";

export function Store(): any {
    return StoreDecorator;
}

function StoreDecorator<T extends Component<any, any, any> & Record<K, StoreBase<any>>, K extends string>(target: T, propertyKey: K) {

    DestroyDecorator(target, `StoreDecorator_${propertyKey}`);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = this[`StoreDecorator_${propertyKey}`]; // destroyDescriptor.get.apply(this) as StoreClass<any>;
            return store ? store.Root.Value : null;
        },
        set: function (val: any) {
            // var store = this[`StoreDecorator_${propertyKey}`] as StoreClass<any>;
            // var store = destroyDescriptor.get.apply(this) as StoreClass<any>;
            var store = this[`StoreDecorator_${propertyKey}`];
            if(!store)
                this[`StoreDecorator_${propertyKey}`] = new StoreSync(val);
                //destroyDescriptor.set.apply(this, [new StoreSync(val)]);
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

    DestroyDecorator(target as T & Record<K, ScopeBase<any>>, `ScopeDecorator_${propertyKey}`);
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

function DestroyDecorator<T extends Component<any, any, any> & Record<K, { Destroy: {(): void} }>, K extends string>(target: T, propertyKey: K): any { //, descriptor?: PropertyDescriptor): any {
    var proto = target as any;
    proto.DestroyDecorator_Destroys = proto.DestroyDecorator_Destroys || [];
    proto.DestroyDecorator_Destroys.push(propertyKey);
    /* var parentGet = descriptor && descriptor.get;
    var parentSet = descriptor && descriptor.set;

    return {
        configurable: false,
        enumerable: true,
        get: function() {
            return parentGet && parentGet.apply(this) || this[`DestroyDecorator_${propertyKey}`];
        },
        set: function(val: { Destroy: { (): void } }) {
            var thisObj = this as { Destroyables: Set<{ Destroy: {(): void} }> };
            parentSet && parentSet.apply(thisObj, [val]);
            var loc = this[`DestroyDecorator_${propertyKey}`];
            if(loc === val)
                return;
            
            if(loc && thisObj.Destroyables.has(loc)) {
                thisObj.Destroyables.delete(loc);
                loc.Destroy();
            }

            this[`DestroyDecorator_${propertyKey}`] = val;
            val && thisObj.Destroyables.add(val);
        }
    } as PropertyDescriptor; */
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

