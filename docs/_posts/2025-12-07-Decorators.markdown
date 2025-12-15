# Decorators

*File: `src/Utils/decorators.ts`*

Decorators in jTemplates are utility functions that simplify component state management, computed values, and dependency injection. They provide a clean syntax for defining reactive properties and managing component lifecycle while integrating seamlessly with the framework's reactivity system.

## Available Decorators

### `@State`
Creates a reactive property that stores a mutable value using an `ObservableNode`. The resulting object is fully mutable, and direct property modifications trigger reactivity updates:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Counter extends Component {
  @State()
  private counter = { count: 0 };

  private inc() {
    this.counter.count++; // Direct mutation - triggers reactivity
  }

  private reset() {
    this.counter = { count: 0 }; // Object replacement - also triggers reactivity
  }

  Template() {
    return div({}, () => `Count: ${this.counter.count}`);
  }
}
```

`@State` is ideal for complex, mutable data structures where you want to modify properties directly rather than replacing the entire object.

### `@Computed` and `@ComputedAsync`
Creates a computed property that derives its value from other observables. The value is cached and automatically updates when dependencies change. These decorators use `StoreSync` or `StoreAsync` internally to perform deep JSON diffing, enabling granular updates to complex nested structures:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class TodoList extends Component {
  @Computed<{ name: string }[]>([])
  private get todoList() {
    return this.Data.todos.map(todo => ({ name: todo }));
  }

  @ComputedAsync<number>(0)
  private async getTodoCountAsync() {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.Data.todos.length;
  }

  Template() {
    return div({}, () => `Todos: ${this.todoList.length}, Async: ${this.getTodoCountAsync}`);
  }
}
```

- **`@Computed`**: Uses `StoreSync` internally for synchronous computation with deep diffing
- **`@ComputedAsync`**: Uses `StoreAsync` internally for asynchronous computation with deep diffing
- Both require a default value as a parameter (not as a type annotation)
- The computed value is cached and only recomputed when dependencies change
- Deep diffing ensures only the specific nested properties that change trigger updates

### `@Value`
Creates a reactive property that tracks a simple value through an `ObservableScope`. The value can be read and written directly:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Example extends Component {
  @Value()
  private greeting = 'Hello World';

  private updateGreeting(newName: string) {
    this.greeting = `Hello ${newName}`; // Direct assignment triggers updates
  }

  Template() {
    return div({}, () => this.greeting);
  }
}
```

`@Value` is ideal for simple values (strings, numbers, booleans) that need to be reactive.

### `@Scope`
Creates a computed property that evaluates a getter function through an `ObservableScope`. Unlike `@Computed`, `@Scope` does not perform deep diffing - it tracks direct dependencies on the properties accessed within the getter:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Example extends Component {
  @Scope()
  private get total() {
    return this.Data.items.reduce((sum, item) => sum + item, 0);
  }

  @Scope()
  private get average() {
    return this.total / this.Data.items.length;
  }

  Template() {
    return div({}, () => `Total: ${this.total}, Average: ${this.average}`);
  }
}
```

- **`@Scope`**: Uses `ObservableScope` directly without deep diffing
- Tracks only the specific properties accessed within the getter function
- Recomputes the entire value when any dependency changes
- More efficient for simple computations that don't involve complex nested structures
- Ideal for derived values that depend on primitive values or simple object properties

### `@Inject`
Provides dependency injection for component properties. The framework's injector provides the instance:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class MyService {
  public getData() { return 'data'; }
}

class MyService2 {
  public getData() { return 'data'; }
}

class Example extends Component {
  @Inject(MyService)
  private service: MyService; // Lookup an instance at this or parent scope
  
  @Inject(MyService2)
  private service2: MyService2 = new MyService2(); // Set an instance at this scope

  Template() {
    return div({}, () => this.service.getData());
  }
}
```

The injector will provide an instance of `MyService` if available, or use the fallback value if not.

### `@Destroy`
Marks a property for cleanup during component destruction. The decorated property must implement the `IDestroyable` interface (have a `Destroy()` method):

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Timer {
  private intervalId: number;

  public Start() {
    this.intervalId = window.setInterval(() => console.log('tick'), 1000);
  }

  public Destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

class Example extends Component {
  @Destroy()
  private timer: Timer = new Timer();

  Bound() {
    this.timer.Start();
  }

  // The timer will be automatically destroyed when the component is destroyed
}
```

## Integration with Components

Decorators seamlessly integrate with the component lifecycle:
- `@Destroy` ensures proper cleanup of resources when components are destroyed
- `@Inject` provides dependency injection through the component's injector
- All reactive decorators (`@State`, `@Value`, `@Scope`, `@Computed`, `@ComputedAsync`) automatically trigger reactivity updates when values change
- The `Component` base class automatically calls `Destroy.All(this)` in its `Destroy()` method to clean up all decorated properties

## Choosing Between @Scope and @Computed

| Criteria | @Scope | @Computed |
|----------|--------|-----------|
| **Diffing** | No deep diffing - tracks direct property access | Deep JSON diffing - tracks granular changes |
| **Performance** | Faster for simple computations | Slower due to diffing, but more efficient for complex nested structures |
| **Best for** | Simple derived values, primitive dependencies | Complex nested objects/arrays, granular updates |
| **Memory** | Lower memory usage | Higher memory usage due to StoreSync/StoreAsync |
| **Use case** | `total = a + b`, `formattedName = firstName + ' ' + lastName` | `filteredItems = items.filter(i => i.active)`, `nestedObject = { a: { b: c } }` |

**Recommendation**: Use `@Scope` for simple computations that depend on primitive values or direct object properties. Use `@Computed` when you need to track changes in complex nested structures and want granular updates.

## File References

- **Implementation**: `src/Utils/decorators.ts`
- **Component integration**: `src/Node/component.ts`
- **Reactivity primitives**: `src/Store/Tree/observableScope.ts`, `src/Store/Tree/observableNode.ts`
- **Store implementations**: `src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`

---

*Next post*: calc / CalcScope — reactive computed values and scope tracking.
