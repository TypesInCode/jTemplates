import { JsonDiff, JsonType } from "../../Utils/json";
import { IObservableScope, ObservableScope } from "./observableScope";

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
  if (!value) return value;

  if (value.toJSON && typeof value.toJSON === "function") return value.toJSON();

  const type = JsonType(value);
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
  value = UnwrapProxy(value);
  array[prop as any] = value;

  const scope = scopeCache.get(array);
  ObservableScope.Update(scope);
  return true;
}

function ArrayProxyGetter(array: unknown[], prop: string | symbol | number) {
  const scope = scopeCache.get(array) as IObservableScope<unknown[]>;
  array = ObservableScope.Value<unknown[]>(scope);
  switch (prop) {
    case "toJSON":
      return function () {
        return array;
      };
    default: {
      const arrayValue = (array as any)[prop];

      if (typeof prop === "symbol") return arrayValue;

      if (typeof arrayValue === "function")
        return function ArrayFunction(...args: any[]) {
          const proxyArray = array.slice();
          for (let x = 0; x < proxyArray.length; x++)
            proxyArray[x] =
              proxyCache.get(proxyArray[x]) ?? CreateProxy(proxyArray[x]);

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

      const proxy = CreateProxy<any[]>(arrayValue);
      return proxy;
    }
  }
}

let applyingDiff = false;
function ObjectProxySetter(object: any, prop: string, value: any) {
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
  const scope = scopeCache.get(object);
  object = ObservableScope.Value<unknown>(scope);
  switch (prop) {
    case "toJSON":
      return function () {
        return object;
      };
    default: {
      const proxyValue = (object as any)[prop];

      if (typeof prop === "symbol") return proxyValue;

      const proxy = CreateProxy(proxyValue);
      return proxy;
    }
  }
}

function CreateProxy<T>(value: T): T {
  const type = JsonType(value);
  switch (type) {
    case "object": {
      const proxy = proxyCache.get(value) ?? CreateObjectProxy(value);
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

export namespace ObservableNode {
  export function Create<T>(value: T): T {
    value = UnwrapProxy(value);
    return CreateProxy(value);
  }
}
