import { JsonDiff, JsonDiffResult, JsonType } from "../../Utils/json";
import { IObservableScope, ObservableScope } from "./observableScope";

const IS_OBSERVABLE_NODE = "____observableNode";

const proxyCache = new WeakMap<any, unknown | unknown[]>();
const scopeCache = new WeakMap<any, IObservableScope<unknown | unknown[]>>();

function getOwnPropertyDescriptor(target: any, prop: string | symbol) {
  const descriptor = Object.getOwnPropertyDescriptor(target, prop);
  return {
    ...descriptor,
    configurable: true,
  } as PropertyDescriptor;
}

function getOwnPropertyDescriptorArray(target: any, prop: string | symbol) {
  const descriptor = Object.getOwnPropertyDescriptor(target, prop);
  return {
    ...descriptor,
    configurable: true,
  } as PropertyDescriptor;
}

function has(value: any, prop: string | symbol) {
  return Object.hasOwn(value, prop);
}

function hasArray(value: any, prop: string | symbol) {
  return Object.hasOwn(value, prop);
}

function ownKeys(value: any) {
  return Object.keys(value);
}

function ownKeysArray(value: any) {
  return Object.keys(value);
}

function UnwrapProxy(value: any) {
  const type = JsonType(value);
  if (type === "value") return value;

  if (value[IS_OBSERVABLE_NODE] === true) return value.toJSON();

  switch (type) {
    case "object": {
      const keys = Object.keys(value);
      for (let x = 0; x < keys.length; x++)
        value[keys[x]] = UnwrapProxy(value[keys[x]]);
    }
    case "array": {
      for (let x = 0; x < value.length; x++) value[x] = UnwrapProxy(value[x]);
    }
  }

  return value;
}

let applyingDiff = false;

function CreateProxyFactory(alias?: (value: any) => any | undefined) {
  function ToJsonCopy(value: unknown): any {
    const type = JsonType(value);
    switch (type) {
      case "array": {
        const typedValue = value as any[];
        return typedValue.map(ToJsonCopy);
        break;
      }
      case "object": {
        const typedValue: { [prop: string]: unknown } = alias(value) ?? value;
        const keys = Object.keys(typedValue);
        const copy: { [prop: string]: unknown } = {};
        for (let x = 0; x < keys.length; x++)
          copy[keys[x]] = ToJsonCopy(typedValue[keys[x]]);

        return copy;
      }
      default:
        return value;
    }
  }

  function ToJsonDefault(value: any) {
    return value;
  }

  const ToJson = alias !== undefined ? ToJsonCopy : ToJsonDefault;

  function CreateArrayProxy(value: any[]) {
    const scope = ObservableScope.Create(() => value);
    const proxy = new Proxy(value, {
      get: ArrayProxyGetter,
      set: ArrayProxySetter,
      has: hasArray,
      ownKeys: ownKeysArray,
      getOwnPropertyDescriptor: getOwnPropertyDescriptorArray,
    }) as unknown[];

    scopeCache.set(value, scope);
    proxyCache.set(value, proxy);

    return proxy;
  }

  function CreateObjectProxy(value: any) {
    const scope = ObservableScope.Create(() => value);
    const proxy = new Proxy(value, {
      get: ObjectProxyGetter,
      set: ObjectProxySetter,
      has,
      ownKeys,
      getOwnPropertyDescriptor,
    }) as unknown;

    scopeCache.set(value, scope);
    proxyCache.set(value, proxy);

    return proxy;
  }

  function ArrayProxySetter(array: unknown[], prop: string, value: any) {
    if (prop === IS_OBSERVABLE_NODE)
      throw `Cannot assign read-only property: ${IS_OBSERVABLE_NODE}`;

    value = UnwrapProxy(value);
    array[prop as any] = value;

    const scope = scopeCache.get(array);
    ObservableScope.Update(scope);
    return true;
  }

  function ArrayProxyGetter(array: unknown[], prop: string | symbol | number) {
    if (prop === IS_OBSERVABLE_NODE) return true;

    const scope = scopeCache.get(array) as IObservableScope<unknown[]>;
    array = ObservableScope.Value<unknown[]>(scope);
    switch (prop) {
      case "toJSON":
        return function () {
          return ToJson(array);
        };
      default: {
        const arrayValue = (array as any)[prop];

        if (typeof prop === "symbol") return arrayValue;

        if (typeof arrayValue === "function")
          return function ArrayFunction(...args: any[]) {
            const proxyArray = array.slice();
            for (let x = 0; x < proxyArray.length; x++)
              proxyArray[x] =
                proxyCache.get(proxyArray[x]) ??
                CreateProxyFromValue(proxyArray[x]);

            let result = (proxyArray as any)[prop as any](...args);
            switch (prop) {
              case "push":
              case "unshift":
              case "splice":
              case "pop":
              case "shift":
              case "sort":
              case "reverse":
                array.length = proxyArray.length;
                for (let x = 0; x < proxyArray.length; x++)
                  array[x] = UnwrapProxy(proxyArray[x]);

                ObservableScope.Update(scope);
                break;
            }

            return result;
          };

        const proxy = CreateProxyFromValue<any[]>(arrayValue);
        return proxy;
      }
    }
  }

  function ObjectProxySetter(object: any, prop: string, value: any) {
    if (prop === IS_OBSERVABLE_NODE)
      throw `Cannot assign read-only property: ${IS_OBSERVABLE_NODE}`;

    const scope = scopeCache.get(object) as IObservableScope<unknown>;
    value = UnwrapProxy(value);

    if (applyingDiff) {
      object[prop] = value;
      ObservableScope.Update(scope);
    } else {
      applyingDiff = true;
      const diff = JsonDiff(value, object[prop]);

      for (let x = 0; x < diff.length; x++) {
        if (diff[x].path.length === 0) {
          const proxy = proxyCache.get(object) as any;
          proxy[prop] = diff[x].value;
        } else {
          const path = diff[x].path;
          let curr = object[prop];
          let y = 0;
          for (; y < path.length - 1; y++) curr = curr[path[y]];

          const target = proxyCache.get(curr) ?? curr;
          target[path[y]] = diff[x].value;
        }
      }
      applyingDiff = false;
    }

    return true;
  }

  function ObjectProxyGetter(object: unknown, prop: string | symbol) {
    if (prop === IS_OBSERVABLE_NODE) return true;

    const scope = scopeCache.get(object);
    object = ObservableScope.Value<unknown>(scope);
    switch (prop) {
      case "toJSON":
        return function () {
          return ToJson(object);
        };
      default: {
        const proxyValue = (object as any)[prop];

        if (typeof prop === "symbol") return proxyValue;

        const proxy = CreateProxyFromValue(proxyValue);
        return proxy;
      }
    }
  }

  function CreateProxyFromValue<T>(value: T): T {
    const type = JsonType(value);
    switch (type) {
      case "object": {
        let proxy: any = proxyCache.get(value) ?? CreateObjectProxy(value);
        if (alias !== undefined) {
          const aliasValue = alias(proxy);
          if (aliasValue !== undefined)
            proxy = proxyCache.get(aliasValue) ?? CreateObjectProxy(aliasValue);
        }
        return proxy as T;
      }
      case "array": {
        const proxy = proxyCache.get(value) ?? CreateArrayProxy(value as any[]);
        ObservableScope.Touch(scopeCache.get(value));
        return proxy as T;
      }
      default:
        return value as any;
    }
  }

  function CreateProxy<T>(value: T): T {
    value = UnwrapProxy(value);
    return CreateProxyFromValue(value);
  }

  return CreateProxy;
}

const DefaultCreateProxy = CreateProxyFactory();

export namespace ObservableNode {
  export function Create<T>(value: T): T {
    return DefaultCreateProxy(value);
  }

  export function EnableDiff(value: boolean) {
    applyingDiff = value;
  }

  export function CreateFactory(alias?: (value: any) => any | undefined) {
    return CreateProxyFactory(alias);
  }
}
