import { Component } from "../Node/component";
import {
  ObservableScope,
  IObservableScope,
} from "../Store/Tree/observableScope";
import { IDestroyable } from "./utils.types";
import { ElementNodeRefTypes } from "../Node/nodeRef.types";
import { ObservableNode } from "../Store/Tree/observableNode";
import { StoreAsync, StoreSync } from "../Store";

const nodeInstanceMap = new WeakMap<
  WeakKey,
  { [prop: string]: { root: unknown | undefined } }
>();
const scopeInstanceMap = new WeakMap<
  WeakKey,
  { [prop: string]: [IObservableScope<unknown>, unknown] }
>();
const destroyPrototypeMap = new WeakMap<WeakKey, string[]>();

function GetNodeMapForInstance(instance: WeakKey) {
  const map = nodeInstanceMap.get(instance) ?? {};
  nodeInstanceMap.set(instance, map);

  return map;
}

function GetScopeMapForInstance(instance: WeakKey) {
  const map = scopeInstanceMap.get(instance) ?? {};
  scopeInstanceMap.set(instance, map);

  return map;
}

function GetDestroyArrayForPrototype(prototype: WeakKey) {
  const array = destroyPrototypeMap.get(prototype) ?? [];
  destroyPrototypeMap.set(prototype, array);

  return array;
}

export function Computed<T extends Component<any, any, any>, K extends keyof T, V extends T[K]>(defaultValue: V) {
  return function(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return ComputedDecorator(target, propertyKey, descriptor, defaultValue)
  }
}

function ComputedDecorator<T extends Component<any, any, any>, K extends keyof T, D extends T[K]>(
  target: T,
  prop: K,
  descriptor: PropertyDescriptor,
  defaultValue: D
) {
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
        const getterScope = ObservableScope.Create(async () => getter.call(this));
        const syncStore = new StoreSync();

        ObservableScope.Watch(getterScope, (scope) => {
          const data = ObservableScope.Value(scope);
          syncStore.Write(data, 'root');
        });
        ObservableScope.Init(getterScope);

        const propertyScope = ObservableScope.Create(() => syncStore.Get('root', defaultValue));
        ObservableScope.OnDestroyed(propertyScope, function() {
          ObservableScope.Destroy(getterScope);
        });

        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    }
  } as PropertyDescriptor;
}

export function ComputedAsync<T extends Component<any, any, any>, K extends keyof T, V extends T[K]>(defaultValue: V) {
  return function(target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return ComputedAsyncDecorator(target, propertyKey, descriptor, defaultValue)
  }
}

function ComputedAsyncDecorator<T extends Component<any, any, any>, K extends keyof T, D extends T[K]>(
  target: T,
  prop: K,
  descriptor: PropertyDescriptor,
  defaultValue: D
) {
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
        const getterScope = ObservableScope.Create(async () => getter.call(this));
        const asyncStore = new StoreAsync();

        ObservableScope.Watch(getterScope, (scope) => {
          asyncStore.Write(ObservableScope.Value(scope), 'root');
        });
        ObservableScope.Init(getterScope);

        const propertyScope = ObservableScope.Create(() => asyncStore.Get('root', defaultValue));
        ObservableScope.OnDestroyed(propertyScope, function() {
          ObservableScope.Destroy(getterScope);
          asyncStore.Destroy();
        });

        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    }
  } as PropertyDescriptor;
}

export function State(): any {
  return StateDecorator;
}

function StateDecorator<T extends Component<any, any, any>, K extends string>(
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
        map[propertyKey] = ObservableNode.Create({ root: val });
      else map[propertyKey].root = val;
    },
  } as PropertyDescriptor;
}

export function Value(): any {
  return ValueDecorator;
}

function CreateValueScope(tuple: [unknown, any]) {
  return ObservableScope.Create(function () {
    return tuple[1];
  });
}

function ValueDecorator<T extends Component<any, any, any>, K extends string>(
  target: T,
  propertyKey: K,
) {
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      const propertyMap = GetScopeMapForInstance(this);
      const tuple: typeof propertyMap[typeof propertyKey] = propertyMap[propertyKey] ??= [null, undefined];
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

export function Inject<I>(type: { new(...args: Array<any>): I }) {
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
  type: { new(): I },
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
  export function All<T extends WeakKey, K>(value: T) {
    const scopeMap = scopeInstanceMap.get(value);
    if (scopeMap !== undefined) {
      const keys = Object.keys(scopeMap);
      for (let x = 0; x < keys.length; x++)
        ObservableScope.Destroy(scopeMap[keys[x]][0]);
    }

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
  (): ElementNodeRefTypes | ElementNodeRefTypes[];
}) {
  return PreReqTemplateDecorator.bind(null, template) as <
    T extends Component<any, any, any>,
  >(target: {
    new(...args: Array<any>): T;
  }) => any;
}

export namespace PreReqTemplate {
  export function Get(value: any): ElementNodeRefTypes[] {
    var func = value && value.PreReqTemplateDecorator_Template;
    var ret: ElementNodeRefTypes[] = func ? func() : [];
    if (!Array.isArray(ret)) ret = [ret];

    return ret;
  }
}

function PreReqTemplateDecorator<T extends Component<any, any, any>>(
  template: { (): ElementNodeRefTypes | ElementNodeRefTypes[] },
  target: { new(...args: Array<any>): T },
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
