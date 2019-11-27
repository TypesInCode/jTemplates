import { StoreSync } from "../Store/storeSync";
import { StoreBase as StoreClass } from "../Store/store/storeBase";
import { Scope as ScopeClass } from "../Store/scope/scope";
import { Component } from "../Node/component";
import { Injector as InjectorClass } from "./injector";

export function Store(): any {
    return StoreDecorator;
}

function StoreDecorator (target: { Destroyables: Set<{ Destroy: {(): void} }> }, propertyKey: string) {

    var destroyDescriptor = DestroyDecorator(target, propertyKey, null);
    return {
        configurable: false,
        enumerable: true,
        get: function () {
            var store = destroyDescriptor.get.apply(this) as StoreClass<any>;
            if(store)
                return store.Root.Value;

            return null;
        },
        set: function (val: any) {
            // var store = this[`StoreDecorator_${propertyKey}`] as StoreClass<any>;
            var store = destroyDescriptor.get.apply(this) as StoreClass<any>;
            if(!store)
                destroyDescriptor.set.apply(this, [new StoreSync(val)]);
            else
                store.Merge(val);
        }
    } as PropertyDescriptor;
}

export function Scope() {
    return ScopeDecorator;
}

function ScopeDecorator (target: { Destroyables: Set<{ Destroy: {(): void} }> }, propertyKey: string, descriptor: PropertyDescriptor) {
    if(!(descriptor && descriptor.get))
        throw "Scope decorator requires a getter";

    var destroyDescriptor = DestroyDecorator(target, propertyKey, null);
    return {
        configurable: false,
        enumerable: true,
        get: function() {            
            var scope = destroyDescriptor.get.apply(this);
            if(!scope) {
                destroyDescriptor.set.apply(this, [new ScopeClass(descriptor.get.bind(this))]);
                scope = destroyDescriptor.get.apply(this);
            }

            return scope.Value;
        },
        set: function () {
            throw "Scope decorator: setter not supported";
        }
    } as PropertyDescriptor;
}

export function Inject<T>(type: { new (): T }) {
    return InjectorDecorator.bind(null, type);
}

function InjectorDecorator<T>(type: { new (): T }, target: { Injector: InjectorClass }, propertyKey: string, descriptor?: PropertyDescriptor): any {
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

function DestroyDecorator (target: { Destroyables: Set<{ Destroy: {(): void} }> }, propertyKey: string, descriptor?: PropertyDescriptor): any {
    var parentGet = descriptor && descriptor.get;
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
            if(thisObj.Destroyables.has(loc))
                thisObj.Destroyables.delete(loc);

            if(loc && loc !== val)
                loc.Destroy();

            this[`DestroyDecorator_${propertyKey}`] = val;
            val && thisObj.Destroyables.add(val);
        }
    } as PropertyDescriptor;
}

