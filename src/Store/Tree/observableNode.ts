import { JsonDeepClone, JsonDiff, JsonDiffResult, JsonMerge } from "../../Utils/json";
import { JsonType } from "../../Utils/json";
import { IBasicObservableScope, ObservableScope } from "./observableScope";

const NODE_VALUE = Symbol("NODE_VALUE");
const NODE_PROXY = Symbol("NODE_PROXY");
const toJSON = "toJSON";
const IS_NODE = Symbol("IS_NODE");
const OBJECT_SCOPE = Symbol("ARRAY_SCOPE");

function Identity<T>(value: T): T {
  return value;
}

function Property(value: any, prop: string) {
  return value[prop];
}

type ObservableNodeWrapper = {
  [NODE_VALUE]: any,
  [NODE_PROXY]: any,
  [prop: string | symbol]: IBasicObservableScope<any>
}

const wrapperCache = new WeakMap<any, ObservableNodeWrapper>();

function getOwnPropertyDescriptor(target: ObservableNodeWrapper, prop: string | symbol) {
  const descriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return {
    ...descriptor,
    configurable: true,
  } as PropertyDescriptor;
}

function getOwnPropertyDescriptorArray(target: ObservableNodeWrapper, prop: string | symbol) {
  const descriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return {
    ...descriptor,
    configurable: true,
  } as PropertyDescriptor;
}

function has(value: ObservableNodeWrapper, prop: string | symbol) {
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function hasArray(value: ObservableNodeWrapper, prop: string | symbol) {
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function ownKeys(value: ObservableNodeWrapper) {
  return Object.keys(value[NODE_VALUE]);
}

function ownKeysArray(value: ObservableNodeWrapper) {
  return Object.keys(value[NODE_VALUE]);
}

function TouchValue(value: unknown, prop: string | number | symbol = OBJECT_SCOPE) {
  const wrapper = wrapperCache.get(value);
  if (wrapper) {
    const scope = wrapper[prop] ?? wrapper[OBJECT_SCOPE];
    ObservableScope.Touch(scope);
  }
}

function UnwrapProxy(
  value: any,
  type: "value" | "array" | "object" = JsonType(value),
) {
  if (type === "value") return value;

  if (value[IS_NODE]) {
    const nodeValue = value[NODE_VALUE];
    return nodeValue;
  }

  switch (type) {
    case "object": {
      const keys = Object.keys(value);
      for (let x = 0; x < keys.length; x++)
        value[keys[x]] = UnwrapProxy(value[keys[x]]);

      break;
    }
    case "array": {
      for (let x = 0; x < value.length; x++) value[x] = UnwrapProxy(value[x]);
      break;
    }
  }

  return value;
}

function CloneProxy(
  value: any,
  type: "value" | "array" | "object" = JsonType(value)
) {
  if (type === "value") return value;

  if (value[IS_NODE]) {
    return JsonDeepClone(value);
  }

  switch (type) {
    case "object": {
      const keys = Object.keys(value);
      for (let x = 0; x < keys.length; x++)
        value[keys[x]] = CloneProxy(value[keys[x]]);

      break;
    }
    case "array": {
      for (let x = 0; x < value.length; x++) value[x] = CloneProxy(value[x]);
      break;
    }
  }

  return value;
}

function CreateProxyFactory(alias?: (value: any) => any | undefined) {

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

  function SetObjectValue(object: ObservableNodeWrapper, prop: string, value: any) {
    object[NODE_VALUE][prop] = value;
    ObservableScope.Update(object[prop]);
  }

  function SetArrayValue(object: ObservableNodeWrapper, prop: number, value: any) {
    object[NODE_VALUE][prop] = value;
    ObservableScope.Update(object[OBJECT_SCOPE]);
  }

  function CreateProxy<T>(value: T): T {
    value = UnwrapProxy(value);
    return CreateProxyFromValue(value);
  }

  function CreateArrayProxy(value: any[]) {
    const wrapper: ObservableNodeWrapper = Object.assign([] as any as ObservableNodeWrapper, {
      [NODE_VALUE]: value,
      [NODE_PROXY]: null,
      [OBJECT_SCOPE]: ObservableScope.Basic(Identity.bind(null, value))
    });

    const proxy = wrapper[NODE_PROXY] = new Proxy(wrapper, {
      get: ArrayProxyGetter,
      set: ArrayProxySetter,
      has: hasArray,
      ownKeys: ownKeysArray,
      getOwnPropertyDescriptor: getOwnPropertyDescriptorArray,
    });

    wrapperCache.set(value, wrapper);
    return proxy;
  }

  function ArrayProxySetter(object: ObservableNodeWrapper, prop: string | symbol | number, value: any) {
    if (readOnly) throw `Object is readonly`;

    value = UnwrapProxy(value);
    SetArrayValue(object, prop as number, value);
    return true;
  }

  function ArrayProxyGetter(object: ObservableNodeWrapper, prop: string | symbol | number) {
    if (readOnly)
      switch (prop) {
        case "push":
        case "unshift":
        case "splice":
        case "pop":
        case "shift":
        case "sort":
        case "reverse":
          throw "Object is readonly";
      }

    switch (prop) {
      case IS_NODE:
        return true;
      case toJSON:
        return function () {
          return ToJson(object[NODE_VALUE]);
        };
      case NODE_VALUE:
        return object[NODE_VALUE];
      default: {
        const scope = object[OBJECT_SCOPE];
        const array = ObservableScope.Value(scope);
        const arrayValue = (array as any)[prop];

        if (typeof prop === "symbol") return arrayValue;

        if (typeof arrayValue === "function")
          return function ArrayFunction(...args: any[]) {
            const proxyArray =
              prop === "slice" ? array.slice(...args).map(CreateProxyFromValue) : array.map(CreateProxyFromValue);

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

  function CreateObjectProxy(value: any) {
    const wrapper: ObservableNodeWrapper = {
      [NODE_VALUE]: value,
      [NODE_PROXY]: null
    };

    const proxy = wrapper[NODE_PROXY] = new Proxy(wrapper, {
      get: ObjectProxyGetter,
      set: ObjectProxySetter,
      has,
      ownKeys,
      getOwnPropertyDescriptor,
    });

    wrapperCache.set(value, wrapper);
    return proxy;
  }

  function ObjectProxySetter(object: ObservableNodeWrapper, prop: string, value: any) {
    if (readOnly) throw `Object is readonly`;

    value = UnwrapProxy(value);
    SetObjectValue(object, prop, value);

    return true;
  }

  function ObjectProxyGetter(object: ObservableNodeWrapper, prop: string | symbol) {
    switch (prop) {
      case IS_NODE:
        return true;
      case toJSON:
        return function () {
          return ToJson(object);
        };
      case NODE_VALUE:
        return object[NODE_VALUE];
      default: {
        return GetAccessorValue(object, prop);
      }
    }
  }

  function GetAccessorValue(object: ObservableNodeWrapper, prop: any) {
    const scope = object[prop] ??= ObservableScope.Basic(
      Property.bind(null, object[NODE_VALUE], prop)
    );

    const value = ObservableScope.Value(scope);
    return CreateProxyFromValue(value);
  }

  function CreateProxyFromValue<T>(value: T): T {
    const type = JsonType(value);
    switch (type) {
      case "object": {
        const wrapper = wrapperCache.get(value);
        let proxy = wrapper?.[NODE_PROXY] ?? CreateObjectProxy(value);
        if (alias !== undefined) {
          const aliasValue = alias(proxy);
          if (aliasValue !== undefined && aliasValue !== value) {
            const wrapper = wrapperCache.get(aliasValue);
            proxy = wrapper?.[NODE_PROXY] ?? CreateObjectProxy(aliasValue);
          }
        }
        return proxy as T;
      }
      case "array": {
        const wrapper = wrapperCache.get(value);
        const proxy = wrapper?.[NODE_PROXY] ?? CreateArrayProxy(value as any[]);
        ObservableScope.Touch(wrapper?.[OBJECT_SCOPE]);
        return proxy as T;
      }
      default:
        return value as any;
    }
  }

  return function CreateProxy<T>(value: T): T {
    value = UnwrapProxy(value);
    return CreateProxyFromValue(value);
  }
}

const DefaultCreateProxy = CreateProxyFactory();

export namespace ObservableNode {
  /**
   * Unwraps an observable node to get the raw underlying value.
   * Recursively unwraps nested objects and arrays.
   * @template T The type of value to unwrap.
   * @param value The value to unwrap, which may be an observable node or plain value.
   * @returns The unwrapped raw value without proxy wrappers.
   */
  export function Unwrap<T>(value: T): T {
    return UnwrapProxy(value);
  }

  export function Clone<T>(value: T): T {
    return CloneProxy(value);
  }

  /**
   * Creates an observable node from a plain value.
   * Wraps the value in a proxy that tracks changes and enables reactive updates.
   * @template T The type of value to wrap.
   * @param value The plain value (object, array, or primitive) to make observable.
   * @returns A proxied version of the value that emits change events.
   */
  export function Create<T>(value: T): T {
    return DefaultCreateProxy(value);
  }

  /**
   * Marks an observable node or its property as changed, triggering reactive updates.
   * Used internally to notify dependencies that a value has been modified.
   * @param value The observable node to touch.
   * @param prop Optional property name or index to touch a specific nested property.
   */
  export function Update(value: unknown, prop: string | number | symbol = OBJECT_SCOPE) {
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      const scope = wrapper[prop] ?? wrapper[OBJECT_SCOPE];
      ObservableScope.Update(scope);
    }
  }

  export function Apply(rootNode: any, update: any) {
    const root = rootNode[NODE_VALUE];
    const diff = JsonDiff(update, root);
    ApplyDiff(rootNode, diff);
  }

  /**
   * Applies a JSON diff result to an observable node, efficiently updating only changed properties.
   * Optimizes nested object updates by computing paths incrementally and touching modified properties.
   * @param rootNode The observable node to apply the diff to.
   * @param diffResult The diff result from JsonDiff containing path-value pairs of changes.
   */
  export function ApplyDiff(rootNode: any, diffResult: JsonDiffResult) {
    const root = rootNode[NODE_VALUE];
    if (diffResult.length === 1 && diffResult[0].path.length === 0) {
      // Replacing rootNode
      const rootPatch = diffResult[0].value;

      const rootType = JsonType(root);
      const rootPatchType = JsonType(root);

      if (rootType !== rootPatchType)
        throw new Error("Unable to change type of Root ObservableNode: " + rootType);

      switch (rootType) {
        case "array": {
          (root as any[]).splice(0, root.length, ...(rootPatch as any[]));
          ObservableNode.Update(root);
          break;
        }
        case "object": {
          const keys = Object.keys(root);
          const patchKeys = Object.keys(rootPatch);
          for (let x = 0; x < keys.length; x++)
            if (!patchKeys.includes(keys[x]))
              delete root[keys[x]];

          Object.assign(root, rootPatch);
          for (let x = 0; x < keys.length; x++)
            ObservableNode.Update(root, keys[x]);
          break;
        }
        case "value":
          throw new Error("Unable to replace value type: " + root);
      }

      return;
    }

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
      ObservableNode.Update(assignValue, path[y]);
    }
  }

  /**
   * Creates a factory function for making values observable with optional aliasing.
   * The alias function transforms values before creating the observable proxy,
   * useful for read-only views or value transformations.
   * @param alias Optional function to transform values before making them observable.
   * @returns A function that creates observable nodes from plain values.
   */
  export function CreateFactory(alias?: (value: any) => any | undefined) {
    return CreateProxyFactory(alias);
  }
}
