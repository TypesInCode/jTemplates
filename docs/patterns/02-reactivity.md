# Reactivity

## Overview

j-templates uses a fine-grained reactive system built on `ObservableScope` and `ObservableNode`. Property-level change detection replaces component-level re-rendering — only the DOM nodes that depend on changed state are updated. The decorator layer (`@Value`, `@State`, `@Scope`, `@Computed`, `@ComputedAsync`, `@Watch`) provides ergonomic access to these primitives inside components.

## Primitives

### ObservableScope

A signal-like reactive primitive that tracks dependencies automatically during evaluation and notifies subscribers when values change.

```typescript
import { ObservableScope } from "j-templates/Store";
```

| Method | Signature | Description |
|---|---|---|
| `Create` | `<T>(fn: () => T \| Promise<T>, greedy?: boolean, force?: boolean): IObservableScope<T>` | Create a scope from a function. Returns static scope if no dependencies detected, dynamic otherwise. |
| `Value` | `<T>(scope: IObservableScope<T>): T` | Read the current value **and** register as a dependency. |
| `Peek` | `<T>(scope: IObservableScope<T>): T` | Read the current value **without** registering as a dependency. |
| `Watch` | `<T>(scope: IObservableScope<T>, callback: (scope: IObservableScope<T>) => void): void` | Subscribe to value changes. |
| `Unwatch` | `<T>(scope: IObservableScope<T>, callback: (scope: IObservableScope<T>) => void): void` | Unsubscribe. |
| `Touch` | `<T>(scope: IObservableScope<T>): void` | Register as a dependency without reading the value. |
| `Update` | `(scope: IObservableScope<any>): void` | Mark a scope as dirty, triggering recomputation. |
| `Register` | `(emitter: Emitter): void` | Register a raw emitter as a dependency in the current watch context. |
| `OnDestroyed` | `(scope: IObservableScope<unknown>, callback: () => void): void` | Register a callback for when the scope is destroyed. |
| `Destroy` | `(scope: IObservableScope<unknown>): void` | Destroy a scope and clean up its resources. |
| `DestroyAll` | `(scopes: IObservableScope<unknown>[]): void` | Destroy multiple scopes. |

**Dependency tracking** uses a global watch-state stack. When a scope's getter runs, every call to `ObservableScope.Value` or `ObservableScope.Register` from within that getter registers the caller as a subscriber.

**Greedy scopes** batch updates via `queueMicrotask`. Non-greedy scopes emit immediately. Async scopes are automatically greedy.

**Async limitation:** Dependencies are only captured synchronously. Any reactive reads after an `await` will not be tracked as dependencies. Read all reactive values before the first `await`.

```typescript
const scope = ObservableScope.Create(() => counter.value * 2);

// Read and subscribe
const value = ObservableScope.Value(scope);

// Read without subscribing
const peeked = ObservableScope.Peek(scope);

// Subscribe manually
ObservableScope.Watch(scope, (s) => {
  console.log("changed:", ObservableScope.Value(s));
});
```

### ObservableNode

Proxy-based deep reactivity for objects and arrays. Each property access creates a leaf `ObservableScope`, enabling property-level change detection without whole-object re-evaluation.

```typescript
import { ObservableNode } from "j-templates/Store";
```

| Method | Signature | Description |
|---|---|---|
| `Create` | `<T>(value: T): T` | Wrap a plain value in a reactive proxy. |
| `Unwrap` | `<T>(value: T): T` | Recursively unwrap proxies to raw values. |
| `Touch` | `<T>(value: T, prop?: string \| number): void` | Manually trigger an update on a node or specific property. |
| `ApplyDiff` | `(rootNode: any, diffResult: JsonDiffResult): void` | Apply a JSON diff to an observable node, preserving object identity. |
| `CreateFactory` | `(alias?: (value: any) => any \| undefined): (value: T) => T` | Create a factory with optional alias/transform function. |

**Object proxies** intercept `get` and `set`. Reading a property creates (or returns) a cached leaf `ObservableScope`; writing a property updates the leaf and triggers `ObservableScope.Update`.

**Array proxies** intercept mutation methods (`push`, `splice`, `pop`, `shift`, `unshift`, `sort`, `reverse`). These apply to a proxied copy and sync back, triggering a single `ObservableScope.Update` on the array scope.

```typescript
const user = ObservableNode.Create({ name: "Alice", age: 30 });

user.name = "Bob"; // Triggers leaf scope update

const raw = ObservableNode.Unwrap(user); // { name: "Bob", age: 30 }
```

### calc

Memoized computed gatekeeper. Only re-emits when the derived value changes by `===` comparison. Reuses scopes by ID across evaluations.

```typescript
import { calc } from "j-templates";
```

```typescript
calc<T>(callback: () => T, idOverride?: string): T
```

`calc` **only works inside a watch context** (during another scope's evaluation). It is **not** required for array reactivity — `@State` arrays work without it. Use it when a parent scope changes frequently but a derived value often stays the same.

```typescript
// Without calc — always re-emits
tbody({ data: () => this.Data.items }, (item) => tr(...));

// With calc — re-emits only when the array reference changes
tbody({ data: () => calc(() => this.Data.items) }, (item) => tr(...));
```

### peek

Memoized computed scope that does **not** register as a dependency with the parent. Use this to read reactive data without subscribing to changes.

```typescript
import { peek } from "j-templates";
```

```typescript
peek<T>(callback: () => T, idOverride?: string): T
```

`peek` **only works inside a watch context** (during another scope's evaluation). Unlike `calc`, the scope created by `peek` does not register as a dependency — changes to the data accessed within the callback will not trigger recomputation of the parent scope. The scope is still memoized by ID within the watch context to avoid redundant computation.

```typescript
// Read reactive data without subscribing
const timestamp = peek(() => Date.now());

// Useful for reading values that should not drive parent updates
const id = peek(() => this.Data.id, "id");
```

## Decorators

Decorators provide ergonomic access to the reactive primitives inside `Component` classes. They are initialized lazily on first access and cleaned up automatically by `Destroy.All()`.

| Decorator | Target | Backed by | Description |
|---|---|---|---|
| `@Value()` | Property | `ObservableScope` | Reactive primitive (number, string, boolean). Setter triggers `Update`. |
| `@State()` | Property | `ObservableNode` | Deep reactive object/array via proxy. Nested mutations tracked. |
| `@Scope()` | Getter | `ObservableScope` | Cached computed value. Returns **new** reference on update. |
| `@Computed()` | Getter | `StoreSync` + `ApplyDiff` | Cached computed with **identity preservation**. Returns **same** reference on update. |
| `@ComputedAsync(default)` | Getter | `StoreAsync` + `ApplyDiff` | Like `@Computed`, but diff computation runs asynchronously. |
| `@Watch(fn)` | Method | `ObservableScope.Watch` | Subscribe a method to reactive value changes. |

### @Value — Primitive reactive property

```typescript
class Counter extends Component {
  @Value() count = 0;

  Template() {
    return div({}, () => [
      button({ on: { click: () => this.count-- } }, () => "-"),
      div({}, () => this.count),
      button({ on: { click: () => this.count++ } }, () => "+"),
    ]);
  }
}
```

How it works:
1. Replaces the property with a getter/setter pair.
2. Getter lazily creates an `ObservableScope` and returns `ObservableScope.Value`.
3. Setter calls `ObservableScope.Update` on the scope.

### @State — Deep reactive property

```typescript
class TodoList extends Component {
  @State() items: string[] = [];

  addItem(text: string) {
    this.items.push(text); // Triggers reactive update
  }

  removeItem(index: number) {
    this.items.splice(index, 1); // Also tracked
  }
}
```

How it works:
1. Replaces the property with a getter/setter pair.
2. Getter lazily creates an `ObservableNode` proxy wrapping `{ root: value }` and returns the root value.
3. Setter updates the root value in the `ObservableNode`.
4. Proxy interceptors track property-level reads and mutations.

### @Scope — Computed getter (new reference on change)

Best for cheap computations that return primitives or new arrays.

```typescript
class Stats extends Component {
  @Value() count = 0;

  @Scope()
  get doubled() { return this.count * 2; }
}
```

How it works:
1. Replaces the getter with an `ObservableScope.Create(getter)` backed accessor.
2. Automatically tracks dependencies accessed in the getter.
3. Returns a **new** reference on each recomputation.

### @Computed — Computed getter (identity preservation)

Best for expensive computations or when downstream consumers need stable object references. Uses `StoreSync` + `ApplyDiff` so the same object is mutated in-place when the structure hasn't changed.

```typescript
class TodoApp extends Component {
  @State() items: Todo[] = [];

  @Computed()
  get completedItems(): Todo[] {
    return this.items.filter(t => t.done);
  }
}
```

How it works:
1. Creates a **getter scope** that evaluates the user's getter.
2. When dependencies change, the getter result is written to a `StoreSync` via `Write`.
3. A **property scope** reads from the `StoreSync`, which applies a diff (`ApplyDiff`) to the existing object.
4. Downstream consumers receive the **same object reference** when the structure is unchanged.

**Note:** Unlike the old docs suggested, `@Computed()` does **not** take a `defaultValue` parameter. The type is inferred from the getter's return type.

### @ComputedAsync — Asynchronous computed

Like `@Computed`, but uses `StoreAsync` so diff computation runs off the main thread. **Requires** a default value parameter. The getter itself is synchronous — the "Async" refers only to the internal store backend.

```typescript
class Dashboard extends Component {
  @ComputedAsync([])
  get activityData(): ActivityRow[] {
    return this.dataService.GetActivityData();
  }
}
```

How it works:
1. Creates a getter scope and a `StoreAsync` instance.
2. On dependency change, `store.Write(data, "root")` is queued asynchronously.
3. A property scope reads from the store with `store.Get("root", defaultValue)`.
4. Object identity is preserved via `ApplyDiff`, same as `@Computed`.

### @Watch — React to value changes

Subscribe a method to changes in a reactive value. The function receives the component instance and returns the value to watch. The decorated method receives the new value as its argument. The handler is called **immediately** with the current value when the component is bound.

```typescript
class NumberCard extends Component<{ title: string; value: number }> {
  @Value() cardValue = 0;

  @Destroy()
  animateCardValue = new Animation(AnimationType.Linear, 500, (next) => {
    this.cardValue = Math.floor(next);
  });

  @Watch((self) => self.Data.value)
  setCardValue(value: number) {
    this.animateCardValue.Animate(this.cardValue, value);
  }
}
```

How it works:
1. A `bindWatch` function is stored on the prototype's bound array.
2. When `Bound.All()` is called (from `Component.Bound()`), each `@Watch` binding is activated.
3. An `ObservableScope` is created from `(instance) => scopeFunction(instance)`.
4. The scope is watched; on change, the decorated method is called with the new value.
5. The method is also called immediately with the current value.
6. The scope is stored for cleanup in `Destroy.All()`.

### @Scope vs @Computed

| | `@Scope` | `@Computed` |
|---|---|---|
| Backend | Single `ObservableScope` | `ObservableScope` → `StoreSync` → `ObservableScope` |
| Object identity | New reference on change | Same reference when structure unchanged |
| Best for | Primitives, cheap arrays, new-object returns | Expensive arrays, object reuse, DOM recycling |
| Overhead | Low | Higher (diff computation) |

## Stores

### StoreSync

Synchronous data store with diff-based updates. When a `keyFunc` is provided, objects with the same key share the same instance (object identity sharing).

```typescript
import { StoreSync } from "j-templates/Store";

const store = new StoreSync((value) => value.id);
```

| Method | Signature | Description |
|---|---|---|
| `Write` | `(data: unknown, key?: string): void` | Write data, computing a diff against current state and applying it reactively. |
| `Patch` | `(key: string, patch: unknown): void` | Deep merge a patch into existing data at the given key. |
| `Push` | `(key: string, ...data: unknown[]): void` | Push items into the array stored at the given key. |
| `Splice` | `(key: string, start: number, deleteCount?: number, ...items: unknown[]): any[]` | Splice the array at the given key. Returns deep-cloned deleted elements. |
| `Get` | `<O>(id: string): O \| undefined` | Retrieve observable data by key. |
| `Get` | `<O>(id: string, defaultValue: O): O` | Retrieve data, or `defaultValue` if key not found. |

```typescript
const store = new StoreSync((value) => value.id);

store.Write({ id: "1", name: "Alice" });
store.Patch("1", { name: "Bob" });
store.Push("1", "tags", "admin");
const user = store.Get<User>("1");
```

### StoreAsync

Asynchronous variant of `StoreSync`. All mutations return `Promise<void>`. Diff computation runs in a Web Worker to keep the main thread free. `Get` remains synchronous.

```typescript
import { StoreAsync } from "j-templates/Store";

const store = new StoreAsync((value) => value.id);
await store.Write({ id: "1", name: "Alice" });
store.Destroy(); // Stops the async queue
```

### Object sharing

When a `keyFunc` is provided to `StoreSync` or `StoreAsync`, objects that share the same key value are reconciled to a single instance:

```typescript
const store = new StoreSync((value) => value.id);

store.Write({ id: "1", name: "Alice" });
store.Write({ id: "1", name: "Alice", age: 30 }); // Same id — same object, diffed

// After both writes, the object at "1" is the same instance
// with { name: "Alice", age: 30 }
```

This also works for nested objects if they have their own key identifiers in the data structure.

## Manual scope management

For advanced cases outside of components, you can create and manage scopes directly:

```typescript
import { ObservableScope } from "j-templates/Store";

// Create a scope
const scope = ObservableScope.Create(() => someValue * 2, true); // greedy

// Read reactively
const value = ObservableScope.Value(scope);

// Read without subscribing
const peeked = ObservableScope.Peek(scope);

// Subscribe to changes
ObservableScope.Watch(scope, (s) => {
  console.log(ObservableScope.Value(s));
});

// Manually invalidate
ObservableScope.Update(scope);

// Clean up
ObservableScope.Destroy(scope);
ObservableScope.OnDestroyed(scope, () => console.log("destroyed"));
```

## Best Practices

- **Use `@Value` for primitives.** It creates a lightweight `ObservableScope` — lower overhead than `@State`.
- **Use `@State` for objects and arrays.** Proxy-based deep tracking handles nested mutations automatically.
- **Use `@Scope` for cheap computed values.** Returns a new reference, which is fine for primitives and small arrays.
- **Use `@Computed` for expensive or reference-sensitive computed values.** Preserves object identity via diff, which prevents unnecessary downstream re-renders.
- **Use `calc` selectively.** Only when a parent scope changes frequently but a derived value often stays the same. Not needed for basic array reactivity.
- **Always clean up scopes.** Inside components, `Destroy()` handles this automatically. Outside components, call `ObservableScope.Destroy()` or `ObservableScope.DestroyAll()`.
- **Use `Peek` for non-reactive reads.** When you need a value without creating a dependency.
- **Use `StoreSync`/`StoreAsync` for shared data.** Key functions enable object sharing and efficient diff-based updates.
- **Define key functions for stores.** `new StoreSync((value) => value.id)` enables identity tracking.

## Source

- `src/Store/Tree/observableScope.ts` — ObservableScope, CalcScope, PeekScope
- `src/Store/Tree/observableNode.ts` — ObservableNode
- `src/Store/Store/storeSync.ts` — StoreSync
- `src/Store/Store/storeAsync.ts` — StoreAsync
- `src/Utils/decorators.ts` — All reactive decorators

## See Also

- [Components](./01-components.md) — How decorators integrate with the component lifecycle
- [Templates & Data](./03-templates-and-data.md) — How reactive bindings drive template rendering
- [Dependency Injection](./04-dependency-injection.md) — `@Inject` and `@Destroy`