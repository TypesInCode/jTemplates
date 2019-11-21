import { StoreSync } from "../Store/storeSync";
import { Store as StoreClass } from "../Store/store/store";
import { Scope as ScopeClass } from "../Store/scope/scope";
import { Component } from "../Node/component";
import { Injector as InjectorClass } from "./injector";

export function Store(): any {
    return function (target: { Destroyables: Array<{ Destroy: {(): void} }> }, propertyKey: string, descriptor: PropertyDescriptor) {
        return {
            configurable: false,
            enumerable: true,
            get: function () {
                var store = this[`_${propertyKey}`] as StoreClass<any>;
                if(store)
                    return store.Root.Value;

                return null;
            },
            set: function (val: any) {
                var store = this[`_${propertyKey}`] as StoreClass<any>;
                if(!store) {
                    store = this[`_${propertyKey}`] = new StoreSync(val);
                    this.Destroyables.push(store);
                }
                else
                    store.Merge(val);
            }
        } as PropertyDescriptor;
    }
}

export function Scope() {
    return function (target: { Destroyables: Array<{ Destroy: {(): void} }> }, propertyKey: string, descriptor: PropertyDescriptor) {
        return {
            configurable: false,
            enumerable: false,
            get: function() {
                var scope = this[`_${propertyKey}`];
                if(!scope) {
                    scope = this[`_${propertyKey}`] = new ScopeClass(descriptor.get.bind(this));
                    this.Destroyables.push(scope);
                }

                return scope.Value;
            }
        } as PropertyDescriptor;
    }
}

export function Inject<T>(type: { new (): T }) {
    return function (target: { Injector: InjectorClass }, propertyKey: string): any {
        return {
            configurable: false,
            enumerable: true,
            get: function() {
                return (this as Component).Injector.Get(type);
            },
            set: function(val: any) {
                (this as Component).Injector.Set(type, val);
            }
        }
    }
}

