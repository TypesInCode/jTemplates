# Components

## Overview

Components are the building blocks of j-templates applications. Every component is a TypeScript class that extends `Component<D, T, E>`, defines its UI in a `Template()` method, and integrates with the framework's reactive state, dependency injection, and lifecycle systems. Components are converted to factory functions via `Component.ToFunction()` and composed into trees.

## Component Class

### Generics

`Component<D, T, E>` accepts three type parameters:

| Parameter | Default | Description |
|---|---|---|
| `D` | `void` | Data type passed from parent via the `data` config property |
| `T` | `void` | Template type — an interface describing render callback functions |
| `E` | `{}` | Event map type — maps event names to payload types |

### Properties

| Property | Access | Type | Description |
|---|---|---|---|
| `Injector` | public | `Injector` | The component's dependency injector |
| `Destroyed` | public | `boolean` | Whether the component has been destroyed |
| `Scope` | protected | `IObservableScope<D>` | Internal observable scope for component data |
| `Data` | protected | `D` | Current data value (reads from `Scope`) |
| `VNode` | protected | `vElementNode` | The component's virtual node |
| `Templates` | protected | `T` | Template functions passed from parent |

### Methods

| Method | Signature | Description |
|---|---|---|
| `Template()` | `(): vNodeType \| vNodeType[]` | Return the component's virtual DOM — override in subclass |
| `Bound()` | `(): void` | Lifecycle hook called after DOM attachment; initializes `@Watch` decorators |
| `Fire()` | `<P extends keyof E>(event: P, data?: E[P]): void` | Emit a component event |
| `Destroy()` | `(): void` | Lifecycle hook for cleanup; destroys all decorator-managed scopes and `@Destroy` properties |

### Lifecycle

1. **Construction** — Avoid overriding the constructor. Use `Bound()` for initialization.
2. **`Bound()`** — Called after the component is attached to the DOM. This is where you start timers, subscribe to events, and trigger initial data fetches. `Bound.All()` is called internally to activate `@Watch` decorators.
3. **`Template()`** — Returns the virtual DOM. Called by the framework to render the component.
4. **`Destroy()`** — Called when the component is removed. `Destroy.All()` is called internally to destroy all `@Value`/`@State`/`@Scope`/`@Computed`/`@ComputedAsync` scopes and call `.Destroy()` on every `@Destroy`-marked property.

## Static Methods

### `Component.ToFunction()`

Converts a Component class into a factory function that produces vNodes. This is the standard way to create component instances.

```typescript
static ToFunction<D, T, E, P = HTMLElement>(
  type: string,
  constructor: typeof Component<D, T, E>,
  namespace?: string,
): (config: vComponentConfig<D, E, P>, templates?: T) => vElementNode
```

```typescript
class HelloWorld extends Component {
  Template() {
    return div({}, () => "Hello world");
  }
}

const helloWorld = Component.ToFunction("hello-world", HelloWorld);

// Mount
Component.Attach(document.body, helloWorld({}));
```

### `Component.Register()`

Registers a component as a Web Component (custom element) with Shadow DOM.

```typescript
static Register<D = void, T = void, E = void>(
  name: string,
  constructor: typeof Component<D, T, E>,
): void
```

```typescript
Component.Register("my-element", MyElement);
// Now usable as <my-element></my-element> in HTML
```

### `Component.Attach()`

Attaches a virtual node to a real DOM node.

```typescript
static Attach(node: any, vnode: vNodeType): vNodeType
```

```typescript
const container = document.getElementById("app")!;
Component.Attach(container, myApp({}));
```

## Data Passing

Data flows from parent to child via the `data` config property. The `data` property is a function so it can be reactive:

```typescript
interface UserData { name: string; age: number; }

class Greeting extends Component<UserData> {
  Template() {
    return div({}, () => `Hello, ${this.Data.name}!`);
  }
}

const greeting = Component.ToFunction("greeting", Greeting);

// Parent passes data
greeting({ data: () => ({ name: "Alice", age: 30 }) });
```

Access data in the child component with `this.Data`. Because `data` is a function, changes to the parent's state automatically propagate.

## Template Functions

Templates let the parent customize how a child renders content. Define a template interface as the `T` generic, and pass template functions as the second argument to the factory:

```typescript
interface CellTemplate<D> {
  cell: (data: D, column: Column) => vNode | vNode[];
}

interface TableData<D> {
  columns: Column[];
  data: D[];
}

class DataTable<D> extends Component<TableData<D>, CellTemplate<D>> {
  Template() {
    return [
      thead({ data: () => this.Data.columns }, (column) =>
        th({}, () => column.name),
      ),
      tbody({ data: () => this.Data.data }, (item) =>
        tr({ data: () => this.Data.columns }, (column) =>
          td({}, () => this.Templates.cell(item, column)),
        ),
      ),
    ];
  }
}

const dataTable = Component.ToFunction("data-table", DataTable);

// Parent provides templates
dataTable(
  { data: () => ({ columns, data: users }) },
  { cell: (user, col) => span({}, () => user[col.key]) },
);
```

## Component Events

Components declare an event map as the `E` generic. Fire events with `this.Fire()` and handle them in the parent via the `on` config property:

```typescript
interface ButtonEvents {
  click: { x: number; y: number };
}

class MyButton extends Component<void, void, ButtonEvents> {
  Template() {
    return button({
      on: { click: (e) => this.Fire("click", { x: e.clientX, y: e.clientY }) },
    }, () => "Click me");
  }
}

const myButton = Component.ToFunction("my-button", MyButton);

// Parent handles events
class Dashboard extends Component {
  Template() {
    return myButton({
      on: { click: (payload) => console.log(`Clicked at ${payload.x}, ${payload.y}`) },
    });
  }
}
```

### Event map type

```typescript
// Child declares:
interface MyEvents {
  save: { id: string };
  delete: { id: string };
}

// ComponentEvents<E> resolves to:
// { save?: (data: { id: string }) => void; delete?: (data: { id: string }) => void }
```

## Domain Specialization

Wrap a generic component with domain-specific logic using dependency injection:

```typescript
class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return dataTable(
      { data: () => ({ data: this.service.GetActivityData(), columns }) },
      activityCellTemplate,
    );
  }
}
```

## Config Type

```typescript
type vComponentConfig<D, E, P = HTMLElement> = {
  data?: () => D | undefined;
  props?: FunctionOr<RecursivePartial<P>> | undefined;
  on?: ComponentEvents<E> | undefined;
};
```

| Property | Type | Description |
|---|---|---|
| `data` | `() => D \| undefined` | Function returning component data |
| `props` | `FunctionOr<RecursivePartial<P>>` | DOM properties applied to root element |
| `on` | `ComponentEvents<E>` | Event handler map |

## Best Practices

- **Override `Template()`, not the constructor.** Use `Bound()` for initialization logic.
- **Implement `Destroy()`** to clean up any resources not covered by `@Destroy`.
- **Use `Component.ToFunction()`** to convert classes to factory functions. Call the factory in parent templates.
- **Use `Component.Register()`** when you need declarative HTML usage via custom elements.
- **Name components with kebab-case** (e.g., `"data-table"`, `"number-card"`).
- **Pass data as functions** (`data: () => value`) for reactive binding.
- **Define event interfaces** for type-safe parent-child communication.
- **Use template functions** when a generic component needs customizable rendering.

## Source

- `src/Node/component.ts` — Component class, ToFunction, Register, Attach
- `src/Node/vNode.types.ts` — vNodeType, vElementNode, vNodeDefinition, vComponentConfig
- `src/Node/component.types.ts` — ComponentEvents type

## See Also

- [Reactivity](./02-reactivity.md) — Reactive state decorators that drive component updates
- [Templates & Data](./03-templates-and-data.md) — DOM element functions and data binding
- [Dependency Injection](./04-dependency-injection.md) — Injector and `@Inject`