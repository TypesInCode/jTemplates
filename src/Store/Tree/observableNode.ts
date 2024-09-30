import { JsonDiff, JsonDiffResult } from "../../Utils/json";
import { JsonType } from "../../Utils/jsonType";
import { IObservableScope, ObservableScope } from "./observableScope";

export const IS_OBSERVABLE_NODE = "____isObservableNode";
export const GET_OBSERVABLE_VALUE = "____getObservableValue";
export const GET_TO_JSON = "toJSON";

const proxyCache = new WeakMap<any, unknown | unknown[]>();
const scopeCache = new WeakMap<any, IObservableScope<unknown | unknown[]>>();
const leafScopeCache = new WeakMap<any, {[prop: string]: IObservableScope<unknown>}>();

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

function UnwrapProxy(value: any, type: "value" | "array" | "object" = JsonType(value)) {
  // const type = JsonType(value);
  if (type === "value") return value;

  if (value[IS_OBSERVABLE_NODE] === true) return value[GET_OBSERVABLE_VALUE];

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

function CreateProxyFactory(alias?: (value: any) => any | undefined) {
  function CreateProxy<T>(value: T): T {
    value = UnwrapProxy(value);
    return CreateProxyFromValue(value);
  }

  function ToJsonCopy(value: unknown): any {
    const type = JsonType(value);
    switch (type) {
      case "array": {
        const typedValue = value as any[];
        const proxy = CreateProxy(typedValue);
        return proxy.map(ToJsonCopy);
      }
      case "object": {
        const typedValue: { [prop: string]: unknown } = alias(value) ?? value;
        const proxy = CreateProxy(typedValue);
        const keys = Object.keys(proxy);
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
  const readOnly = alias !== undefined;

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
    const proxy = new Proxy(value, {
      get: ObjectProxyGetter,
      set: ObjectProxySetter,
      has,
      ownKeys,
      getOwnPropertyDescriptor,
    }) as unknown;

    proxyCache.set(value, proxy);

    return proxy;
  }

  function ArrayProxySetter(array: unknown[], prop: string, value: any) {
    if (readOnly) throw `Object is readonly`;

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

    if (readOnly)
      switch (prop) {
        case "push":
        case "unshift":
        case "splice":
        case "pop":
        case "shift":
        case "sort":
        case "reverse":
          if (readOnly) throw `Object is readonly`;
      }

    switch (prop) {
      case GET_TO_JSON:
        return function () {
          return ToJson(array);
        };
      case GET_OBSERVABLE_VALUE:
        return array;
      default: {
        const scope = scopeCache.get(array) as IObservableScope<unknown[]>;
        array = ObservableScope.Value(scope);
        const arrayValue = (array as any)[prop];

        if (typeof prop === "symbol") return arrayValue;

        if (typeof arrayValue === "function")
          return function ArrayFunction(...args: any[]) {
            const proxyArray =
              prop === "slice" ? array.slice(...args) : array.slice();
            for (let x = 0; x < proxyArray.length; x++)
              proxyArray[x] = CreateProxyFromValue(proxyArray[x]);

            let result =
              prop === "slice"
                ? proxyArray
                : (proxyArray as any)[prop as any](...args);
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

  function SetPropertyValue(object: any, prop: string | number, value: any) {
    object[prop] = value;
    const leafScopes = leafScopeCache.get(object);
    ObservableScope.Update(leafScopes && leafScopes[prop] || scopeCache.get(object));
  }

  function ObjectProxySetter(object: any, prop: string, value: any) {
    if (readOnly) throw `Object is readonly`;

    if (prop === IS_OBSERVABLE_NODE)
      throw `Cannot assign read-only property: ${IS_OBSERVABLE_NODE}`;

    const jsonType = JsonType(value);
    if(jsonType === 'value') {
      value !== object[prop] && SetPropertyValue(object, prop, value);
    }
    else {
      value = UnwrapProxy(value, jsonType);
      const diff = JsonDiff(value, object[prop]);

      for (let x = 0; x < diff.length; x++) {
        if (diff[x].path.length === 0) {
          SetPropertyValue(object, prop, diff[x].value);
        } else {
          const path = diff[x].path;
          let curr = object[prop];
          let y = 0;
          for (; y < path.length - 1; y++) curr = curr[path[y]];

          SetPropertyValue(curr, path[y], diff[x].value);
        }
      }
    }

    return true;
  }

  function ObjectProxyGetter(object: unknown, prop: string | symbol) {
    if (prop === IS_OBSERVABLE_NODE) return true;

    switch (prop) {
      case GET_TO_JSON:
        return function () {
          return ToJson(object);
        };
      case GET_OBSERVABLE_VALUE:
        return object;
      default: {
        return GetAccessorValue(object, prop);
      }
    }
  }

  function GetAccessorValue(parent: any, prop: any) {
    let leafScopes = leafScopeCache.get(parent);
    if(leafScopes === undefined) {
      leafScopes = {};
      leafScopeCache.set(parent, leafScopes);
    }

    leafScopes[prop] ??= ObservableScope.Create(function() {
      const value = parent[prop];
      return CreateProxyFromValue(value);
    });

    return ObservableScope.Value(leafScopes[prop]);
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

  return CreateProxy;
}

const DefaultCreateProxy = CreateProxyFactory();

export namespace ObservableNode {
  export function Create<T>(value: T): T {
    return DefaultCreateProxy(value);
  }

  export function Touch(value: unknown) {
    const scope = scopeCache.get(value);
    ObservableScope.Update(scope);
  }

  export function ApplyDiff(rootNode: any, diffResult: JsonDiffResult) {
    const root = rootNode[GET_OBSERVABLE_VALUE];
    const pathTuples: [string | number, unknown][] = [["", root]];
    for (let x = 0; x < diffResult.length; x++) {
      const { path, value } = diffResult[x];

      let y = 0;
      for (; y < path.length - 1; y++) {
        const property = path[y];
        const value = pathTuples[y][1];

        const tupleIndex = y + 1;
        if (pathTuples.length <= tupleIndex)
          pathTuples.push([property, (value as any)[property]]);
        else if (pathTuples[tupleIndex][0] !== property) {
          pathTuples[tupleIndex][0] = property;
          pathTuples[tupleIndex][1] = (value as any)[property];

          const next = tupleIndex + 1;
          if (next < pathTuples.length) pathTuples[next][0] = null;
        }
      }

      const assignValue = pathTuples[y][1];
      (assignValue as any)[path[y]] = value;
      ObservableNode.Touch(assignValue);
    }
  }

  export function CreateFactory(alias?: (value: any) => any | undefined) {
    return CreateProxyFactory(alias);
  }
}
