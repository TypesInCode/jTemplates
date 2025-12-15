# Component

*File: `src/Node/component.ts`*

This post introduces the core building block of the jTemplates framework – the **Component** class. A component encapsulates UI logic, state, and lifecycle hooks.

## Key Features
- **Lifecycle methods**: `Template()`, `Bound()`, `Destroy()`.
- **State handling** via an internal `ObservableScope` (`Scope`, `Data`).
- **Dependency injection**: `this.Injector` gives access to the vnode injector.
- **Event system**: `Fire(event, data)` triggers events defined in `ComponentEvents`.
- **WebComponent registration**: `Component.Register(name, constructor)` creates a custom element (`<name-component>`).
- **Function wrapper**: `Component.ToFunction(type, constructor, namespace?)` returns a factory that produces a vnode definition.

## Correct Component Declaration
The component class **does not override its constructor**. The type parameters order is **Data, Templates, Events** (Events optional).

```ts
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

interface Props { greeting: string }

// Data = Props, Templates = void, Events = void
class HelloWorld extends Component<Props, void, void> {
  // No constructor – the framework supplies data, templates, vnode, and events.

  Template() {
    // Use DOM helper functions from src/DOM/elements.ts
    // These helper functions (div, span, etc.) return vnode definitions
    // that are compatible with the Template() method's return type (vNodeType | vNodeType[])
    return div({}, () => this.Data.greeting);
  }
}

// Register as a WebComponent (tag becomes "hello-component")
Component.Register("hello", HelloWorld);

// Create a vnode factory using Component.ToFunction
// The first parameter "div" specifies the HTML tag name for the resulting vnode
// The second parameter is the Component constructor
const helloFactory = Component.ToFunction("div", HelloWorld);
// Use the factory to create a vnode instance (no additional props)
const helloVNode = helloFactory({});
```

## How It Works Internally
- The framework creates an `ObservableScope` for the component's data. Updates trigger re‑rendering via the vnode's internal mechanisms.
- `Component.ToFunction` builds a vnode definition containing:
  - `type` – the HTML tag name.
  - `namespace` – optional XML namespace.
  - `props` – static or dynamic properties.
  - `componentConstructor` – a subclass of `Component` that will be instantiated when the vnode is rendered.
- `Component.Register` attaches a shadow DOM to the custom element and mounts the vnode produced by the factory.

## File References
- **Implementation**: `src/Node/component.ts`
- **VNode infrastructure**: `src/Node/vNode.ts`
- **Observable scope**: `src/Store/Tree/observableScope.ts`
- **Component events type**: `src/Node/component.types.ts`

## Things to Remember
- Do not call `Destroy` manually on a component that is managed by the framework; it will be called automatically when the vnode is removed.
- Use the `Fire` method to emit custom events; listeners are provided via the `on` property in the component configuration.
- When registering a WebComponent, the generated tag name is `${name}-component`.

---
*Next post*: DOM Elements – how to build vnode trees using the factories exported from `src/DOM/index.ts`.
