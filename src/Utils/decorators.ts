/**
 * This module provides decorators for managing state, computed values, and dependency injection in components.
 * These decorators are designed to work with observable data structures, allowing for efficient updates and notifications.
 * 
 * @module Utils/Decorators
 * @see ObservableScope
 * @see ObservableNode
 * @see StoreAsync
 * @see StoreSync
 * @see Component
 */

// import { Component } from "../Node/component";
import {
  ObservableScope,
  IObservableScope,
} from "../Store/Tree/observableScope";
import { IDestroyable } from "./utils.types";
// import { ElementNodeRefTypes } from "../Node/nodeRef.types";
import { ObservableNode } from "../Store/Tree/observableNode";
import { StoreAsync, StoreSync } from "../Store";
import { Component } from "../Node/component";

/**
 * WeakMap for storing node instances and their associated properties.
 * @private
 */
const nodeInstanceMap = new WeakMap<
  WeakKey,
  { [prop: string]: { root: unknown | undefined } }
>();

/**
 * WeakMap for storing scope instances and their associated properties.
 * @private
 */
const scopeInstanceMap = new WeakMap<
  WeakKey,
  { [prop: string]: [IObservableScope<unknown>, unknown] }
>();

/**
 * WeakMap for storing arrays of properties that need to be destroyed for each prototype.
 * @private
 */
const destroyPrototypeMap = new WeakMap<WeakKey, string[]>();

/**
 * Retrieves the node map for a given instance.
 * If the map does not exist, it creates a new one and associates it with the instance.
 * @private
 * @param instance The instance for which to retrieve the node map.
 * @returns The node map associated with the instance.
 */
function GetNodeMapForInstance(instance: WeakKey) {
  const map = nodeInstanceMap.get(instance) ?? {};
  nodeInstanceMap.set(instance, map);

  return map;
}

/**
 * Retrieves the scope map for a given instance.
 * If the map does not exist, it creates a new one and associates it with the instance.
 * @private
 * @param instance The instance for which to retrieve the scope map.
 * @returns The scope map associated with the instance.
 */
function GetScopeMapForInstance(instance: WeakKey) {
  const map = scopeInstanceMap.get(instance) ?? {};
  scopeInstanceMap.set(instance, map);

  return map;
}

/**
 * Retrieves the destroy array for a given prototype.
 * If the array does not exist, it creates a new one and associates it with the prototype.
 * @private
 * @param prototype The prototype for which to retrieve the destroy array.
 * @returns The array of properties to be destroyed for the prototype.
 */
function GetDestroyArrayForPrototype(prototype: WeakKey) {
  const array = destroyPrototypeMap.get(prototype) ?? [];
  destroyPrototypeMap.set(prototype, array);

  return array;
}


/**
 * Computed decorator factory for creating synchronous computed properties.
 * A computed property is derived from other properties and automatically updates when its dependencies change.
 * 
 * @example
 * class MyComponent extends Component {
 *   @Computed({ count: 0 })
 *   get myComputed(): { count: number } {
 *     return { count: this.myStateValue };
 *   }
 * }
 * 
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 * @remarks The computed value is backed by a StoreSync instance, which caches the latest result of the getter. When any of the getter's dependencies change, the StoreSync is updated and the computed property reflects the new value synchronously. The provided `defaultValue` is returned until the first evaluation completes.
 */
export function Computed<T extends WeakKey, K extends keyof T, V extends T[K]>(
  defaultValue: V,
) {
  return function (target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return ComputedDecorator(target, propertyKey, descriptor, defaultValue);
  };
}

/**
 * Computed decorator implementation for creating synchronous computed properties.
 * @private
 * @param target The target object.
 * @param prop The property key.
 * @param descriptor The property descriptor.
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property descriptor that replaces the original descriptor with a computed implementation.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 */
function ComputedDecorator<
  T extends WeakKey,
  K extends keyof T,
  D extends T[K],
>(target: T, prop: K, descriptor: PropertyDescriptor, defaultValue: D) {
  const propertyKey = prop as string;
  if (!(descriptor && descriptor.get))
    throw "Computed decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Computed decorator does not support setters";

  const getter = descriptor.get;

  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const scopeMap = GetScopeMapForInstance(this);
      if (scopeMap[propertyKey] === undefined) {
        const getterScope = ObservableScope.Create(async () =>
          getter.call(this),
        );
        const syncStore = new StoreSync();

        ObservableScope.Watch(getterScope, (scope) => {
          const data = ObservableScope.Value(scope);
          syncStore.Write(data, "root");
        });
        ObservableScope.Init(getterScope);

        const propertyScope = ObservableScope.Create(() =>
          syncStore.Get("root", defaultValue),
        );
        ObservableScope.OnDestroyed(propertyScope, function () {
          ObservableScope.Destroy(getterScope);
        });

        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    },
  } as PropertyDescriptor;
}

/**
 * ComputedAsync decorator factory for creating asynchronous computed properties.
 * A computed property is derived from other properties and automatically updates when its dependencies change.
 * 
 * @example
 * class MyComponent extends Component {
 *   @ComputedAsync({ items: [] })
 *   get myAsyncComputed(): { items: any[] } {
 *     return { items: this.myStateValue };
 *   }
 * }
 * 
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 * @remarks The computed value is backed by a StoreAsync instance, which caches the result of the asynchronous getter. When dependencies change, the StoreAsync updates and the computed property resolves to the latest value. The provided `defaultValue` is returned until the async computation completes.
 */
export function ComputedAsync<
  T extends WeakKey,
  K extends keyof T,
  V extends T[K],
>(defaultValue: V) {
  return function (target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return ComputedAsyncDecorator(
      target,
      propertyKey,
      descriptor,
      defaultValue,
    );
  };
}

/**
 * ComputedAsync decorator implementation for creating asynchronous computed properties.
 * @private
 * @param target The target object.
 * @param prop The property key.
 * @param descriptor The property descriptor.
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property descriptor that replaces the original descriptor with a computed implementation.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 */
function ComputedAsyncDecorator<
  T extends WeakKey,
  K extends keyof T,
  D extends T[K],
>(target: T, prop: K, descriptor: PropertyDescriptor, defaultValue: D) {
  const propertyKey = prop as string;
  if (!(descriptor && descriptor.get))
    throw "Computed decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Computed decorator does not support setters";

  const getter = descriptor.get;

  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const scopeMap = GetScopeMapForInstance(this);
      if (scopeMap[propertyKey] === undefined) {
        const getterScope = ObservableScope.Create(() => getter.call(this));
        const asyncStore = new StoreAsync();

        ObservableScope.Watch(getterScope, (scope) => {
          asyncStore.Write(ObservableScope.Value(scope), "root");
        });
        ObservableScope.Init(getterScope);

        const propertyScope = ObservableScope.Create(() =>
          asyncStore.Get("root", defaultValue),
        );
        ObservableScope.OnDestroyed(propertyScope, function () {
          ObservableScope.Destroy(getterScope);
          asyncStore.Destroy();
        });

        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    },
  } as PropertyDescriptor;
}

/**
 * State decorator factory for creating state properties.
 * A state property is a reactive value that can be read and written synchronously.
 * 
 * @example
 * class MyComponent extends Component {
 *   @State()
 *   myState: { count: number } = { count: 0 };
 * }
 * 
 * @returns A property decorator that can be applied to a property.
 * @remarks The State decorator creates an ObservableNode to store the value. Updates to the property automatically notify any watchers of dependent scopes, making it ideal for mutable complex data structures that need to trigger reactivity.
 */
export function State(): any {
  return StateDecorator;
}

/**
 * State decorator implementation for creating state properties.
 * @private
 * @param target The target object.
 * @param propertyKey The property key.
 * @returns A property descriptor that replaces the original descriptor with a state implementation.
 */
function StateDecorator<T extends WeakKey, K extends string>(
  target: T,
  propertyKey: K,
) {
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const map = GetNodeMapForInstance(this);
      map[propertyKey] ??= ObservableNode.Create({ root: undefined });
      return map[propertyKey].root;
    },
    set: function (this: T, val: any) {
      const map = GetNodeMapForInstance(this);
      if (map[propertyKey] === undefined)
        map[propertyKey] ??= ObservableNode.Create({ root: val });
      else map[propertyKey].root = val;
    },
  } as PropertyDescriptor;
}

/**
 * Value decorator factory for creating value properties.
 * A value property is a reactive value that can be read and written synchronously.
 * 
 * @example
 * class MyComponent extends Component {
 *   @Value()
 *   myValue: string = "Hello";
 * }
 * 
 * @returns A property decorator that can be applied to a property.
 * @remarks The Value decorator lazily creates a scoped ObservableScope whose getter returns the stored value. The setter updates the stored value and invokes ObservableScope.Update on the scope, causing any dependent computed or scope decorators to re-evaluate.
 */
export function Value(): any {
  return ValueDecorator;
}

/**
 * Creates a value scope for a given tuple.
 * @private
 * @param tuple The tuple containing the scope and value.
 * @returns An observable scope created from the tuple's value.
 */
function CreateValueScope(tuple: [unknown, any]) {
  return ObservableScope.Create(function () {
    return tuple[1];
  });
}

/**
 * Value decorator implementation for creating value properties.
 * @private
 * @param target The target object.
 * @param propertyKey The property key.
 * @returns A property descriptor that replaces the original descriptor with a value implementation.
 */
function ValueDecorator<T extends WeakKey, K extends string>(
  target: T,
  propertyKey: K,
) {
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const propertyMap = GetScopeMapForInstance(this);
      const tuple: (typeof propertyMap)[typeof propertyKey] = (propertyMap[
        propertyKey
      ] ??= [null, undefined]);
      tuple[0] ??= CreateValueScope(tuple);

      return ObservableScope.Value(tuple[0]);
    },
    set: function (this: T, val: any) {
      const propertyMap = GetScopeMapForInstance(this);
      propertyMap[propertyKey] ??= [null, undefined];
      const tuple = propertyMap[propertyKey];
      tuple[1] = val;
      ObservableScope.Update(tuple[0]);
    },
  };
}

/**
 * Scope decorator factory for creating scope properties.
 * A scope property is a reactive value that can be read and written synchronously.
 * 
 * @example
 * class MyComponent extends Component {
 *   @Scope()
 *   get myScopeValue(): string {
 *     return this.myStateValue + "!";
 *   }
 * }
 * 
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 */
export function Scope() {
  return ScopeDecorator;
}

/**
 * Scope decorator implementation for creating scope properties.
 * @private
 * @param target The target object.
 * @param propertyKey The property key.
 * @param descriptor The property descriptor.
 * @returns A property descriptor that replaces the original descriptor with a scope implementation.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 */
function ScopeDecorator<T, K extends string>(
  target: T,
  propertyKey: K,
  descriptor: PropertyDescriptor,
) {
  if (!(descriptor && descriptor.get))
    throw "Scope decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Scope decorator does not support setters";

  const getter = descriptor.get;

  return {
    configurable: false,
    enumerable: true,
    get: function () {
      const propertyMap = GetScopeMapForInstance(this);
      propertyMap[propertyKey] ??= [null, undefined];
      const tuple = propertyMap[propertyKey];
      if (tuple[0] === null)
        tuple[0] = ObservableScope.Create(getter.bind(this));

      return ObservableScope.Value(tuple[0]);
    },
  } as PropertyDescriptor;
}


/**
 * Inject decorator factory for creating dependency-injected properties.
 * An injected property is automatically provided by the framework's dependency injection system.
 * 
 * @example
 * class MyComponent extends Component {
 *   @Inject(Token)
 *   property: ServiceForToken;
 * }
 * 
 * // Setting the value in the class definition
 * class MyComponent extends Component {
 *   @Inject(Token)
 *   property: ServiceForToken = new ServiceForToken();
 * }
 * 
 * @param type The constructor type of the dependency to be injected.
 * @returns A property decorator that can be applied to a property.
 */
export function Inject<I, T extends Component<any, any, any>>(type: {
  new (...args: Array<any>): I;
}) {
  return function () {
    return InjectDecorator<I, T>(type);
  } as (
    target: T,
    propertyKey: string,
    descriptor?: PropertyDescriptor,
  ) => void;
}

function InjectDecorator<I, T extends Component<any, any, any>>(type: {
  new (): I;
}): any {
  return {
    configurable: false,
    enumerable: true,
    get: function () {
      return (this as T).Injector.Get(type);
    },
    set: function (val: any) {
      (this as T).Injector.Set(type, val);
    },
  };
}

/**
 * Destroy decorator factory for marking a property to be destroyed when the component is destroyed.
 * @example
 * class MyComponent extends Component {
 *   @Destroy()
 *   timer: Timer;
 * }
 */
export function Destroy() {
  return DestroyDecorator;
}

/**
 * Utility to destroy all observable scopes and invoke destroy on marked properties of an instance.
 * @param value The instance to clean up.
 * @example
 * Destroy.All(this);
 */
export namespace Destroy {
  export function All<T extends WeakKey, K>(value: T) {
    const scopeMap = scopeInstanceMap.get(value);
    if (scopeMap !== undefined) {
      const values = Object.values(scopeMap);
      for (let x = 0; x < values.length; x++)
        ObservableScope.Destroy(values[x][0]);
    }

    const array = GetDestroyArrayForPrototype(Object.getPrototypeOf(value));
    for (let x = 0; x < array.length; x++) (value as any)[array[x]].Destroy();
  }
}

function DestroyDecorator<T extends Record<K, IDestroyable>, K extends string>(
  target: T,
  propertyKey: K,
): any {
  const array = GetDestroyArrayForPrototype(target);
  array.push(propertyKey);
}
