# Building a TODO App with jTemplates

<iframe src="https://codesandbox.io/embed/y7l9mg?view=preview"
     style="width:100%; height: 500px; border:0; border-radius: 4px; overflow:hidden;"
     title="j-templates TODO Sample"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

This post documents a complete TODO application built with the jTemplates framework, demonstrating its core features for building reactive, component-based user interfaces. The app implements a fully functional TODO list with add, edit, delete, and status toggle functionality, showcasing how jTemplates' architecture enables clean, maintainable code with minimal boilerplate.

## App Architecture Overview

The TODO app follows a hierarchical component structure:

```
TodoApp (root component)
├── TodoRow (reusable sub-component for each todo item)
└── DOM elements (div, button, input, h1, span, text)
```

The application maintains state in two primary locations:
- **TodoApp**: Manages the collection of todos and the new todo input
- **TodoRow**: Manages local editing state for individual todo items

Data flows from the parent component (TodoApp) to child components (TodoRow) through the `data` property, while events flow upward from child to parent through custom event handlers.

## Core Features Demonstrated

### 1. Component Architecture

The app demonstrates the fundamental component pattern in jTemplates:

```ts
// TodoApp component
export class TodoApp extends Component {
  // State management
  @State()
  todos: TodoItem[] = [...];
  
  @State()
  newTodo: TodoItem = {...};
  
  // Event handlers
  addNewTodo = () => { ... };
  deleteTodo = (id: number) => { ... };
  changeStatus = (id: number, status: "complete" | "pending") => { ... };
  
  // Computed properties
  get PendingTodos() { return this.todos.filter(...); }
  get CompleteTodos() { return this.todos.filter(...); }
  
  Template() {
    return [
      // DOM structure with reactive bindings
      div({}, () => [ ... ]),
      h1({}, () => `Pending ${this.PendingTodos.length}`),
      div({ data: () => this.PendingTodos }, (todo) =>
        todoRow({
          data: () => todo,
          on: {
            Update: this.updateTodo,
            ChangeStatus: (id) => this.changeStatus(id, "complete"),
            Delete: this.deleteTodo,
          },
        }),
      ),
      // ... more DOM elements
    ];
  }
}

// TodoRow component
export class TodoRow extends Component<TodoItem, void, RowEvents> {
  @Value()
  editing = false;
  
  @Value()
  name = "";
  
  Template() {
    return div({
      props: { className: "row-container" },
    }, () => [
      // ... DOM structure with conditional rendering
    ]);
  }
  
  ToggleEdit() {
    this.editing = !this.editing;
    if (this.editing) {
      this.name = this.Data.name;
    } else this.name = "";
  }
}
```

### 2. Reactive State Management

The app leverages jTemplates' reactivity system through two key decorators:

- **`@State()`**: Used for application-level state that persists across the component lifecycle
  - `todos`: Array of all todo items
  - `newTodo`: The current input for a new todo

- **`@Value()`**: Used for local component state that doesn't need to be shared
  - `editing`: Boolean flag for whether a todo is in edit mode
  - `name`: Temporary storage for the edited todo name

When state changes, the framework automatically:
1. Tracks dependencies through `ObservableScope`
2. Marks affected components as dirty
3. Re-executes `Template()` methods
4. Updates the DOM through the reconciliation system

### 3. DOM Element Creation

The app uses jTemplates' DOM factory functions to create virtual DOM elements declaratively:

```ts
import { button, div, input, h1, span, text } from "j-templates/DOM";

// Static configuration (no reactivity)
div({ props: { className: "container" } }, [
  button({}, () => "Add")
])

// Reactive configuration (with automatic reactivity)
div({
  props: () => ({
    style: { color: this.Data.color, padding: this.Data.padding },
  }),
  on: () => ({
    click: () => this.handleClick(),
  }),
}, () => [
  div({}, () => `Count: ${this.Data.count}`)
])
```

The `input` element demonstrates reactive property binding:
```ts
input({
  props: () => ({ value: this.newTodo.name }),
  on: {
    blur: (event) =>
      (this.newTodo.name = (event.target as HTMLInputElement).value || ""),
  },
})
```

### 4. Event Handling

The app implements a clean event handling pattern:

- **Parent-to-child**: Events are passed through the `on` property in the component factory
- **Child-to-parent**: Child components emit events using `this.Fire()`

```ts
// In TodoApp - defining event handlers
addNewTodo = () => { ... };
deleteTodo = (id: number) => { ... };
changeStatus = (id: number, status: "complete" | "pending") => { ... };

// In TodoRow - emitting events
button({
  on: {
    click: () => this.Fire("ChangeStatus", this.Data.id),
  },
}, () => "Complete")

// In TodoApp - receiving events
TodoRow({
  data: () => todo,
  on: {
    ChangeStatus: (id) => this.changeStatus(id, "complete"),
    Delete: this.deleteTodo,
  },
})
```

### 5. Data Binding and Iteration

The app demonstrates jTemplates' powerful data binding system:

```ts
// Binding an array to a component
// The data property is a reactive function returning an array
// The children function is called for each item in the array

div({ data: () => this.PendingTodos }, (todo) =>
  todoRow({
    data: () => todo,
    on: { ... }
  })
)
```

Key behaviors:
- **Falsy values**: `null`, `undefined`, `false`, `0`, or `''` remove all children
- **Arrays**: Auto-iterates over the array, calling the children function for each element
- **Objects**: Treated as a single child

This pattern eliminates manual array creation in templates and ensures optimal reactivity.

### 6. Component Composition and Reusability

The `TodoRow` component is reused three times in the app:
1. For pending todos
2. For complete todos
3. For all todos

Each instance receives different data through the `data` property and different event handlers:
- For pending todos: `ChangeStatus` triggers "complete"
- For complete todos: `ChangeStatus` triggers "pending"

This demonstrates the power of component composition - the same UI logic is reused with different configurations.

## Code Walkthrough

### TodoApp Component

The `TodoApp` component manages the application state and coordinates between components:

```ts
class TodoApp extends Component {
  // State management
  @State()
  newTodo: TodoItem = { id: ++todoId, name: "", description: "", status: "pending" };
  
  @State()
  todos: TodoItem[] = [
    { id: ++todoId, name: "Default todo", description: "This is a placeholder todo", status: "pending" },
  ];
  
  // Computed properties for filtering
  get PendingTodos() {
    return this.todos.filter((todo) => todo.status === "pending");
  }
  
  get CompleteTodos() {
    return this.todos.filter((todo) => todo.status === "complete");
  }
  
  // Event handlers
  addNewTodo = () => {
    const newTodo = { ...this.newTodo };
    this.todos.push(newTodo);
    this.newTodo = { id: ++todoId, name: "", description: "", status: "pending" };
  };
  
  deleteTodo = (id?: number) => {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index >= 0) this.todos.splice(index, 1);
  };
  
  changeStatus = (id: number | undefined, status: "complete" | "pending") => {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo !== undefined) todo.status = status;
  };
  
  // Template method - returns the UI structure
  Template() {
    return [
      // Add new todo form
      div({}, () => [
        input({
          props: () => ({ value: this.newTodo.name }),
          on: {
            blur: (event) =>
              (this.newTodo.name = (event.target as HTMLInputElement).value || ""),
          },
        }),
        button({ on: { click: this.addNewTodo } }, () => "Add"),
      ]),
      
      // Pending todos section
      h1({}, () => `Pending ${this.PendingTodos.length}`),
      div({ data: () => this.PendingTodos }, (todo) =>
        todoRow({
          data: () => todo,
          on: {
            Update: this.updateTodo,
            ChangeStatus: (id) => this.changeStatus(id, "complete"),
            Delete: this.deleteTodo,
          },
        }),
      ),
      div({ data: () => this.PendingTodos.length === 0 }, () => "None"),
      
      // Complete todos section
      h1({}, () => `Complete ${this.CompleteTodos.length}`),
      div({ data: () => this.CompleteTodos }, (todo) =>
        todoRow({
          data: () => todo,
          on: {
            Update: this.updateTodo,
            ChangeStatus: (id) => this.changeStatus(id, "pending"),
            Delete: this.deleteTodo,
          },
        }),
      ),
      div({ data: () => this.CompleteTodos.length === 0 }, () => "None"),
      
      // All todos section
      h1({}, () => `All ${this.todos.length}`),
      div({ data: () => this.todos }, (todo) =>
        todoRow({
          data: () => todo,
          on: {
            Update: this.updateTodo,
            ChangeStatus: (id) => this.changeStatus(id, "pending"),
            Delete: this.deleteTodo,
          },
        }),
      ),
    ];
  }
}
```

### TodoRow Component

The `TodoRow` component demonstrates local state management and component composition:

```ts
class TodoRow extends Component<TodoItem, void, RowEvents> {
  // Local editing state
  @Value()
  editing = false;
  
  @Value()
  name = "";
  
  Template() {
    return div(
      {
        props: {
          className: "row-container",
        },
      },
      () => [
        // Status indicator
        span(
          {
            props: { className: "status" },
            attrs: () => ({ title: this.Data.description }),
          },
          () => this.Data.status,
        ),
        
        // Todo name - editable or static
        span({}, () =>
          this.editing
            ? input({
                props: () => ({ value: this.name }),
                on: {
                  keyup: (event: Event) =>
                    (this.name = (event.target as HTMLInputElement).value),
                },
              })
            : text(() => this.Data.name as any),
        ),
        
        // Action buttons - conditional rendering
        span({}, () =>
          this.editing
            ? [
                button(
                  {
                    on: {
                      click: () => {
                        this.Fire("Update", {
                          id: this.Data.id,
                          name: this.name,
                        });
                        this.ToggleEdit();
                      },
                    },
                  },
                  () => "Update",
                ),
                button(
                  {
                    on: {
                      click: () => this.ToggleEdit(),
                    },
                  },
                  () => "Cancel",
                ),
              ]
            : [
                button(
                  { on: { click: () => this.ToggleEdit() } },
                  () => "Edit",
                ),
                button(
                  {
                    on: {
                      click: () => this.Fire("ChangeStatus", this.Data.id),
                    },
                  },
                  () =>
                    this.Data.status === "pending" ? "Complete" : "Pending",
                ),
                button(
                  { on: { click: () => this.Fire("Delete", this.Data.id) } },
                  () => "Delete",
                ),
              ],
        ),
      ],
    );
  }
  
  // Toggle edit mode
  ToggleEdit() {
    this.editing = !this.editing;
    if (this.editing) {
      this.name = this.Data.name;
    } else this.name = "";
  }
}
```

## Framework Integration

The TODO app demonstrates how jTemplates' core systems work together:

| Feature | Framework System | Implementation |
|---------|------------------|----------------|
| Reactive State | `@State()` and `@Value()` decorators | Manages todos and editing state |
| Dependency Tracking | `ObservableScope` | Tracks changes to state and re-renders components |
| State Objects | `ObservableNode` | Wraps todo objects for fine-grained reactivity |
| Component Structure | `Component` class | Defines UI logic and lifecycle |
| DOM Creation | DOM factory functions | Creates vNodes for div, button, input, etc. |
| Event Handling | `Fire()` method | Communicates between parent and child components |
| Data Binding | `data` property | Connects arrays to component templates |

## Best Practices Illustrated

1. **Use reactive functions for dynamic content**: Always use functions for props, events, and children when they depend on state:
   ```ts
   // Good - reactive
   div({ props: () => ({ className: this.className }) }, () => ...)
   
   // Avoid - static
   div({ props: { className: this.className } }, () => ...)
   ```

2. **Avoid manual array creation**: Use the `data` property with array iteration instead of creating arrays in templates:
   ```ts
   // Good - data binding
   div({ data: () => this.items }, (item) => div({}, () => item.name))
   
   // Avoid - manual array creation
   div({}, () => this.items.map(item => div({}, () => item.name)))
   ```

3. **Separate concerns**: Keep application state in parent components and local state in child components:
   - `TodoApp`: Manages the collection of todos
   - `TodoRow`: Manages editing state for individual todos

4. **Use computed properties**: Create derived state using getter methods:
   ```ts
   get PendingTodos() {
     return this.todos.filter((todo) => todo.status === "pending");
   }
   ```

5. **Leverage component composition**: Reuse components with different configurations:
   - Same `TodoRow` component used for pending, complete, and all todos
   - Different event handlers passed to each instance

## Conclusion

The TODO app demonstrates how jTemplates enables the creation of complex, reactive user interfaces with clean, maintainable code. By leveraging the framework's core features:

- **Component architecture** for UI structure
- **Reactive state management** with `@State()` and `@Value()`
- **DOM factory functions** for declarative template creation
- **Event handling** with `Fire()`
- **Data binding** with the `data` property
- **Component composition** for reusability

Developers can build sophisticated applications with minimal boilerplate. The TODO app serves as an excellent reference for understanding how jTemplates' systems work together to create a seamless reactive experience.

## Next Steps

To extend this app, consider:
- Adding todo descriptions with multi-line input
- Implementing filtering by status
- Adding persistence with `StoreAsync`
- Implementing drag-and-drop reordering
- Adding keyboard shortcuts

For more information on the underlying systems, see:
- [DOM Elements](/docs/_posts/2025-12-07-DOM-Elements.markdown)
- [Component](/docs/_posts/2025-12-07-Component.markdown)
- [ObservableNode](/docs/_posts/2025-12-07-ObservableNode.markdown)
- [ObservableScope](/docs/_posts/2025-12-07-ObservableScope.markdown)

---

*Next post*: StoreSync & StoreAsync — synchronous vs asynchronous store APIs (`src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`).
