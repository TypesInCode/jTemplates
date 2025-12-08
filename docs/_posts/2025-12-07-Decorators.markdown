# Decorators

*File: `src/Utils/decorators.ts`*

Decorators in jTemplates are utility functions that simplify component state management, computed values, and dependency injection. They provide a clean syntax for defining reactive properties and managing component lifecycle.

## Available Decorators

### `@State` 
Creates a reactive property that stores a value using an `ObservableNode`:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Counter extends Component<{ count: number }, void> {
  @State()
  private counter = { counter: 0 };

  private inc() {
    this.counter.counter++; // Updates the observable node
  }

  Template() {
    return div({}, () => `Count: ${this.counter.counter}`);
  }
}
```

### `@Computed` and `@ComputedAsync`
`@ComputedAsync` offloads its internal diff process to another thread.
Creates a computed property that derives its value from other observables:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class TodoList extends Component<{ todos: string[] }, void> {
  @Computed([])
  private get todoList() {
    return this.Data.todos.map(todo => ({ name: todo }));
  }

  @ComputedAsync(0)
  private async getTodoCountAsync() {
    // Simulate async operation
    return this.Data.todos.length;
  }

  Template() {
    return div({}, () => `Todos: ${this.todoList.length}, Async: ${this.getTodoCountAsync}`);
  }
}
```

### `@Value`
Creates a reactive property that tracks a value through an `ObservableScope`:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Example extends Component<{ name: string }, void> {
  @Value()
  private greeting = `Hello ${this.Data.name}`;

  private updateGreeting(newName: string) {
    this.greeting = `Hello ${newName}`;
  }

  Template() {
    return div({}, () => this.greeting);
  }
}
```

### `@Scope`
Creates a computed scope that's evaluated from a getter:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class Example extends Component<{ items: number[] }, void> {
  @Scope()
  private get total() {
    return this.Data.items.reduce((sum, item) => sum + item, 0);
  }

  Template() {
    return div({}, () => `Total: ${this.total}`);
  }
}
```

### `@Inject`
Provides dependency injection for component properties:

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class MyService {
  public getData() { return 'data'; }
}

class Example extends Component<void, void> {
  @Inject(MyService)
  private service: MyService;
  
  @Inject(MyService)
  private service2: MyService = new MyService();

  Template() {
    return div({}, () => this.service.getData());
  }
}
```

### `@Destroy`
Marks a property for cleanup during component destruction. The decorated property must implement the `IDestroyable` interface (have a `Destroy()` method):

```ts
import { Component, Destroy } from 'j-templates';
import { div } from 'j-templates/DOM';

class Timer implements IDestroyable {
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

class Example extends Component<void, void> {
  @Destroy()
  private timer: Timer = new Timer();

  Bound() {
    this.timer.Start();
  }

  // Not needed, the timer will be automatically destroyed via the @Destroy decorator
  /* Destroy() { } */
}
```

## Integration with Components

Decorators seamlessly integrate with the component lifecycle. When a component is destroyed, the `@Destroy` decorator ensures that any marked properties are properly cleaned up. The `@Inject` decorator allows for easy dependency injection with the component's injector.

## File References
- **Implementation**: `src/Utils/decorators.ts`
- **Component integration**: `src/Node/component.ts`

---
*Next post*: calc / CalcScope – reactive computed values and scope tracking.
