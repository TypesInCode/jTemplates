# Component Architecture

## Overview

Component Architecture is the foundation of j-templates applications. Components are TypeScript classes that define UI structure through a `Template()` method. The framework provides lifecycle hooks, reactive data binding, and composition patterns to build complex UIs from reusable components.

## Key Concepts

- **Component class**: Base class `Component<D, T, E>` with generic type parameters
  - `D`: Data type passed from parent component via the `data` property
  - `T`: Template type passed from parent component (functions for custom rendering)
  - `E`: Events type map for component events
- **Template method**: `Template()` returns virtual nodes (vNodes) representing UI
- **Lifecycle hooks**: `Bound()` called after DOM attachment, initializes decorators
- **Component composition**: `Component.ToFunction()` converts classes to reusable functions
- **Virtual nodes (vNodes)**: Tree structure representing DOM elements and components

## API Reference

### Class: Component<D, T, E>

Base class for all j-templates components.

**Generic Type Parameters:**
- `D`: Data type passed from parent component via `data` property. Can be accessed via `this.Data`.
- `T`: Template type passed from parent component. Can be accessed via `this.Templates`. Typically an object containing rendering functions.
- `E`: Event map type for component events. Each property name is an event name, and the value is the event payload type.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `Injector` | `Injector` | Returns the component's virtual node injector |
| `Destroyed` | `boolean` | Indicates whether the component has been destroyed |
| `Scope` | `IObservableScope<D>` | Internal scoped Observable for component state |
| `Data` | `D` | Current data value from the scoped Observable |
| `VNode` | `vNodeType` | Accessor for the component's virtual node |
| `Templates` | `T` | Accessor for the component's template collection |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Template()` | `(): vNodeType \| vNodeType[]` | Returns the component's rendered vNode(s) |
| `Bound()` | `(): void` | Lifecycle hook called after DOM attachment. Also initializes decorators like `@Watch` |
| `Fire()` | `<(P extends keyof E)>(event: P, data?: E[P]): void` | Fires a component event |
| `Destroy()` | `(): void` | Destroys the component, cleaning up resources and decorator-managed state |

### Function: Component.ToFunction()

Converts a Component class to a function for composition.

**Signature:**
```typescript
static ToFunction<D, T, E, P = HTMLElement>(
  type: string,
  constructor: typeof Component<D, T, E>,
  namespace?: string
): (config: vComponentConfig<D, E, P>, templates?: T) => vNodeType
```

**Parameters:**
- `type`: String identifier for the component (used for debugging)
- `constructor`: Component class to convert
- `namespace`: Optional namespace for custom elements

**Returns:** Factory function that creates vNodes

### Function: Component.Register()

Registers a Component class as a Web Component with the browser.

**Signature:**
```typescript
static Register<D = void, T = void, E = void>(
  name: string,
  constructor: typeof Component<D, T, E>
): void
```

**Parameters:**
- `name`: Custom element name (must contain a hyphen, e.g., "my-component")
- `constructor`: Component class to register

**Usage:**
```typescript
Component.Register("my-component", MyComponent);
// Can now be used as <my-component></my-component> in HTML
```

### Function: Component.Attach()

Attaches a virtual node to a real DOM node.

**Signature:**
```typescript
static Attach(node: Node, vnode: vNodeType): any
```

**Parameters:**
- `node`: Target DOM node to attach to
- `vnode`: Virtual node to attach

**Returns:** Result of the attachment operation

**Usage:**
```typescript
const root = document.getElementById("root");
const appVNode = app({});
Component.Attach(root, appVNode);
```

### Type: vComponentConfig<D, E, P>

Configuration object passed to component functions.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `data` | `() => D` | Function that returns the component's data object |
| `props` | `RecursivePartial<P>` | Optional DOM props to apply to the component's root element |
| `on` | `ComponentEvents<E>` | Event handlers for component events |

**Data Passing Pattern:**
- Data is passed as a function that returns the data object
- The function is evaluated lazily and can reference parent component state
- Changes to the returned data trigger component re-renders

**Template Passing Pattern:**
- Templates are passed as the second argument to the component function
- Templates are typically objects containing rendering functions
- Child components access templates via `this.Templates`

## Usage Examples

### Passing Data from Parent to Child

```typescript
// Child component
class Greeting extends Component<{ name: string }> {
  Template() {
    return div({}, () => `Hello, ${this.Data.name}!`);
  }
}
export const greeting = Component.ToFunction("greeting", Greeting);

// Parent component
class App extends Component {
  @Value()
  userName = "Alice";

  Template() {
    return [
      div({}, () => "Parent component"),
      // Pass data to child component using the data property
      greeting({ data: () => ({ name: this.userName }) })
    ];
  }
}
```

### Passing Templates from Parent to Child

```typescript
// Define template interface
interface CellTemplate<D> {
  cell: (data: D, column: Column) => vNode | vNode[];
}

// Child component accepts templates
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (data) =>
      tr({ data: () => this.Data.columns }, (column) =>
        td({}, () => this.Templates.cell(data, column))
      )
    );
  }
}
export const dataTable = Component.ToFunction("table", DataTable);

// Parent component provides templates
const cellTemplate = {
  cell: (data: User, column: Column) => {
    if (column.key === "name") return span({}, () => data.name);
    return span({}, () => String(data[column.key]));
  }
};

// Pass templates as second argument
dataTable({ data: () => ({ columns, data: users }) }, cellTemplate);
```

### Component Events

```typescript
// Define event interface with payload types
interface ButtonEvents {
  click: { x: number; y: number };
  custom: string;
}

class Button extends Component<{}, {}, ButtonEvents> {
  Template() {
    return div({
      on: {
        click: (event: MouseEvent) => {
          // Fire event with payload
          this.Fire("click", { x: event.clientX, y: event.clientY });
        }
      }
    }, () => "Click me");
  }
}
export const button = Component.ToFunction("button", Button);

// Parent component handles events
class App extends Component {
  Template() {
    return button({
      data: () => ({}),
      on: {
        click: (payload) => console.log(`Clicked at ${payload.x}, ${payload.y}`)
      }
    });
  }
}
```

### Basic Component

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class HelloWorld extends Component {
  Template() {
    return div({}, () => "Hello world");
  }
}

export const helloWorld = Component.ToFunction("hello-world", HelloWorld);
```

### Component with Data

```typescript
class Greeting extends Component<{ name: string }> {
  Template() {
    return div({}, () => `Hello, ${this.Data.name}!`);
  }
}

export const greeting = Component.ToFunction("greeting", Greeting);

// Usage:
greeting({ data: () => ({ name: "Alice" }) })
```

### Component with Lifecycle

```typescript
class App extends Component {
  Bound(): void {
    console.log("Component attached to DOM");
  }
  
  Destroy(): void {
    console.log("Component destroyed");
  }
  
  Template() {
    return div({}, () => "App");
  }
}

export const app = Component.ToFunction("app", App);
```

### Component with Events

```typescript
interface AppEvents {
  click: { x: number; y: number };
}

class App extends Component<{}, {}, AppEvents> {
  Template() {
    return div({
      on: {
        click: (event: MouseEvent) => {
          this.Fire("click", { x: event.clientX, y: event.clientY });
        }
      }
    }, () => "Click me");
  }
}

export const app = Component.ToFunction("app", App);
```

## Framework Integration

Component Architecture integrates with:

- **Reactive State Management**: `Scope` and `Data` properties use ObservableScope
- **Decorators**: `@Destroy`, `@Watch`, `@Value` for property management; initialized via `Bound()` and cleaned up via `Destroy()`
- **Dependency Injection**: `Injector` provides service resolution
- **Template System**: `Template()` returns vNodes for rendering

## Best Practices

- **Keep Template pure**: `Template()` should only return vNodes, not perform side effects
- **Use Bound() for initialization**: Start timers, subscribe to events in `Bound()`
- **Implement Destroy()**: Clean up resources in `Destroy()` to prevent memory leaks
- **Name components descriptively**: Use kebab-case for component type names
- **Leverage generics**: Use type parameters for strongly-typed data and events
- **Pass data as functions**: Use `data: () => ({ ... })` pattern for reactive data passing
- **Design template interfaces**: Define clear interfaces for template parameters (e.g., `CellTemplate<D>`)
- **Use events for communication**: Fire events with `this.Fire()` and handle them in parent components

## Related Patterns

- **Decorators**: For managing state, computed values, and cleanup
- **Dependency Injection**: For injecting services into components
- **Component Composition**: For building complex UIs from simple components

## Framework Source

- `src/Node/component.ts` - Component class implementation
- `src/Node/vNode.ts` - Virtual node creation and management
- `src/Node/vNode.types.ts` - Virtual node type definitions
- `src/Node/component.types.ts` - Component type definitions

## References

- [Real-Time Dashboard - App Component](../../examples/real_time_dashboard/src/app.ts)
- [Number Card Component](../../examples/real_time_dashboard/src/components/number-card.ts)
- [Data Table Component](../../examples/real_time_dashboard/src/components/data-table.ts)
