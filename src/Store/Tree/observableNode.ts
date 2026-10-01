import { JsonDeepClone, JsonDiff, JsonDiffResult } from "../../Utils/json";
import { JsonType } from "../../Utils/json";
import { IBasicObservableScope, ObservableScope } from "./observableScope";

const NODE_VALUE = Symbol("NODE_VALUE");
const NODE_PROXY = Symbol("NODE_PROXY");
const NODE_SNAPSHOT = Symbol("NODE_SNAPSHOT");
const toJSON = "toJSON";
const IS_NODE = Symbol("IS_NODE");
const OBJECT_SCOPE = Symbol("OBJECT_SCOPE");
const ITERATOR_SCOPE = Symbol("ITERATOR_SCOPE");

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
const valueSnapshotCache = new WeakMap<any, any>();
const valueSnapshotHierarchy = new WeakMap<any, any>();

function CreateSnapshotLink(child: object, parent: object) {
  let parents = valueSnapshotHierarchy.get(child);
  if (!parents) valueSnapshotHierarchy.set(child, (parents = new Set()));
  parents.add(parent);
}

function InvalidateSnapshotForValue(value: object) {
  valueSnapshotCache.delete(value);
  const parents = valueSnapshotHierarchy.get(value);
  if (parents === undefined) return;
  valueSnapshotHierarchy.delete(value);
  for (const parent of parents)
    if (valueSnapshotCache.has(parent)) InvalidateSnapshotForValue(parent);
}

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
  ObservableScope.Touch(value[ITERATOR_SCOPE]);
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function hasArray(value: ObservableNodeWrapper, prop: string | symbol) {
  ObservableScope.Touch(value[ITERATOR_SCOPE]);
  return Object.hasOwn(value[NODE_VALUE], prop);
}

function ownKeys(value: ObservableNodeWrapper) {
  ObservableScope.Touch(value[ITERATOR_SCOPE]);
  return Object.keys(value[NODE_VALUE]);
}

function ownKeysArray(value: ObservableNodeWrapper) {
  ObservableScope.Touch(value[ITERATOR_SCOPE]);
  return Object.keys(value[NODE_VALUE]);
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
  return object[prop] ??= ObservableScope.Basic(
    Property.bind(null, object[NODE_VALUE], prop)
  );
}

function SetObjectValue(object: ObservableNodeWrapper, prop: string, value: any) {
  const propExists = Object.hasOwn(object[NODE_VALUE], prop);
  object[NODE_VALUE][prop] = value;
  InvalidateSnapshotForValue(object[NODE_VALUE]);
  ObservableScope.Update(object[prop]);
  !propExists && ObservableScope.Update(object[ITERATOR_SCOPE]);
}

function SetArrayValue(object: ObservableNodeWrapper, prop: string | number, value: any) {
  object[NODE_VALUE][prop] = value;
  InvalidateSnapshotForValue(object[NODE_VALUE]);
  ObservableScope.Update(object[OBJECT_SCOPE]);
}

function CreateProxyFactory(alias?: (value: any, reactive?: boolean) => any | undefined) {
  /**
   * An immutable snapshot of a raw node value (arrays and plain objects; other values are
   * returned as they are). A snapshot is cached per raw value in valueSnapshotCache and
   * returned as-is until a write invalidates it: every write path calls Invalidate, which
   * clears the written value and every cached ancestor, found through the parent links
   * recorded here. A rebuild makes new containers but reuses the cached snapshots of
   * unchanged children, so a snapshot handed out never changes and unchanged parts are
   * shared between snapshots. Keyed children are read through their root.
   */
  function CreateSnapshot(value: any): any {
    if (JsonType(value) === "value")
      return value;

    const cached = valueSnapshotCache.get(value);
    if (cached !== undefined)
      return cached;

    let snapshot: any;
    if (Array.isArray(value)) {
      snapshot = new Array(value.length);
      for (let x = 0; x < value.length; x++)
        snapshot[x] = ChildSnapshot(value, value[x]);
    }
    else {
      snapshot = {};
      const keys = Object.keys(value);
      for (let x = 0; x < keys.length; x++)
        snapshot[keys[x]] = ChildSnapshot(value, value[keys[x]]);
    }

    valueSnapshotCache.set(value, snapshot);
    return snapshot;
  }

  /**
   * A child's snapshot, linking the child to its parent so a write to the child
   * invalidates the parent. A keyed child's snapshot comes from its root, so the root is
   * linked too; the parent's own embedded copy stays linked because a positional write
   * (one that changes which entity a slot holds) mutates that copy in place.
   */
  function ChildSnapshot(parent: object, child: unknown) {
    if (JsonType(child) === "value")
      return child;

    CreateSnapshotLink(child as object, parent);
    const resolved = alias?.(child, false);
    if (resolved !== undefined && resolved !== child) {
      CreateSnapshotLink(resolved, parent);
      return CreateSnapshot(resolved);
    }

    return CreateSnapshot(child);
  }

  const readOnly = alias !== undefined;

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
          return CreateSnapshot(object[NODE_VALUE]);
        };
      case NODE_VALUE:
        return object[NODE_VALUE];
      case NODE_SNAPSHOT:
        return CreateSnapshot(object[NODE_VALUE]);
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
      [ITERATOR_SCOPE]: ObservableScope.Basic(Identity.bind(null, value))
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
    ObservableScope.Touch(object[OBJECT_SCOPE]);
    switch (prop) {
      case IS_NODE:
        return true;
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
        ObservableScope.Touch(wrapper?.[OBJECT_SCOPE]);
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

  /**
   * Marks an observable node or its property as changed, triggering reactive updates.
   * Used internally to notify dependencies that a value has been modified.
   * @param value The observable node to touch.
   * @param prop Optional property name or index to touch a specific nested property.
   */
  export function Update<T>(value: T, prop?: keyof T) {
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      const scope = Array.isArray(wrapper) ? wrapper[OBJECT_SCOPE] : (prop && wrapper[prop]) ?? wrapper[ITERATOR_SCOPE];
      ObservableScope.Update(scope);
    }
  }

  export function Assign<T>(value: T, prop: keyof T, propValue: any) {
    // const propExists = Object.hasOwn(value as Object, prop);
    // value[prop] = propValue;
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      if (Array.isArray(wrapper))
        SetArrayValue(wrapper, prop as string | number, propValue)
      else
        SetObjectValue(wrapper, prop as string, propValue);
    }
    else {
      InvalidateSnapshotForValue(value as Object);
      value[prop] = propValue;
    }
  }

  export function Touch<T>(value: T, prop?: keyof T) {
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      const scope = prop && GetPropertyScope(wrapper, prop as string) || wrapper[OBJECT_SCOPE];
      ObservableScope.Touch(scope);
    }
  }

  export function Read<T>(value: T, prop: keyof T) {
    const wrapper = wrapperCache.get(value);
    if (wrapper) {
      const scope = Array.isArray(wrapper) ? wrapper[OBJECT_SCOPE] : (prop && wrapper[prop]) ?? wrapper[ITERATOR_SCOPE];
      ObservableScope.Update(scope);
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
   * Splices an observable node's underlying array in-place, invalidating its snapshot and
   * touching its scope so reactive readers update.
   * @param rootNode The observable array node to splice.
   * @param start Index at which to start changing the array.
   * @param deleteCount Number of elements to remove starting at `start`.
   * @param items Elements to insert at `start`.
   * @param cloneData Whether to deep-clone `items` before inserting them (true by default,
   *   so the store isn't left holding a reference the caller can still mutate).
   */
  export function ApplySplice(rootNode: any, start: number, deleteCount: number, items: any[], cloneData = true) {
    const root = rootNode[NODE_VALUE];
    InvalidateSnapshotForValue(rootNode[NODE_VALUE]);
    const addItems = cloneData ? JsonDeepClone(items) : items;
    root.splice(start, deleteCount, ...addItems);
    ObservableNode.Update(root);
  }

  /**
   * Applies a JSON diff result to an observable node, efficiently updating only changed properties.
   * Optimizes nested object updates by computing paths incrementally and touching modified properties.
   * @param rootNode The observable node to apply the diff to.
   * @param diffResult The diff result from JsonDiff containing path-value pairs of changes.
   * @param cloneData Whether to deep-clone each diff value before writing it in (true by
   *   default), so the store isn't left holding a reference the caller can still mutate.
   */
  export function ApplyDiff(rootNode: any, diffResult: JsonDiffResult, cloneData = true) {
    const root = rootNode[NODE_VALUE];
    if (diffResult.length === 1 && diffResult[0].path.length === 0) {
      // Replacing rootNode
      InvalidateSnapshotForValue(root);
      const rootPatch = cloneData ? JsonDeepClone(diffResult[0].value) : diffResult[0].value;

      const rootType = JsonType(root);
      const rootPatchType = JsonType(rootPatch);

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

      const assignValue = pathTuples[y][1] as any;
      const assignData = cloneData ? JsonDeepClone(value) : value;
      ObservableNode.Assign(assignValue, path[y], assignData);
    }
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
