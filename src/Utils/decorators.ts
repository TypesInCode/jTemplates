import { Component } from "../Node/component";
import {
  ObservableScope,
  IObservableScope,
} from "../Store/Tree/observableScope";
import { IDestroyable } from "./utils.types";
import { NodeRefTypes } from "../Node/nodeRef.types";
import { ObservableNode } from "../Store/Tree/observableNode";
import { StoreAsync } from "../Store";

const decoratorInstanceMap = new WeakMap<WeakKey, Map<string, unknown>>();
const valueInstanceMap = new WeakMap<WeakKey, Map<string, unknown>>();
const destroyPrototypeMap = new WeakMap<WeakKey, string[]>();

function GetDecoratorMapForInstance(instance: WeakKey) {
  const map = decoratorInstanceMap.get(instance) ?? new Map();
  decoratorInstanceMap.set(instance, map);

  return map;
}

function GetValueMapForInstance(instance: WeakKey) {
  const map = valueInstanceMap.get(instance) ?? new Map();
  valueInstanceMap.set(instance, map);

  return map;
}

function GetDestroyArrayForPrototype(prototype: WeakKey) {
  const array = destroyPrototypeMap.get(prototype) ?? [];
  destroyPrototypeMap.set(prototype, array);

  return array;
}

export function State(): any {
  return StateDecorator;
}

function StateDecorator<T extends Component<any, any, any>, K extends string>(
  target: T,
  propertyKey: K,
) {
  const propKey = `StateDecorator_${propertyKey}`;
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      const node = map.get(propKey);
      return node;
    },
    set: function (this: T, val: any) {
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      const node = map.get(propKey);
      if (!node) map.set(propKey, ObservableNode.Create(val));
      else {
        const keys = Object.keys(val);
        for (let x = 0; x < keys.length; x++) node[keys[x]] = val[keys[x]];
      }
    },
  } as PropertyDescriptor;
}

export function Value(): any {
  return ValueDecorator;
}

function ValueDecorator<T extends Component<any, any, any>, K extends string>(
  target: T,
  propertyKey: K,
) {
  const propKey = `ValueDecorator_${propertyKey}`;
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      let scope = map.get(propKey);
      if (scope === undefined) {
        const valueMap = GetValueMapForInstance(this);
        scope = ObservableScope.Create(function () {
          return valueMap.get(propKey);
        });
        map.set(propKey, scope);
      }

      return ObservableScope.Value(scope);
    },
    set: function (this: T, val: any) {
      const valueMap = GetValueMapForInstance(this);
      valueMap.set(propKey, val);
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      const scope = map.get(propKey);
      ObservableScope.Update(scope);
    },
  };
}

function defaultKeyFunc() {}
export function StateAsync(defaultValue: any, keyFunc?: (val: any) => string) {
  return StateAsyncDecorator.bind(
    null,
    defaultValue,
    keyFunc ?? defaultKeyFunc,
  );
}

function StateAsyncDecorator<
  T extends Component<any, any, any>,
  K extends string,
>(
  defaultValue: any,
  keyFunc: ((val: any) => string) | undefined,
  target: T,
  propertyKey: K,
) {
  const propKey = `ValueDecorator_${propertyKey}`;

  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      const store = map.get(propKey) as StoreAsync;
      return store?.Get("root", defaultValue) ?? defaultValue;
    },
    set: function (this: T, val: any) {
      const map = GetDecoratorMapForInstance(this); // this.DecoratorMap;

      let store = map.get(propKey) as StoreAsync;
      if (store === undefined) {
        store = new StoreAsync(keyFunc);
        map.set(propKey, store);
      }

      store.Write(val, "root");
    },
  };
}

/* export function StateSync(): any {
  return StateSyncDecorator;
}

function StateSyncDecorator<
  T extends Component<any, any, any> & Record<K, StoreClass<any>>,
  K extends string,
>(target: T, propertyKey: K) {
  const propKey = `StoreSyncDecorator_${propertyKey}`;
  return {
    configurable: false,
    enumerable: true,
    get: function () {
      const map = GetMapForInstance(this); // this.DecoratorMap;;
      const node = map.get(propKey);
      return node;
    },
    set: function (val: any) {
      const map = GetMapForInstance(this); // this.DecoratorMap;
      const node = map.get(propKey);
      if (!node) map.set(propKey, ObservableNode.Create(val));
      else {
        const keys = Object.keys(val);
        for (let x = 0; x < keys.length; x++) node[keys[x]] = val[keys[x]];
      }
    },
  } as PropertyDescriptor;
}

export function StateAsync(): any {
  return StateAsyncDecorator;
}

function StateAsyncDecorator<
  T extends Component<any, any, any> & Record<K, StoreAsync>,
  K extends string,
>(target: T, propertyKey: K) {
  const propKey = `StoreAsyncDecorator_${propertyKey}`;
  const scopeKey = `StoreAsyncDecorator_Scope_${propertyKey}`;
  DestroyDecorator(target, propKey);
  DestroyDecorator(target, scopeKey);
  return {
    configurable: false,
    enumerable: true,
    get: function () {
      var map = GetMapForInstance(this); // this.DecoratorMap;
      var scope = map.get(scopeKey) as ObservableScope<any>;
      const value = scope && scope.Value;
      if (ObservableScope.Watching()) return value;

      return ObservableTree.UnwrapProxyValues(value);
    },
    set: function (val: any) {
      var map = GetMapForInstance(this); // this.DecoratorMap;
      var store = map.get(propKey) as StoreAsync;
      if (!store) {
        store = new StoreAsync((val) => val.___id, {
          ___id: "ROOT",
          data: val,
        });
        map.set(propKey, store);
        map.set(
          scopeKey,
          store.Scope<{ ___id: string; data: any }, any>(
            "ROOT",
            (val) => val.data,
          ),
        );
      } else
        store.Action<{ ___id: string; data: any }>(
          "ROOT",
          async (root, writer) => await writer.Merge(root.data, val),
        );
    },
  } as PropertyDescriptor;
} */

export function Scope() {
  return ScopeDecorator;
}

function ScopeDecorator<T extends Component<any, any, any>, K extends string>(
  target: T,
  propertyKey: K,
  descriptor: PropertyDescriptor,
) {
  if (!(descriptor && descriptor.get))
    throw "Scope decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Scope decorator does not support setters";

  const propKey = `ScopeDecorator_${propertyKey}`;
  DestroyDecorator(target as T & Record<K, IObservableScope<any>>, propKey);
  return {
    configurable: false,
    enumerable: true,
    get: function () {
      var map = GetDecoratorMapForInstance(this); // this.DecoratorMap;
      var scope = map.get(propKey) as ObservableScope<any>;
      if (!scope) {
        const getter = descriptor.get.bind(this);
        scope = new ObservableScope(getter);
        map.set(propKey, scope);
      }

      return scope.Value;
    },
  } as PropertyDescriptor;
}

/* export function DestroyScope() {
  return DestroyScopeDecorator;
}

function DestroyScopeDecorator<
  T extends Component<any, any, any> & Record<K, IDestroyable>,
  K extends string,
>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
  if (!(descriptor && descriptor.get))
    throw "Destroy Scope decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Destroy Scope decorator does not support setters";

  const propKey = `ScopeDecorator_${propertyKey}`;
  DestroyDecorator(target as T & Record<K, ObservableScope<any>>, propKey);
  const valKey = `ScopeDecorator_${propertyKey}_Value`;
  DestroyDecorator(target as T & Record<K, IDestroyable>, valKey);
  return {
    configurable: false,
    enumerable: true,
    get: function () {
      var map = GetMapForInstance(this); // this.DecoratorMap;
      var scope = map.get(propKey) as ObservableScope<IDestroyable>;
      if (!scope) {
        const getter = descriptor.get.bind(this);
        scope = new ObservableScope(getter);
        map.set(propKey, scope);
        // map.set(valKey, scope.Value);
        scope.Watch((scope) => {
          var lastValue = map.get(valKey);
          lastValue && lastValue.Destroy();
          map.set(valKey, scope.Value);
        });
      }

      return scope.Value;
    },
  } as PropertyDescriptor;
}

export function Computed() {
  return ComputedDecorator as <
    T extends Component<any, any, any>,
    K extends string,
  >(
    target: T,
    propertyKey: K,
    descriptor: PropertyDescriptor,
  ) => any;
}

function ComputedDecorator<
  T extends Component<any, any, any>,
  K extends string,
>(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
  if (!(descriptor && descriptor.get))
    throw "Computed decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "Computed decorator does not support setters";

  const scopeKey = `ComputedDecorator_Scope_${propertyKey}`;
  const storeKey = `ComputedDecorator_Store_${propertyKey}`;
  DestroyDecorator(target as T & Record<K, ObservableScope<any>>, scopeKey);
  DestroyDecorator(target as T & Record<K, StoreSync<any>>, storeKey);

  return {
    configurable: false,
    enumerable: true,
    get: function () {
      var map = GetMapForInstance(this); // this.DecoratorMap;
      var store = map.get(storeKey) as StoreSync<any>;
      if (!store) {
        const getter = descriptor.get.bind(this);
        const scope = new ObservableScope(getter);

        store = new StoreSync(scope.Value);
        scope.Watch((scope) => {
          if (!(this as T).Destroyed) store.Write(scope.Value);
        });

        map.set(scopeKey, scope);
        map.set(storeKey, store);
      }

      return store.Root.Value;
    },
  } as PropertyDescriptor;
}

export function ComputedAsync(idFunc?: { (val: any): string }) {
  return ComputedAsyncDecorator.bind(null, idFunc) as <
    T extends Component<any, any, any>,
    K extends string,
  >(
    target: T,
    propertyKey: K,
    descriptor: PropertyDescriptor,
  ) => any;
}

function ComputedAsyncDecorator<
  T extends Component<any, any, any>,
  K extends string,
>(
  idFunc: { (val: any): string },
  target: T,
  propertyKey: K,
  descriptor: PropertyDescriptor,
) {
  if (!(descriptor && descriptor.get))
    throw "ComputedAsync decorator requires a getter";

  if (descriptor && descriptor.set)
    throw "ComputedAsync decorator does not support setters";

  const scopeKey = `ComputedDecorator_Scope_${propertyKey}`;
  const storeKey = `ComputedDecorator_Store_${propertyKey}`;
  const storeScopeKey = `ComputedDecorator_StoreScope_${propertyKey}`;
  DestroyDecorator(target as T & Record<K, IObservableScope<any>>, scopeKey);
  DestroyDecorator(target as T & Record<K, StoreClass<any>>, storeKey);
  DestroyDecorator(target as T & Record<K, StoreClass<any>>, storeScopeKey);

  return {
    configurable: false,
    enumerable: true,
    get: function () {
      var map = GetMapForInstance(this); // this.DecoratorMap;
      var storeScope = map.get(storeScopeKey) as ObservableScope<any>;
      if (!storeScope) {
        const getter = descriptor.get.bind(this);
        const scope = new ObservableScope(() => {
          var value = getter();
          if (value && typeof value.toJSON === "function")
            value = value.toJSON();

          return value;
        });
        const store = new StoreAsync((val: any) => val._id, {
          _id: "ROOT",
          data: scope.Value,
        });
        scope.Watch((scope) => {
          if (!(this as T).Destroyed)
            store.Write({ _id: "ROOT", data: scope.Value });
        });

        storeScope = store.Scope(
          "ROOT",
          (val: { _id: string; data: any }) => val.data,
        );

        map.set(storeScopeKey, storeScope);
        map.set(scopeKey, scope);
        map.set(storeKey, store);
      }

      return storeScope.Value;
    },
  } as PropertyDescriptor;
} */

export function Inject<I>(type: { new (...args: Array<any>): I }) {
  return InjectorDecorator.bind(null, type) as <
    F extends I,
    T extends Component<any, any, any> & Record<K, F>,
    K extends string,
  >(
    target: T,
    propertyKey: K,
    descriptor?: PropertyDescriptor,
  ) => any;
}

function InjectorDecorator<
  I,
  F extends I,
  T extends Component<any, any, any> & Record<K, F>,
  K extends string,
>(
  type: { new (): I },
  target: T,
  propertyKey: K,
  descriptor?: PropertyDescriptor,
): any {
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

export function Destroy() {
  return DestroyDecorator;
}

export namespace Destroy {
  export function All<T, K>(value: T) {
    const array = GetDestroyArrayForPrototype(Object.getPrototypeOf(value));
    for (let x = 0; x < array.length; x++) (value as any)[array[x]].Destroy();
  }
}

function DestroyDecorator<
  T extends Component<any, any, any> & Record<K, IDestroyable>,
  K extends string,
>(target: T, propertyKey: K): any {
  const array = GetDestroyArrayForPrototype(target);
  array.push(propertyKey);
}

export function PreReqTemplate(template: {
  (): NodeRefTypes | NodeRefTypes[];
}) {
  return PreReqTemplateDecorator.bind(null, template) as <
    T extends Component<any, any, any>,
  >(target: {
    new (...args: Array<any>): T;
  }) => any;
}

export namespace PreReqTemplate {
  export function Get(value: any): NodeRefTypes[] {
    var func = value && value.PreReqTemplateDecorator_Template;
    var ret: NodeRefTypes[] = func ? func() : [];
    if (!Array.isArray(ret)) ret = [ret];

    return ret;
  }
}

function PreReqTemplateDecorator<T extends Component<any, any, any>>(
  template: { (): NodeRefTypes | NodeRefTypes[] },
  target: { new (...args: Array<any>): T },
) {
  var proto = target.prototype as any;
  proto.PreReqTemplateDecorator_Template = template;
}

export function PreReq() {
  return PreReqDecorator;
}

export namespace PreReq {
  function Get(value: any): Array<string> {
    return (value && value.PreReqDecorator_PreReqs) || [];
  }

  export function All(value: any) {
    var arr = Get(value).map(
      (prop: string) =>
        ((value[prop] && value[prop].Init) as Promise<void>) ||
        Promise.resolve(),
    );
    return Promise.all(arr);
  }

  export function Has(value: any) {
    return Get(value).length > 0;
  }
}

function PreReqDecorator<
  T extends Record<K, { Init: Promise<void> }>,
  K extends string,
>(target: T, propertyKey: K): any {
  var proto = target as any;
  proto.PreReqDecorator_PreReqs = proto.PreReqDecorator_PreReqs || [];
  proto.PreReqDecorator_PreReqs.push(propertyKey);
}
