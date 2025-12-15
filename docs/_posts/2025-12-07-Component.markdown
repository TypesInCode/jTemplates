# Component

*File: `src/Node/component.ts`*

The **Component** class is the fundamental building block of jTemplates' component-based UI architecture. It encapsulates UI logic, state management, lifecycle hooks, and event handling in a reusable, reactive unit.

## Core Architecture

Components are defined as classes that extend the base `Component` class. The three generic type parameters all have default values:

- **D**: Data type for the component's scoped state (default: `void`)
- **T**: Template type for the component's template collection (default: `void`)
- **E**: Event map type for component events (default: `void`)

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

// Define data interface
interface Props {
  greeting: string;
  count: number;
}

// Define template collection interface
interface Templates {
  main: () => vNodeType;
  header: () => vNodeType;
}

// Define event map interface
interface Events {
  click: { x: number; y: number };
  update: string;
}

// Component declaration - DO NOT override constructor
export class HelloWorld extends Component<Props, Templates, Events> {
  // Framework provides: data, templates, vnode, and events
  // Access via: this.Data, this.Templates, this.VNode, this.Injector
  
  Template(): vNodeType | vNodeType[] {
    // Return the component's UI as vNodes
    return div({}, () => `Hello ${this.Data.greeting}! Count: ${this.Data.count}`);
  }
  
  Bound(): void {
    // Called after component is bound to DOM
    // Use for initialization that requires DOM access
  }
  
  Fire<P extends keyof Events>(event: P, data?: Events[P]): void {
    // Trigger custom events
    super.Fire(event, data);
  }
}

// For simple components with no data, templates, or events:
export class SimpleComponent extends Component {
  Template() {
    return div({}, () => 'Simple component');
  }
}
```

## Key Features

### 1. **State Management with ObservableScope**

Components automatically receive an `ObservableScope` for their data, providing reactivity:

```ts
export class Counter extends Component<{ count: number }> {
  // Access data through the Data accessor (read-only)
  get count() {
    return this.Data.count;
  }
  
  // Update data through the store system or @Value decorator
  increment() {
    // This would typically come from a Store or @Value decorator
    // Direct mutation of this.Data is not allowed
  }
  
  Template() {
    return div({}, () => `Count: ${this.count}`);
  }
}
```

### 2. **Template Method**

The `Template()` method defines the component's UI by returning one or more vNodes:

```ts
Template(): vNodeType | vNodeType[] {
  // Use DOM helper functions from src/DOM/index.ts
  return div(
    { className: 'container' },
    () => [
      div({ className: 'header' }, () => this.Data.title),
      div({ className: 'content' }, () => this.Data.content),
    ]
  );
}
```

### 3. **Lifecycle Hooks**

- **`Template()`**: Required. Returns the component's UI as vNodes.
- **`Bound()`**: Optional. Called after the component is attached to the DOM. Use for DOM-specific initialization.
- **`Destroy()`**: Called automatically when the component is removed from the DOM. Do not call manually.

### 4. **Event System**

Components can emit custom events through the `Fire()` method:

```ts
export class Button extends Component<void, void, { click: { x: number; y: number } }> {
  handleClick(event: MouseEvent) {
    this.Fire('click', { x: event.clientX, y: event.clientY });
  }
  
  Template() {
    return button(
      { onClick: this.handleClick.bind(this) },
      () => 'Click me'
    );
  }
}
```

### 5. **Dependency Injection with @Inject**

Use the `@Inject` decorator to automatically inject dependencies into component properties:

```ts
export class DataService {
  getData() { return 'data'; }
}

export class ComponentWithService extends Component {
  // Inject the service using the @Inject decorator
  @Inject(DataService)
  private service: DataService;
  
  Template() {
    return div({}, () => this.service.getData());
  }
}
```

## Component Factory Methods

### `Component.ToFunction()`

Creates a factory function that generates vNode definitions for the component:

```ts
// Create a factory function
const helloFactory = Component.ToFunction(
  'div', // HTML tag name for the resulting vnode
  HelloWorld, // Component constructor
  'http://example.com/ns' // Optional XML namespace
);

// Use the factory to create a vnode
const helloVNode = helloFactory({
  data: () => ({ greeting: 'World', count: 42 }), // Data source
  props: { className: 'hello-component' }, // Static props
  on: { click: (event) => console.log('Clicked!') } // Event handlers
});

// The resulting vnode can be attached to the DOM
vNode.Attach(document.body, helloVNode);
```

### `Component.Register()`

Registers the component as a custom HTML element:

```ts
// Register as a WebComponent
Component.Register('hello-world', HelloWorld);

// Usage in HTML:
// <hello-world-component></hello-world-component>

// The generated tag name is always: ${name}-component
```

## How It Works Internally

1. **Component Creation**: When a component is instantiated (via `ToFunction` or `Register`), the framework:
   - Creates an `ObservableScope` for the component's data
   - Initializes the component with data, templates, and event handlers
   - Calls `Template()` to generate the initial UI

2. **Reactivity**: When data changes (via `@Value`, `@State`, or Store updates):
   - The `ObservableScope` detects the change
   - `Template()` is re-executed
   - The vNode tree is updated through the reconciliation system

3. **Event Handling**: Events defined in the `on` property of the component configuration are bound to the generated vNode.

4. **Lifecycle Management**: The framework automatically calls `Bound()` after mounting and `Destroy()` when removing the component.

## Integration with Other Systems

- **@Value/@State Decorators**: Use these decorators to create reactive properties within components
- **StoreSync/StoreAsync**: Use stores to manage shared state that components can access
- **ObservableScope**: The foundation of reactivity that components rely on
- **vNode**: The underlying virtual DOM representation that components generate
- **@Inject Decorator**: Used for dependency injection without constructor overrides

## Best Practices

1. **Never override the constructor** - The framework handles instantiation
2. **Use `this.Data` to read state** - Never mutate it directly
3. **Use `@Value` or `@State` decorators** for reactive properties
4. **Use `@Inject` decorator** for dependency injection (never override constructor)
5. **Use `Fire()`** to emit custom events
6. **Use `Bound()`** for DOM-specific initialization
7. **Do not call `Destroy()` manually** - It's handled automatically

## File References

- **Implementation**: `src/Node/component.ts`
- **VNode infrastructure**: `src/Node/vNode.ts`
- **Component events type**: `src/Node/component.types.ts`
- **VNode types**: `src/Node/vNode.types.ts`
- **Observable scope**: `src/Store/Tree/observableScope.ts`
- **Decorators**: `src/Utils/decorators.ts`
- **DOM helpers**: `src/DOM/index.ts`

---

*Next post*: DOM Elements — how to build vnode trees using the factories exported from `src/DOM/index.ts`.