# Component

*File: `src/Node/component.ts`*

The **Component** class is the fundamental building block of jTemplates' component‑based UI architecture. It encapsulates UI logic, state management, lifecycle hooks, and event handling in a reusable, reactive unit.

## Core Architecture

Components are defined as classes that extend the base `Component` class. The three generic type parameters have default values:

- **D** – Data type for the component's scoped state (default: `void`)
- **T** – Template type for the component's template collection (default: `void`)
- **E** – Event map type for component events (default: `{}`)

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

/* Define data interface */
interface Props {
  greeting: string;
  count: number;
}

/* Define template collection interface */
interface Templates {
  main: () => vNodeType;
  header: () => vNodeType;
}

/* Define event map interface */
interface Events {
  click: { x: number; y: number };
  update: string;
}

/* Component declaration – DO NOT override constructor */
export class HelloWorld extends Component<Props, Templates, Events> {
  /* Framework provides: data, templates, vnode, and events */
  /* Access via: this.Data, this.Templates, this.VNode, this.Injector */

  Template(): vNodeType | vNodeType[] {
    return div({}, () => `Hello ${this.Data.greeting}! Count: ${this.Data.count}`);
  }

  Bound(): void {
    /* Called after component is bound to DOM */
  }
}

/* For simple components with no data, templates, or events */
export class SimpleComponent extends Component {
  Template() {
    return div({}, () => 'Simple component');
  }
}
```

## Key Features

### Reactivity & State
Components automatically receive an `ObservableScope` for their data, providing reactivity:

```ts
export class Counter extends Component<{ count: number }> {
  get count() {
    return this.Data.count;
  }

  increment() {
    /* Potentially emit an event to increment the external state */
  }

  Template() {
    return div({}, () => `Count: ${this.count}`);
  }
}
```

### Rendering & Lifecycle
- **`Template()`** – Required. Returns the component's UI as vNodes.  
- **`Bound()`** – Optional. Called after the component is attached to the DOM. Use for DOM‑specific initialization.  
- **`Destroy()`** – Called automatically when the component is removed from the DOM. Do not call manually.  

```ts
export class Button extends Component<void, void, { click: { x: number; y: number } }> {
  handleClick(event: MouseEvent) {
    this.Fire('click', { x: event.clientX, y: event.clientY });
  }

  Template() {
    return button(
      { on: { click: this.handleClick.bind(this) } },
      () => 'Click me'
    );
  }
}
```

### Dependency Injection
Use the `@Inject` decorator to automatically inject dependencies:

```ts
export class DataService {
  getData() { return 'data'; }
}

export class ComponentWithService extends Component {
  @Inject(DataService) private service: DataService; // lookup
  @Inject(DataService) private setService = new DataService(); // local instance

  Template() {
    return div({}, () => this.service.getData());
  }
}
```

## Component Factory Methods

### `Component.ToFunction()`

Creates a factory function that generates vNode definitions for the component:

```ts
const helloFactory = Component.ToFunction(
  'div',
  HelloWorld,
  'http://example.com/ns'
);

const helloVNode = helloFactory({
  data: () => ({ greeting: 'World', count: 42 }),
  props: { className: 'hello-component' },
  on: { click: (event) => console.log('Clicked!') }
});

vNode.Attach(document.body, helloVNode);
```

### `Component.Register()`

Registers the component as a custom HTML element:

```ts
Component.Register('hello-world', HelloWorld);
```

Usage in HTML:

```html
<hello-world-component></hello-world-component>
```

The generated tag name is always: `${name}-component`.

## Component Factory Example

### Passing Templates from Parent

The component's `templates` object is supplied by the parent when the component is instantiated. Below is a minimal example that shows how a parent can provide a template collection and how the component calls `this.Templates.main()` inside its `Template()` method.

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

/* Component defines a `main` template */
export class Hello extends Component<{}, { main: () => vNodeType }, {}> {
  Template(): vNodeType {
    return this.Templates.main();
  }
}

/* Parent‑side factory usage */
const helloFactory = Component.ToFunction('div', Hello);

const helloVNode = helloFactory(
  {
    props: { className: 'greeting' },
    on: { click: () => console.log('clicked') },
  },
  {
    main: () => div({}, () => 'Hello, world!'),
  }
);

vNode.Attach(document.body, helloVNode);
```

This example illustrates that the `templates` object is passed as the second argument to `Component.ToFunction` and is accessed via `this.Templates.main()` inside the component.

## How It Works Internally

1. **Component Creation** – When a component is instantiated (via `ToFunction` or `Register`), the framework:
   - Creates an `ObservableScope` for the component's data
   - Initializes the component with data, templates, and event handlers
   - Calls `Template()` to generate the initial UI

2. **Reactivity** – When data changes (via `@Value`, `@State`, or Store updates):
   - The `ObservableScope` detects the change
   - `Template()` is re‑executed
   - The vNode tree is updated through the reconciliation system

3. **Event Handling** – Events defined in the `on` property of the component configuration are bound to the generated vNode.

4. **Lifecycle Management** – The framework automatically calls `Bound()` after mounting and `Destroy()` when removing the component.

## Integration with Other Systems

- **@Value/@State Decorators** – Create reactive properties within components  
- **StoreSync/StoreAsync** – Manage shared state that components can access  
- **ObservableScope** – Foundation of reactivity  
- **vNode** – Virtual DOM representation generated by components  
- **@Inject Decorator** – Dependency injection without constructor overrides  

## Best Practices

1. Never override the constructor – the framework handles instantiation  
2. Use `this.Data` to read state – never mutate it directly  
3. Use `@Value` or `@State` decorators for reactive properties  
4. Use `@Inject` decorator for dependency injection (never override constructor)  
5. Use `Fire()` to emit custom events  
6. Use `Bound()` for DOM‑specific initialization  
7. Do not call `Destroy()` manually – it is handled automatically  

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
