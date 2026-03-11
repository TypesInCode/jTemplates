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
 *
 * Decorator Selection Guide
 * ==========================
 *
 * | Your Value Type           | Use     | Why                           |
 * |---------------------------|---------|-------------------------------|
 * | number, string, boolean   | @Value  | Lightweight, no proxy overhead|
 * | null, undefined           | @Value  | Simple scope storage          |
 * | { nested: objects }       | @State  | Deep reactivity needed        |
 * | arrays (User[], Todo[])   | @State  | Array mutations tracked       |
 * | getters only (expensive)  | @Computed | Cached + object reuse via Store |
 * | getters only (simple)     | @Scope  | Cached, but new reference on update |
 * | getters only (async)      | @ComputedAsync | Async with caching + object reuse |
 * | subscribe to changes      | @Watch  | Calls method when scope value changes |
 * | dependency injection      | @Inject | Gets value from component injector |
 * | cleanup on destroy        | @Destroy| Calls .Destroy() on component teardown |
 *
 * @Computed vs @Scope (Both are getters only, both cache):
 * ---------------------------------------------------------
 * | Use @Computed when:                  | Use @Scope when:               |
 * | - Computation is expensive           | - Computation is cheap         |
 * | - Need object identity (===)         | - Object identity doesn't matter|
 * | - DOM reference preservation needed  | - Minimal overhead preferred   |
 * | - Array/object transformations       | - String/math operations       |
 *
 * Key Difference: Object Identity on Update
 * -----------------------------------------
 * | Aspect | @Computed | @Scope |
 * |--------|-----------|--------|
 * | Caching | ✅ Yes | ✅ Yes |
 * | Object identity preserved | ✅ Yes (ApplyDiff) | ❌ No (new object) |
 * | Overhead | Store + diff | Single scope |
 * | Best for | Complex objects | Primitives/simple values |
 *
 * Object Identity (Key Difference):
 * ---------------------------------
 * @Computed: Same object reference, in-place updates via ObservableNode.ApplyDiff
 * @Scope: New object reference on every update
 *
 * Example:
 * ```typescript
 * const list = this.items;        // Reference A
 * this.data.changed = true;       // Triggers update
 * const list2 = this.items;       // @Computed: A, @Scope: B
 * console.log(list === list2);    // @Computed: true, @Scope: false
 * ```
 */

import {
  IObservableScope,
  ObservableScope,
} from "../Store/Tree/observableScope";
import { IDestroyable } from "./utils.types";
import { ObservableNode } from "../Store/Tree/observableNode";
import { StoreAsync, StoreSync } from "../Store";
import { Injector } from "./injector";

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

const boundPrototypeMap = new WeakMap<WeakKey, ((instance: any) => void)[]>();

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

function GetBoundArrayForPrototype(prototype: WeakKey, create = true) {
  let array = boundPrototypeMap.get(prototype);
  if (create) {
    array ??= [];
    boundPrototypeMap.set(prototype, array);
  }

  return array;
}

/**
 * Retrieves the destroy array for a given prototype.
 * If the array does not exist, it creates a new one and associates it with the prototype.
 * @private
 * @param prototype The prototype for which to retrieve the destroy array.
 * @returns The array of properties to be destroyed for the prototype.
 */
function GetDestroyArrayForPrototype(prototype: WeakKey, create = true) {
  let array = destroyPrototypeMap.get(prototype);
  if (create) {
    array ??= [];
    destroyPrototypeMap.set(prototype, array);
  }

  return array;
}

function CreateComputedScope(
  getter: () => any,
  defaultValue: any,
  store: StoreSync | StoreAsync,
) {
  const getterScope = ObservableScope.Create(getter, true);

  ObservableScope.Watch(getterScope, (scope) => {
    const data = ObservableScope.Value(scope);
    store.Write(data, "root");
  });
  // ObservableScope.Init(getterScope);

  const propertyScope = ObservableScope.Create(() =>
    store.Get("root", defaultValue),
  );
  ObservableScope.OnDestroyed(propertyScope, function () {
    ObservableScope.Destroy(getterScope);
    if (store instanceof StoreAsync) store.Destroy();
  });

  return propertyScope;
}

/**
 * Computed decorator factory for creating synchronous computed properties with caching and object reuse.
 * A computed property is derived from other properties and automatically updates when its dependencies change.
 *
 * Use @Computed for expensive computations that benefit from caching AND object identity preservation
 * (filtering, sorting, aggregations, transformations of complex objects).
 *
 * @example
 * ```typescript
 * // ✅ Good: Expensive computation accessed frequently
 * @State()
 * items: TodoItem[] = [];
 *
 * @Computed([])
 * get completedItems(): TodoItem[] {
 *   // Expensive: filters entire array, cached until items change
 *   // Result object is REUSED - only changed properties are updated
 *   return this.items.filter(item => item.completed).sort(...);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // ❌ Avoid: Cheap computation - use @Scope() instead
 * @Value()
 * firstName: string = "John";
 *
 * @Value()
 * lastName: string = "Doe";
 *
 * @Computed("")  // Overhead: creates StoreSync, watch cycle, diff computation
 * get fullName(): string {
 *   return this.firstName + " " + this.lastName;  // Cheap string concat
 * }
 *
 * @Scope()  // Better: direct scope, no store overhead
 * get fullName(): string {
 *   return this.firstName + " " + this.lastName;
 * }
 * ```
 *
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 * @remarks
 * The @Computed decorator uses a two-phase caching system with diff-based updates:
 * 1. Getter scope: Computes value and writes to StoreSync when dependencies change
 * 2. StoreSync: Computes diff between old and new values
 * 3. ObservableNode.ApplyDiff: Updates the EXISTING object with only changed properties
 * 4. Property scope: Reads the updated (but same reference) value from StoreSync
 *
 * **Initialization**: @Computed uses lazy initialization - the scopes are created on first access:
 * ```typescript
 * @Computed([])
 * get completedItems(): TodoItem[] {
 *   return this.items.filter(i => i.completed);
 * }
 *
 * // Scopes created here, on first access:
 * const items = this.completedItems;
 * ```
 *
 * **Caching**: Like @Scope, @Computed caches the computed value and only re-evaluates when
 * dependencies change. The key difference is what happens during re-evaluation:
 *
 * **Key benefit - Object Reuse**: The returned object maintains its identity across updates.
 * Only the changed properties are modified in-place using ObservableNode.ApplyDiff. This enables:
 * - DOM reference preservation (no unnecessary re-renders)
 * - Existing proxy reuse (no proxy recreation overhead)
 * - Identity checks (===) remain stable across updates
 * - Efficient propagation (only changed properties trigger downstream updates)
 *
 * **Example of object reuse**:
 * ```typescript
 * const list = this.completedItems;  // Reference A
 * this.items[0].completed = true;    // Triggers re-computation
 * const list2 = this.completedItems; // Same reference A, not a new array
 * console.log(list === list2);       // true - @Computed preserves identity
 * ```
 *
 * **@Computed vs @Scope caching**:
 * | Aspect | @Computed | @Scope |
 * |--------|-----------|--------|
 * | Caches value | ✅ Yes | ✅ Yes |
 * | Re-evaluates on dep change | ✅ Yes | ✅ Yes |
 * | Object identity preserved | ✅ Yes | ❌ No |
 * | Returns new object on update | ❌ No | ✅ Yes |
 *
 * **Performance note**: 
 * - Use @Computed for expensive operations on complex objects where object reuse matters
 * - Use @Scope() for simple computations where object identity doesn't matter
 * - The diff computation overhead is justified when you need object reuse
 * @see {@link Scope} for simple getter-based reactive properties (caches but new reference)
 * @see {@link ComputedAsync} for async computed properties
 * @see {@link ObservableNode.ApplyDiff} for how diffs are applied to maintain object identity
 * @see {@link StoreSync} for sync store implementation
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
        const propertyScope = CreateComputedScope(
          getter.bind(this),
          undefined,
          new StoreSync(),
        );

        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    },
  } as PropertyDescriptor;
}

/**
 * ComputedAsync decorator factory for creating asynchronous computed properties with caching.
 * A computed property is derived from other properties and automatically updates when its dependencies change.
 *
 * Use @ComputedAsync for expensive async operations (API calls, file reads, database queries).
 *
 * @example
 * ```typescript
 * // ✅ Good: Async operation with caching
 * @Value()
 * userId: string = "123";
 *
 * @ComputedAsync(null)
 * async getUser(): Promise<User | null> {
 *   // Expensive: API call, cached until userId changes
 *   return await fetch(`/api/users/${this.userId}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // ❌ Avoid: Simple/synchronous computation - use @Computed() instead
 * @Value()
 * count: number = 0;
 *
 * @ComputedAsync(0)  // Overhead: async wrapper, StoreAsync
 * get doubled(): number {
 *   return this.count * 2;  // Sync operation
 * }
 *
 * @Computed(0)  // Better: synchronous caching
 * get doubled(): number {
 *   return this.count * 2;
 * }
 * ```
 *
 * @param defaultValue The default value to be used if the computed property is not defined.
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 * @remarks
 * The @ComputedAsync decorator uses StoreAsync for caching async results. The getter must be
 * an async function or return a Promise. While waiting for the async operation, the defaultValue
 * is returned. When the Promise resolves, the value is cached and dependent scopes update.
 *
 * **Initialization**: @ComputedAsync uses lazy initialization - the scopes are created on first access:
 * ```typescript
 * @ComputedAsync(null)
 * async getUser(): Promise<User> {
 *   return fetch('/api/user');
 * }
 *
 * // Scopes created here, on first access:
 * const user = await this.getUser;
 * ```
 *
 * **Caching**: Like @Computed, @ComputedAsync caches the result and maintains object identity
 * through diff-based updates. The async getter only runs when dependencies change.
 *
 * **Object Reuse**: Like @Computed, the resolved value maintains its identity across updates.
 * Only changed properties are modified in-place, preserving object references.
 *
 * **Important**: Only use this for truly async operations. For sync computations, use @Computed()
 * which has less overhead and provides synchronous values.
 *
 * **Comparison**:
 * | Aspect | @Scope | @Computed | @ComputedAsync |
 * |--------|--------|-----------|----------------|
 * | Caches value | ✅ Yes | ✅ Yes | ✅ Yes |
 * | Sync/Async | Sync | Sync | Async |
 * | Object identity | ❌ New reference | ✅ Same reference | ✅ Same reference |
 * | Best for | Simple sync values | Complex sync values | Async operations |
 *
 * **Error handling**: If the async getter throws, the error is stored in the StoreAsync.
 * You can handle errors in the getter itself or by watching for changes and checking the value.
 *
 * @see {@link Computed} for synchronous computed properties with object reuse
 * @see {@link Scope} for simple getter-based reactive properties (caches, new reference)
 * @see {@link StoreAsync} for async store implementation
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
        const propertyScope = CreateComputedScope(
          getter.bind(this),
          defaultValue,
          new StoreAsync(),
        );
        scopeMap[propertyKey] = [propertyScope, undefined];
      }

      return ObservableScope.Value(scopeMap[propertyKey][0]);
    },
  } as PropertyDescriptor;
}

/**
 * State decorator factory for creating reactive properties backed by ObservableNode proxies.
 *
 * Use this decorator for complex data structures (objects, arrays) that need deep reactivity.
 *
 * @example
 * ```typescript
 * // ✅ Good: Complex objects/arrays
 * @State()
 * user: { name: string; email: string } = { name: "", email: "" };
 *
 * @State()
 * items: TodoItem[] = [];
 * ```
 *
 * @example
 * ```typescript
 * // ❌ Avoid: Simple primitives - use @Value() instead for better performance
 * @State()
 * count: number = 0;  // Overhead: creates proxy, leaf scopes, caches
 *
 * @Value()
 * count: number = 0;  // Better: simple scope with direct value storage
 * ```
 *
 * @returns A property decorator that can be applied to a property.
 * @remarks
 * The @State decorator wraps the value in an ObservableNode proxy, enabling:
 * - Deep reactivity for nested properties and array mutations
 * - Automatic proxy creation for all nested objects/arrays
 * - Fine-grained per-property dependency tracking
 *
 * **Initialization**: @State uses lazy initialization - the proxy is created on first access,
 * not at construction time. This means:
 * ```typescript
 * @State()
 * data: { items: string[] } = { items: [] };
 *
 * // Proxy created here, on first access:
 * console.log(this.data.items);
 * ```
 *
 * **Performance note**: This overhead is beneficial for complex structures but wasteful for primitives.
 * Use @Value() for simple types (number, string, boolean) that don't need deep reactivity.
 *
 * **Default value handling**: The value from the class field initializer is used on first access.
 * If no initializer is provided, the initial value is `{ root: undefined }`.
 * ```typescript
 * @State()
 * data: { items: string[] };  // Initial value: { root: undefined }
 *
 * @State()
 * data2: { items: string[] } = { items: [] };  // Initial value: { root: { items: [] } }
 * ```
 * @see {@link Value} for simple primitive values
 * @see {@link Computed} for derived/read-only values
 * @see {@link ObservableNode} for the proxy-based reactivity system
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
 * Value decorator factory for creating reactive properties backed by ObservableScope.
 *
 * Use this decorator for simple primitive values (number, string, boolean, null, undefined).
 *
 * @example
 * ```typescript
 * // ✅ Good: Simple primitives
 * @Value()
 * count: number = 0;
 *
 * @Value()
 * isLoading: boolean = false;
 *
 * @Value()
 * title: string = "My App";
 * ```
 *
 * @example
 * ```typescript
 * // ❌ Avoid: Complex objects/arrays - use @State() instead for deep reactivity
 * @Value()
 * user: { name: string } = { name: "" };  // Nested changes won't trigger updates
 *
 * @State()
 * user: { name: string } = { name: "" };  // Better: nested changes are tracked
 * ```
 *
 * @returns A property decorator that can be applied to a property.
 * @remarks
 * The @Value decorator creates a lightweight ObservableScope to store the value.
 * This is more efficient than @State() for primitives because it:
 * - Avoids proxy creation overhead
 * - Uses direct value comparison instead of deep diffing
 * - Stores the value directly without nested scope caches
 *
 * **Initialization**: @Value uses lazy initialization - the scope is created on first access:
 * ```typescript
 * @Value()
 * count: number = 0;
 *
 * // Scope created here, on first access:
 * console.log(this.count);
 * ```
 *
 * **Limitation**: Only top-level changes trigger updates. Nested object/array mutations
 * will not be detected. Use @State() for complex structures.
 *
 * **Default value handling**: The value from the class field initializer is used on first access.
 * If no initializer is provided, the initial value is `undefined`.
 * ```typescript
 * @Value()
 * count: number;  // Initial value: undefined
 *
 * @Value()
 * count2: number = 0;  // Initial value: 0
 * ```
 * @see {@link State} for complex objects/arrays needing deep reactivity
 * @see {@link Computed} for derived/read-only values
 * @see {@link ObservableScope} for the scope-based reactivity system
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
  return ObservableScope.Create(
    function () {
      return tuple[1];
    },
    false,
    true,
  );
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
 * Scope decorator factory for creating reactive getter properties without caching overhead.
 * A scope property is derived from other properties and automatically updates when its dependencies change.
 *
 * Use @Scope for simple, cheap computations where object identity preservation isn't needed.
 *
 * @example
 * ```typescript
 * // ✅ Good: Simple, cheap computation
 * @Value()
 * firstName: string = "John";
 *
 * @Value()
 * lastName: string = "Doe";
 *
 * @Scope()
 * get fullName(): string {
 *   // Cheap: string concatenation, no caching overhead
 *   return this.firstName + " " + this.lastName;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // ❌ Avoid: Expensive computation - use @Computed() instead
 * @State()
 * items: TodoItem[] = [];
 *
 * @Scope()  // New array object on every update, no caching
 * get completedItems(): TodoItem[] {
 *   return this.items.filter(item => item.completed).sort(...);
 * }
 *
 * @Computed([])  // Better: cached + object reuse via StoreSync
 * get completedItems(): TodoItem[] {
 *   return this.items.filter(item => item.completed).sort(...);
 * }
 * ```
 *
 * @returns A property decorator that can be applied to a getter method.
 * @throws Will throw an error if the property is not a getter or if it has a setter.
 * @remarks
 * The @Scope decorator creates a lightweight ObservableScope directly from the getter.
 * Like @Computed, it caches the computed value and only re-evaluates when dependencies change.
 * The key difference is that @Scope returns a NEW object reference on each re-evaluation.
 *
 * **Initialization**: @Scope uses lazy initialization - the scope is created on first access:
 * ```typescript
 * @Scope()
 * get displayName(): string {
 *   return this.firstName + " " + this.lastName;
 * }
 *
 * // Scope created here, on first access:
 * console.log(this.displayName);
 * ```
 *
 * **Caching**: @Scope caches the computed value just like @Computed. The getter only runs
 * when dependencies change, not on every access. However, each re-evaluation produces
 * a new object reference.
 *
 * **Key difference from @Computed**: When dependencies change, @Scope returns a NEW object
 * reference, while @Computed updates the EXISTING object in-place using diff-based updates.
 *
 * **Example of caching (shared with @Computed)**:
 * ```typescript
 * const result1 = this.fullName;  // Computes: "John Doe"
 * const result2 = this.fullName;  // Cached: "John Doe" (same value)
 * this.firstName = "Jane";        // Triggers re-computation
 * const result3 = this.fullName;  // Computes: "Jane Doe" (new value)
 * ```
 *
 * **Example of no object reuse (differs from @Computed)**:
 * ```typescript
 * const list = this.completedItems;  // Reference A
 * this.items[0].completed = true;    // Triggers re-computation
 * const list2 = this.completedItems; // NEW reference B
 * console.log(list === list2);       // false - @Scope creates new object
 * ```
 *
 * **When to use @Scope**:
 * - Computation is cheap (string ops, simple math, primitive values)
 * - Object identity doesn't matter (primitives, one-time use values)
 * - Memory overhead should be minimal
 * - You don't need to preserve DOM references
 *
 * **Use @Computed instead when**:
 * - Computation is expensive (array transformations, complex calculations)
 * - Value is accessed frequently without dependency changes
 * - Object identity matters (array/object references used in templates)
 * - You need DOM reference preservation to avoid re-renders
 *
 * **Performance comparison**:
 * | Aspect | @Scope | @Computed |
 * |--------|--------|-----------|
 * | Caches value | ✅ Yes | ✅ Yes |
 * | Re-evaluates on dep change | ✅ Yes | ✅ Yes |
 * | Object identity | ❌ New reference | ✅ Same reference |
 * | Overhead | Minimal (single scope) | Higher (Store + diff) |
 * | Best for | Primitives, cheap ops | Complex objects, expensive ops |
 *
 * @see {@link Computed} for cached computed properties with object reuse
 * @see {@link ComputedAsync} for async computed properties
 * @see {@link ObservableNode.ApplyDiff} for how @Computed maintains object identity
 * @see {@link ObservableScope} for the scope-based reactivity system
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
 * Watch decorator factory for subscribing to observable changes and invoking a handler method.
 * The watched value is computed from a function that accesses reactive properties, and the
 * decorated method is called whenever that value changes.
 *
 * Use @Watch to react to changes in computed values or state without manual subscription management.
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @Value()
 *   count: number = 0;
 *
 *   @Watch((self) => self.count * 2)
 *   handleDoubled(value: number) {
 *     console.log('Doubled count:', value);  // Called whenever count changes
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @State()
 *   user: { name: string; email: string } = { name: "", email: "" };
 *
 *   @Watch((self) => self.user.name)
 *   onUserNameChanged(newName: string) {
 *     // Called when user.name changes
 *     this.saveToAnalytics(newName);
 *   }
 * }
 * ```
 *
 * @param scope A function that takes the component instance and returns the value to watch.
 *              The function should access reactive properties (@State, @Value, @Scope, @Computed).
 * @returns A method decorator that subscribes to the watched value and invokes the method on changes.
 * @throws Will throw an error if the decorated member is not a method.
 *
 * @remarks
 * The @Watch decorator provides:
 * - **Automatic subscription**: No manual ObservableScope.Watch() calls needed
 * - **Immediate invocation**: The handler is called immediately with the initial value
 * - **Cleanup on destroy**: Subscriptions are automatically removed when the component is destroyed
 * - **Batched updates**: Uses greedy scopes to batch rapid changes efficiently
 *
 * **Lifecycle**: The watch subscription is established when the component's Bound() method is called,
 * which happens after the component is constructed and attached to the DOM.
 *
 * **Performance**: Watched scopes are greedy (batched via microtask queue), so rapid changes
 * to the watched value will only trigger one handler invocation.
 *
 * @see {@link Bound} for when the watch subscription is established
 * @see {@link Destroy} for automatic cleanup on component teardown
 * @see {@link Scope} for creating computed values to watch
 */
export function Watch<
  S extends (instance: T) => any,
  T extends Record<K, (value: ReturnType<S>) => any>,
  K extends string,
 >(scope: S) {
  return function (target: T, propertyKey: K, descriptor: PropertyDescriptor) {
    return WatchDecorator<T, K>(target, propertyKey, descriptor, scope);
  };
}

function WatchDecorator<T, K extends string>(
  target: T,
  propertyKey: K,
  descriptor: PropertyDescriptor,
  scopeFunction: (instance: any) => any,
) {
  if (!descriptor || typeof descriptor.value !== "function")
    throw "Watch decorator requires a function";

  function bindWatch(instance: T) {
    function scopeFunctionWrapper() {
      return scopeFunction(instance);
    }

    const scope = ObservableScope.Create(scopeFunctionWrapper, true);
    const propertyMap = GetScopeMapForInstance(this);
    propertyMap[propertyKey as string] = [scope, undefined];
    ObservableScope.Watch(scope, function (scope) {
      (instance as any)[propertyKey](ObservableScope.Value(scope));
    });

    (instance as any)[propertyKey](ObservableScope.Value(scope));
    return instance;
  }

  const boundArray = GetBoundArrayForPrototype(target as WeakKey);
  boundArray.push(bindWatch);
}

type ConstructorToken<I> =
  | {
      new (...args: any[]): I;
    }
  | (abstract new (...args: any[]) => I);

/**
 * Inject decorator factory for dependency injection from the component's injector.
 * Properties decorated with @Inject are lazily resolved from the component's Injector
 * on first access, enabling loose coupling and testability.
 *
 * Use @Inject to access services, other components, or shared resources without direct instantiation.
 *
 * @example
 * ```typescript
 * // Basic injection
 * class MyComponent extends Component {
 *   @Inject(LoggerService)
 *   logger: LoggerService;
 *
 *   doWork() {
 *     this.logger.log('Working...');  // Resolved from injector on first access
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Injection with default value (fallback if not in injector)
 * class MyComponent extends Component {
 *   @Inject(ConfigService)
 *   config: ConfigService = new ConfigService({});  // Default if not injected
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Setting injected values programmatically
 * class MyComponent extends Component {
 *   @Inject(ApiService)
 *   api: ApiService;
 *
 *   constructor() {
 *     super();
 *     // Override injection for testing
 *     this.Injector.Set(ApiService, mockApiService);
 *   }
 * }
 * ```
 *
 * @param type The constructor type (or token) of the dependency to inject.
 *             Used as the key to look up the dependency in the injector.
 * @returns A property decorator that can be applied to a property.
 *
 * @remarks
 * The @Inject decorator provides:
 * - **Lazy resolution**: Dependency is resolved on first access, not at construction
 * - **Read-write access**: Both getter and setter are provided
 * - **Injector hierarchy**: Resolves through parent injectors if not found locally
 * - **Testability**: Easy to mock by setting values in the injector
 *
 * **Resolution flow**:
 * 1. Access property → calls Injector.Get(type)
 * 2. If found in current injector, return the value
 * 3. If not found, traverse up parent injectors
 * 4. If still not found, returns undefined (use default value if provided)
 *
 * **Setting values**: You can also set injected values directly:
 * ```typescript
 * this.Injector.Set(ApiService, customService);
 * // Now @Inject(ApiService) will return customService
 * ```
 *
 * **Lifecycle**: The injector is set up during component construction. Injected values
 * can be accessed anytime after construction, but typically in lifecycle methods like Bound().
 *
 * @see {@link Injector} for the dependency injection system
 * @see {@link Component.Injector} for accessing the component's injector
 */
export function Inject<
  I,
  T extends Record<K, I> & { Injector: Injector },
  K extends string,
>(type: ConstructorToken<I>) {
  return function () {
    return InjectDecorator<I, T>(type);
  } as (target: T, propertyKey: K, descriptor?: PropertyDescriptor) => void;
}

function InjectDecorator<I, T extends { Injector: Injector }>(
  type: ConstructorToken<I>,
): any {
  return {
    configurable: false,
    enumerable: true,
    get: function (this: T) {
      return this.Injector.Get(type);
    },
    set: function (this: T, val: any) {
      this.Injector.Set(type, val);
    },
  };
}

/**
 * Destroy decorator factory for marking properties that need cleanup on component teardown.
 * Properties decorated with @Destroy will have their .Destroy() method automatically called
 * when the component is destroyed, preventing memory leaks and resource leaks.
 *
 * Use @Destroy for managing disposable resources like timers, subscriptions, event listeners,
 * or any object with a cleanup method.
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @Destroy()
 *   timer: Timer = new Timer();
 *
 *   startCountdown() {
 *     this.timer.start(1000);  // Automatically stopped when component destroys
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @Destroy()
 *   subscription: Subscription = someObservable.subscribe(...);
 *
 *   // No manual unsubscribe needed - handled automatically
 * }
 * ```
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @Destroy()
 *   eventListener: EventListener = new EventListener();
 *
 *   bound() {
 *     document.addEventListener('click', this.eventListener);
 *   }
 *   // Automatically cleaned up when component is destroyed
 * }
 * ```
 *
 * @returns A property decorator that marks the property for automatic cleanup.
 *
 * @remarks
 * The @Destroy decorator provides:
 * - **Automatic cleanup**: Calls .Destroy() on the property when component is destroyed
 * - **Null-safe**: Does nothing if the property is undefined/null
 * - **Ordered cleanup**: Runs after observable scopes are destroyed
 *
 * **Requirements**: The decorated property must:
 * 1. Be an object with a .Destroy() method
 * 2. Have the method be callable with no arguments
 * 3. Be assigned before component destruction
 *
 * **Lifecycle timing**:
 * ```typescript
 * component.Destroy() calls:
 * 1. ObservableScope.DestroyAll() - Cleanup reactive scopes
 * 2. Destroy.All() - Calls .Destroy() on all @Destroy()-marked properties
 * ```
 *
 * **Common use cases**:
 * - Timers and intervals
 * - Observable subscriptions
 * - Event listeners
 * - WebSocket connections
 * - File handles (Node.js)
 * - Canvas contexts
 *
 * **What happens if .Destroy() throws?**: Errors are not caught - ensure your
 * .Destroy() methods are robust and handle edge cases gracefully.
 *
 * @see {@link Destroy.All} for the cleanup implementation
 * @see {@link Component.Destroy} for component lifecycle
 */
export function Destroy() {
  return DestroyDecorator;
}

/**
 * Bound namespace provides lifecycle hooks for component initialization.
 * Methods in this namespace are called after a component is attached to the DOM.
 */
export namespace Bound {
  /**
   * Binds all @Watch-decorated methods on a component instance.
   * Called automatically by Component.Bound() after the component is attached to the DOM.
   *
   * @param value The component instance to bind.
   *
   * @example
   * ```typescript
   * class MyComponent extends Component {
   *   // Bound.All(this) is called automatically in Component.Bound()
   *   public Bound() {
   *     super.Bound();  // This calls Bound.All(this)
   *     // Now @Watch handlers are active
   *   }
   * }
   * ```
   *
   * @remarks
   * This method:
   * - Finds all @Watch-decorated methods on the component's prototype chain
   * - Invokes the binding function for each @Watch decorator
   * - Establishes watch subscriptions for all decorated methods
   *
   * **Timing**: Called after component construction and DOM attachment, but before
   * any user-defined Bound() logic runs (if you override Bound()).
   *
   * **Idempotent**: Safe to call multiple times - @Watch bindings are set up once.
   */
  export function All<T extends WeakKey>(value: T) {
    const array = GetBoundArrayForPrototype(
      Object.getPrototypeOf(value),
      false,
    );
    for (let x = 0; array && x < array.length; x++) array[x](value);
  }
}

/**
 * Destroy namespace provides cleanup utilities for component teardown.
 * Methods in this namespace are called when a component is destroyed to prevent memory leaks.
 */
export namespace Destroy {
  /**
   * Destroys all observable scopes and invokes .Destroy() on all @Destroy()-marked properties.
   * Called automatically by Component.Destroy() during component teardown.
   *
   * @param value The component instance to destroy.
   *
   * @example
   * ```typescript
   * class MyComponent extends Component {
   *   @Destroy()
   *   timer: Timer = new Timer();
   *
 *   // Destroy.All(this) is called automatically in Component.Destroy()
 *   public Destroy() {
 *     super.Destroy();  // This calls Destroy.All(this)
 *     // timer.Destroy() has been called, scopes are destroyed
 *   }
 * }
 * ```
 *
 * @remarks
 * This method performs cleanup in the following order:
 * 1. **ObservableScope.DestroyAll()**: Destroys all scopes created by @Value, @Scope, @Computed
 * 2. **@Destroy cleanup**: Calls .Destroy() on each property marked with @Destroy()
 *
 * **Timing**: Called during component destruction, after unbinding from the DOM but before
 * the component is fully garbage collected.
 *
 * **Idempotent**: Safe to call multiple times - destroyed scopes are marked and ignored.
 *
 * **Error handling**: If any .Destroy() method throws, the error propagates. Ensure your
 * cleanup methods are robust and handle edge cases gracefully.
 *
 * **What gets destroyed**:
 * - All @Value-decorated property scopes
 * - All @Scope-decorated property scopes
 * - All @Computed-decorated property scopes (both getter and property scopes)
 * - All @ComputedAsync-decorated property scopes (including StoreAsync)
 * - All @Destroy-marked properties (calls .Destroy() method)
 * - All @Watch subscriptions (via scope destruction)
 *
 * @see {@link Bound.All} for initialization counterpart
 * @see {@link Component.Destroy} for component lifecycle
 */
  export function All<T extends WeakKey>(value: T) {
    const scopeMap = scopeInstanceMap.get(value);
    if (scopeMap !== undefined) {
      const values = Object.values(scopeMap);
      for (let x = 0; x < values.length; x++)
        ObservableScope.Destroy(values[x][0]);
    }

    const array = GetDestroyArrayForPrototype(
      Object.getPrototypeOf(value),
      false,
    );
    for (let x = 0; array && x < array.length; x++)
      (value as any)[array[x]].Destroy();
  }
}

function DestroyDecorator<T extends Record<K, IDestroyable>, K extends string>(
  target: T,
  propertyKey: K,
): any {
  const array = GetDestroyArrayForPrototype(target);
  array.push(propertyKey);
}
