import { JsonApplyDiff, JsonDeepClone, JsonDiff, JsonDiffResult } from "../../Utils/json";
import { JsonType } from "../../Utils/json";
import { IBasicObservableScope, ObservableScope } from "./observableScope";
import { Snapshot, SnapshotResolver } from "./snapshot";

const NODE_VALUE = Symbol("NODE_VALUE");
const NODE_PROXY = Symbol("NODE_PROXY");
const NODE_SNAPSHOT = Symbol("NODE_SNAPSHOT");
const NODE_WRAPPER = Symbol("NODE_WRAPPER");
const toJSON = "toJSON";
const IS_NODE = Symbol("IS_NODE");
const ARRAY_SCOPE = Symbol("ARRAY_SCOPE");
const OBJECT_SCOPE = Symbol("OBJECT_SCOPE");

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
const snapshotState = Snapshot.Create();

function InvalidateSnapshotForValue(value: object) {
  Snapshot.Invalidate(snapshotState, value);
}

function getOwnPropertyDescriptor(target: ObservableNodeWrapper, prop: string | symbol) {
  ObservableScope.Touch(target[OBJECT_SCOPE]);
  const descriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return descriptor && {
    ...descriptor,
    configurable: true,
  } as PropertyDescriptor;
}

function getOwnPropertyDescriptorArray(target: ObservableNodeWrapper, prop: string | symbol) {
  ObservableScope.Touch(target[ARRAY_SCOPE]);
  const descriptor = Object.getOwnPropertyDescriptor(target, prop);
  const nodeDescriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return nodeDescriptor && {
    ...nodeDescriptor,
    configurable: descriptor?.configurable ?? true,
  } as PropertyDescriptor;
}

function has(value: ObservableNodeWrapper, prop: string | symbol) {
  ObservableScope.Touch(value[OBJECT_SCOPE]);
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function hasArray(value: ObservableNodeWrapper, prop: string | symbol) {
  ObservableScope.Touch(value[ARRAY_SCOPE]);
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function ownKeys(value: ObservableNodeWrapper) {
  ObservableScope.Touch(value[OBJECT_SCOPE]);
  return Object.keys(value[NODE_VALUE]);
}

function ownKeysArray(value: ObservableNodeWrapper) {
  ObservableScope.Touch(value[ARRAY_SCOPE]);
  return Reflect.ownKeys(value[NODE_VALUE]);
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

function GetPropertyScope(object: ObservableNodeWrapper, prop: string) {
  if (!Object.hasOwn(object, prop)) {
    Object.defineProperty(object, prop, {
      value: ObservableScope.Basic(Property.bind(null, object[NODE_VALUE], prop)),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  return object[prop];
}

function SetObjectValue(object: ObservableNodeWrapper, prop: string, value: any) {
  const propExists = Object.hasOwn(object[NODE_VALUE], prop);
  object[NODE_VALUE][prop] = value;
  NodeValueSet(object[NODE_VALUE], prop, !propExists, object);
}

function SetArrayValue(object: ObservableNodeWrapper, prop: string | number, value: any) {
  object[NODE_VALUE][prop] = value;
  NodeValueSet(object[NODE_VALUE], prop, false, object);
}

function NodeValueSet(obj: any, prop: string | number, added: boolean, wrapper = wrapperCache.get(obj)) {
  InvalidateSnapshotForValue(obj);
  if (!wrapper)
    return;

  const propScopeExists = !!prop && Object.hasOwn(wrapper, prop);
  if (!prop || added || !propScopeExists)
    ObservableScope.Update(wrapper[ARRAY_SCOPE] ?? wrapper[OBJECT_SCOPE])

  if (propScopeExists)
    ObservableScope.Update(wrapper[prop]);
}

function AssignNodeValue(obj: any, prop: string | number, value: any) {
  const added = !Object.hasOwn(obj, prop);
  obj[prop] = value;

  NodeValueSet(obj, prop, added);
}

function CreateProxyFactory(alias?: (value: any, reactive?: boolean) => any | undefined) {
  // Keyed children are read through their root. Every factory shares the module-level
  // snapshotState, matching wrapperCache; only the resolver differs per factory.
  // The alias ignores paths, so the root is snapshotted at the child's own path
  const resolveSnapshot: SnapshotResolver | undefined = alias && function (child, path) {
    const value = alias(child, false);
    return value === undefined ? undefined : { value, path: path.slice() };
  };

  function CreateSnapshot(value: any): any {
    return Snapshot.Get(snapshotState, value, resolveSnapshot);
  }

  const readOnly = alias !== undefined;

  function CreateArrayProxy(value: any[]) {
    const wrapper: ObservableNodeWrapper = Object.assign([] as any as ObservableNodeWrapper, {
      [NODE_VALUE]: value,
      [NODE_PROXY]: null,
      [ARRAY_SCOPE]: ObservableScope.Basic(Identity.bind(null, value))
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
          return CreateSnapshot(object[NODE_VALUE]);
        };
      case NODE_WRAPPER:
        return object;
      case NODE_VALUE:
        return object[NODE_VALUE];
      case NODE_SNAPSHOT:
        return CreateSnapshot(object[NODE_VALUE]);
      default: {
        const scope = object[ARRAY_SCOPE];
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

                InvalidateSnapshotForValue(object[NODE_VALUE])
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
      [NODE_PROXY]: null,
      [OBJECT_SCOPE]: ObservableScope.Basic(Identity.bind(null, value))
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
      case NODE_WRAPPER:
        return object;
      case NODE_SNAPSHOT:
        return CreateSnapshot(object[NODE_VALUE]);
      case toJSON:
        return function () {
          return CreateSnapshot(object[NODE_VALUE]);
        };
      case NODE_VALUE:
        return object[NODE_VALUE];
      default: {
        return GetAccessorValue(object, prop);
      }
    }
  }

  function GetAccessorValue(object: ObservableNodeWrapper, prop: any) {
    const scope = GetPropertyScope(object, prop);
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
        ObservableScope.Touch(wrapper?.[ARRAY_SCOPE]);
        return proxy as T;
      }
      default:
        return value as any;
    }
  }

  return function CreateProxy<T>(value: T, unwrapValue = true): T {
    if (unwrapValue)
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

  /**
   * Produces a plain, non-reactive version of a value by deep-cloning any observable nodes it
   * contains into plain objects/arrays. Used internally by `@Computed` to strip proxies from a
   * computed value before it is written to the store.
   *
   * Behavior depends on the input:
   * - If `value` is an observable node, returns a NEW plain deep copy (top-level identity is not
   *   preserved; nested nodes become plain objects/arrays).
   * - If `value` is a plain object/array, it is MUTATED in place — nested observable nodes are
   *   replaced with plain copies — and the SAME reference is returned (not a copy).
   * - Primitives and non-plain objects (Date, Map, Set, class instances) are passed through by
   *   reference, unchanged.
   *
   * **Dependency tracking side effect:** Cloning an observable node reads every property through
   * the proxy's getters, so any reactive scope that contains the clone call (e.g. the `@Computed`
   * getter scope) registers a dependency on each nested property. This is what lets `@Computed`
   * observe and react to modifications of nested properties, not just top-level reassignment.
   *
   * @template T The type of value to clone.
   * @param value The observable node or value containing observable nodes to convert to plain data.
   * @returns A plain, non-reactive version of the value.
   */
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
  export function Create<T>(value: T, unwrapValue = true): T {
    return DefaultCreateProxy(value, unwrapValue);
  }

  /**
   * Returns an immutable, cached snapshot of an observable node's current value (plain
   * objects/arrays, with keyed children read through their root). The same snapshot is
   * returned until a write invalidates it, and unchanged nested parts are shared between
   * snapshots, so `===` holds for any part that hasn't changed.
   * @param proxy The observable node to snapshot.
   * @returns The snapshot, or `undefined` if `proxy` is not an observable node.
   */
  export function Snapshot<T>(proxy: T): T | undefined {
    if ((proxy as any)[IS_NODE])
      return (proxy as any)[NODE_SNAPSHOT];

    return undefined;
  }

  export function Touch<T>(value: T, prop?: keyof T) {
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      const scope = prop && GetPropertyScope(wrapper, prop as string) || wrapper[ARRAY_SCOPE] || wrapper[OBJECT_SCOPE];
      ObservableScope.Touch(scope);
    }
  }

  /**
   * Merges a new value into an observable node in-place, preserving the node's object identity.
   * Computes the diff between the node's current value and the provided value, then applies only
   * the changed paths to the existing node. This is the public alternative to `ApplyDiff` for
   * cases where you want to update an observable node while keeping the same reference (so
   * downstream `===` comparisons and DOM reuse remain stable).
   *
   * Unlike assigning a property directly on an observable node (which does not generate a diff),
   * `Apply` reconciles the full value: properties present in `value` are updated, and properties
   * missing from `value` are removed from the target object.
   *
   * @param rootNode The observable node to update in-place.
   * @param value The full replacement value to merge into the node. Properties missing from this
   *              value are removed from the target object.
   * @throws If the JSON type of `value` differs from the node's current type (e.g. object → array,
   *         or a primitive root), the node's type cannot be changed.
   * @remarks No-op when `value` deep-equals the node's current value (empty diff).
   */
  export function Apply(rootNode: any, value: any) {
    const root = rootNode[NODE_VALUE];
    const diff = JsonDiff(value, root);
    ApplyDiff(rootNode, diff);
  }

  /**
   * Applies a JSON diff result to an observable node, efficiently updating only changed properties.
   * Optimizes nested object updates by computing paths incrementally and touching modified properties.
   * @param rootNode The observable node to apply the diff to.
   * @param diffResult The diff result from JsonDiff containing path-value pairs of changes.
   *   Each value is deep-cloned as it's applied (see JsonApplyDiff).
   */
  export function ApplyDiff(rootNode: any, diffResult: JsonDiffResult) {
    const root = rootNode[NODE_VALUE];
    JsonApplyDiff(root, diffResult, AssignNodeValue);
    // A root replacement is applied in place without calling AssignNodeValue
    if (diffResult.length === 1 && diffResult[0].path.length === 0)
      NodeValueSet(root, "", false, rootNode[NODE_WRAPPER]);
  }

  /**
   * Creates a factory function for making values observable with optional aliasing.
   * The alias function transforms values before creating the observable proxy,
   * useful for read-only views or value transformations.
   * @param alias Optional function to transform values before making them observable.
   * @returns A function that creates observable nodes from plain values.
   */
  export function CreateFactory(alias?: (value: any, reactive?: boolean) => any | undefined) {
    return CreateProxyFactory(alias);
  }
}
