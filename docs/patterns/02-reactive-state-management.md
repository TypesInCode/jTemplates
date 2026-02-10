# Reactive State Management

## Overview

Reactive State Management is the core mechanism that enables j-templates applications to automatically update when data changes. The framework uses `ObservableScope`, `ObservableNode`, and `StoreSync` to create a reactive data layer that tracks dependencies and propagates changes efficiently.

## Core Concepts

### Reactive Scopes

Reactive scopes track dependencies and automatically recompute when dependencies change.

- **ObservableScope**: Creates reactive computation scopes that cache results and update when dependencies change
- **calc()**: Acts as a gatekeeper that only emits when the calculated value actually changes (=== comparison), blocking unnecessary updates from propagating to dependencies

### Observable Nodes

Observable nodes provide proxy-based reactivity for nested data structures.

- **ObservableNode**: Wraps objects and arrays to track property access and mutations
- **Automatic tracking**: Property reads create dependencies, writes trigger updates

### Data Storage

StoreSync manages shared data with automatic change propagation.

- **StoreSync**: Synchronous data storage with key-based object sharing
- **Key functions**: Enable object identity sharing (same objects referenced across data)

### Key Mechanisms

- **Dependency tracking**: Scopes automatically track which observables they access
- **Object sharing**: Store uses key functions to share object instances across data
- **Lazy evaluation**: Scopes compute values only when accessed
- **Batched updates**: Greedy scopes batch updates via microtask queue

## API Reference

### Type: IObservableScope<T>

Represents a reactive or static scope containing a value.

**Interfaces:**

```typescript
interface IStaticObservableScope<T> {
  type: "static";
  value: T;
}

interface IDynamicObservableScope<T> {
  type: "dynamic";
  async: boolean;
  greedy: boolean;
  dirty: boolean;
  destroyed: boolean;
  getFunction: () => Promise<T> | T;
  setCallback: EmitterCallback;
  value: T;
  emitter: Emitter;
  emitters: (Emitter | null)[];
  onDestroyed: Emitter | null;
  calcScopes: { [id: string]: IObservableScope<unknown> | null } | null;
}
```

### Class: ObservableScope

Static methods for creating and managing observable scopes.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Create()` | `<T>(valueFunction: () => T \| Promise<T>, greedy?: boolean, force?: boolean): IObservableScope<T>` | Creates a dynamic observable scope |
| `Value()` | `<T>(scope: IObservableScope<T>): T` | Returns the current value and registers as dependency |
| `Peek()` | `<T>(scope: IObservableScope<T>): T` | Returns the current value without registering as dependency |
| `Watch()` | `<T>(scope: IObservableScope<T>, callback: (scope: IObservableScope<T>) => void): void` | Registers a callback for when scope value changes |
| `Unwatch()` | `<T>(scope: IObservableScope<T>, callback: (scope: IObservableScope<T>) => void): void` | Unsubscribes from changes on a scope |
| `Touch()` | `<T>(scope: IObservableScope<T>): void` | Registers a scope as a dependency without retrieving its value |
| `Update()` | `(scope: IObservableScope<any>): void` | Marks a scope as dirty, triggering recomputation |
| `Register()` | `(emitter: Emitter): void` | Registers an emitter as a dependency for current watch context |
| `OnDestroyed()` | `(scope: IObservableScope<unknown>, callback: () => void): void` | Registers a callback when scope is destroyed |
| `Destroy()` | `(scope: IObservableScope<unknown>): void` | Destroys a scope and cleans up resources |
| `DestroyAll()` | `(scopes: IObservableScope<unknown>[]): void` | Destroys multiple scopes |

### Function: calc()

Creates a memoized derived value within a watch context. Reuses scopes by ID to optimize recomputation.

**Signature:**
```typescript
function calc<T>(callback: () => T, idOverride?: string): T
```

**Parameters:**
- `callback`: Function to compute the derived value
- `idOverride`: Optional custom ID for memoization when using multiple calc scopes

**Returns:** The computed value

**Note:** Only works within a watch context (during another scope's execution). Always creates greedy scopes that batch updates via microtask queue.

### Class: ObservableNode

Provides access to nested observable data structures with proxy-based reactivity.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Create()` | `<T>(value: T): T` | Creates an observable node from a plain value |
| `CreateFactory()` | `(alias?: (value: any) => any | undefined): (value: T) => T` | Creates a factory function for making values observable with optional aliasing |
| `Unwrap()` | `<T>(value: T): T` | Returns the raw value without creating dependencies |
| `Touch()` | `<T>(value: T, prop?: string \| number): void` | Marks an observable node or its property as changed, triggering reactive updates |
| `ApplyDiff()` | `(rootNode: any, diffResult: JsonDiffResult): void` | Applies a JSON diff result to an observable node, efficiently updating only changed properties |

### Class: StoreSync

Synchronous data storage with key-based object sharing and automatic change propagation.

**Constructor:**
```typescript
constructor(keyFunc?: (value: any) => string | undefined)
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Write()` | `(data: unknown, key?: string): void` | Writes data to the store |
| `Patch()` | `(key: string, patch: unknown): void` | Patches existing data |
| `Push()` | `(key: string, ...data: unknown[]): void` | Pushes items to an array |
| `Splice()` | `(key: string, start: number, deleteCount?: number, ...items: unknown[]): any[]` | Splices an array |
| `Get()` | `<O>(id: string): O \| undefined`<br>`<O>(id: string, defaultValue: O): O` | Gets data from the store (returns observable node) |

## Usage Patterns

### Basic Reactive State

Creating and accessing reactive scopes:

```typescript
import { ObservableScope } from "j-templates/Store";

// Create a reactive scope
private counter = ObservableScope.Create(() => 0);

// Access the current value (reactive)
get Counter() {
  return ObservableScope.Value(this.counter);
}
```

### Derived State

Creating computed values that automatically update:

```typescript
import { ObservableScope } from "j-templates/Store";

// Create a reactive scope for derived state
private activityData = ObservableScope.Create(() => {
  const activities = this.store.Get<Activity[]>("activities", []);
  const data = ObservableNode.Unwrap(activities).slice();

  // Sort by timestamp (newest first)
  data.sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp === b.timestamp ? 0 : -1
  );

  return data;
});

// Access the current value (reactive)
get ActivityData() {
  return ObservableScope.Value(this.activityData);
}
```

### Array Change Detection

Using `calc()` for proper array change detection in templates:

```typescript
import { calc } from "j-templates";

// Wrap array data in calc() for proper change detection
tbody({ data: () => calc(() => this.Data.data) }, (data) =>
  tr({}, (item) => td({}, () => item.name))
);

// calc() memoizes the array reference
// When the array is modified (push, pop, etc.), calc() detects the change
// and triggers re-render of the tbody
```

### Complex Derived State

Computing statistics from reactive data:

```typescript
private report = ObservableScope.Create(() => {
  const data = ObservableScope.Value(this.activityData);

  // Compute statistics
  const totalVisits = data.length;
  const uniqueUsers = new Set(data.map(a => a.user.id)).size;
  const totalTime = data.reduce((sum, a) => sum + a.time_spent, 0);

  return {
    totalVisits,
    uniqueUsers,
    totalTime,
    avgTimePerActivity: totalTime / totalVisits
  };
});

get Report() {
  return ObservableScope.Value(this.report);
}
```

### Object Sharing

Using key functions to share object instances:

```typescript
import { StoreSync } from "j-templates/Store";

// Create store with key function for object sharing
private store = new StoreSync((value) => value.id);

// Two activities with same user will share the user object:
const activity1 = { id: "act-1", user: { id: "usr-1", name: "John" } };
const activity2 = { id: "act-2", user: { id: "usr-1", name: "John" } };

store.Write(activity1);
store.Write(activity2);

// activity1.user === activity2.user (same instance!)
```

### Data Operations

Working with StoreSync:

```typescript
import { StoreSync } from "j-templates/Store";

// Create store with key function
private store = new StoreSync((value) => value.id);

// Write data to store
this.store.Write(user, "user-1");

// Push items to an array
this.store.Push("activities", activity1, activity2);

// Patch existing data
this.store.Patch("user-1", { name: "Updated Name" });

// Get data (returns observable node value)
const activities = this.store.Get<Activity[]>("activities", []);
```

### ObservableNode Operations

Creating and working with observable nodes:

```typescript
import { ObservableNode } from "j-templates/Store";

// Create an observable object
const user = ObservableNode.Create({ name: "Alice", age: 30 });

// Access properties (creates reactive dependencies)
console.log(user.name); // "Alice"

// Modify properties (triggers updates)
user.name = "Bob";
```

### Manual Updates

Triggering updates manually:

```typescript
// Manually mark a scope as dirty, forcing recomputation
ObservableScope.Update(this.activityData);

// Touch an observable node
ObservableNode.Touch(this.userData);

// Touch a specific property
ObservableNode.Touch(this.userData, "name");
```

### Dependency Control

Controlling when dependencies are created:

```typescript
// Value() - creates a dependency
const data1 = ObservableScope.Value(this.activityData);
// If this.activityData changes, this scope will re-compute

// Peek() - no dependency created
const data2 = ObservableScope.Peek(this.activityData);
// If this.activityData changes, this scope will NOT re-compute
```

### Manual Subscriptions

Watching and unwatching scope changes:

```typescript
// Watch for changes
const callback = (scope: IObservableScope<Activity[]>) => {
  console.log("Activities changed:", ObservableScope.Value(scope));
};

ObservableScope.Watch(this.activities, callback);

// Later, unsubscribe
ObservableScope.Unwatch(this.activities, callback);
```

### Cleanup

Registering cleanup callbacks:

```typescript
// Register cleanup callback when scope is destroyed
ObservableScope.OnDestroyed(this.activityData, () => {
  console.log("Activity data scope destroyed");
  // Perform cleanup tasks
});

// Create factory with alias function
const createReadOnlyProxy = ObservableNode.CreateFactory((value) => {
  // Return transformed/aliased version
  return { ...value, readonly: true };
});

const proxy = createReadOnlyProxy({ name: "Alice" });
// proxy.name is accessible
// proxy.readonly is true
// Attempting to mutate will throw error
```

## Framework Integration

Reactive State Management integrates with:

- **Component Architecture**: `Component.Scope` and `Component.Data` use ObservableScope
- **Decorators**: `@Computed` and `@Value` use ObservableScope internally
- **Template System**: Reactive bindings track ObservableScope dependencies
- **calc()**: Used in templates for array change detection
- **StoreSync**: Used by services for data management

## Best Practices

- **Use StoreSync for shared data**: Enables object sharing and efficient updates
- **Define key functions**: Use key functions to enable object identity and sharing
- **Compute derived state**: Use ObservableScope for derived state instead of manual caching
- **Use calc() for arrays**: Wrap array data in `calc()` for proper change detection in templates
- **Clean up scopes**: Destroy scopes in `Destroy()` to prevent memory leaks
- **Use ObservableNode.Unwrap() carefully**: Only when you need raw values without dependencies
- **Use Peek for non-reactive reads**: When you need a value without creating dependencies
- **Unwatch when done**: Always call Unwatch when you no longer need to observe a scope
- **Use OnDestroyed for cleanup**: Register cleanup callbacks when scopes are destroyed

## Related Patterns

- **Decorators**: `@Computed` and `@Value` provide decorator syntax for reactive state
- **Component Architecture**: Components use reactive state for their `Data` property

## Framework Source

- `src/Store/Tree/observableScope.ts` - ObservableScope implementation
- `src/Store/Tree/observableNode.ts` - ObservableNode implementation
- `src/Store/Store/storeSync.ts` - StoreSync implementation
- `src/Store/Store/store.ts` - Base Store class
- `src/Store/Store/storeAsync.ts` - StoreAsync implementation (async version)

## References

- [Data Service](../../examples/real_time_dashboard/src/services/dataService.ts)
- [Activity Data Table](../../examples/real_time_dashboard/src/components/activity-data-table.ts)
