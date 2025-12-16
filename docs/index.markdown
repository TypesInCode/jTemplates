---
layout: home
---

<iframe src="https://codesandbox.io/embed/yskttf?view=editor+%2B+preview&module=%2Fsrc%2Findex.ts"
     style="width:100%; height: 500px; border:0; border-radius: 4px; overflow:hidden;"
     title="j-templates Hello World"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>

# Welcome to jTemplates

jTemplates is a lightweight, reactive JavaScript framework for building dynamic user interfaces with a component-based architecture. It combines a virtual DOM, observable state management, and a simple decorator system to create highly responsive applications without the overhead of larger frameworks.

## Core Concepts

### Components
Components are the building blocks of jTemplates applications. Each component encapsulates UI logic, state, and rendering through a simple class-based API. Components can be rendered as virtual DOM nodes or registered as custom HTML elements.

```typescript
import { Component } from 'j-templates';
import { div, button } from 'j-templates/DOM';

class Counter extends Component<{ count: number }> {
  @State()
  private state: { count: number } = { count: 0 };

  private inc() {
    this.state.count++;
  }

  Template() {
    return div({}, () => [
      div({}, () => `Count: ${this.state.count}`),
      button({ on: { click: this.inc.bind(this) } }, () => 'Increment')
    ]);
  }
}

Component.Register('counter', Counter);
```

### Reactivity
jTemplates uses a fine-grained reactivity system based on `ObservableScope` and `ObservableNode` to track dependencies and trigger updates only when necessary. Changes to state are automatically propagated to the UI without manual DOM manipulation.

### DOM Elements
The `j-templates/DOM` module provides factory functions for creating virtual DOM elements (`div`, `button`, `input`, etc.) with built-in support for reactive props, events, and children.

```typescript
// Reactive props
const container = div({
  props: () => ({
    style: { color: this.Data.color }
  })
}, () => [
  // Reactive children
  div({}, () => this.Data.text)
]);
```

### Decorators
jTemplates provides a set of decorators to simplify state management:

- `@State()` - For mutable complex state objects
- `@Value()` - For simple reactive values (strings, numbers, booleans)
- `@Computed()` / `@ComputedAsync()` - For derived values with deep diffing
- `@Scope()` - For simple computed values without deep diffing
- `@Inject()` - For dependency injection
- `@Destroy()` - For cleanup of resources

### Stores
For shared state across components, jTemplates offers `StoreSync` and `StoreAsync`:

- `StoreSync`: Synchronous, ideal for small datasets
- `StoreAsync`: Asynchronous using WebWorkers, ideal for large datasets

```typescript
import { StoreSync } from 'j-templates';

const store = new StoreSync(value => value.id);
store.Write({ id: 'user1', name: 'Alice' });
const user = store.Get('user1'); // Returns a read-only proxy
```

## Getting Started

1. Install jTemplates: `npm install j-templates`
2. Import components and DOM helpers
3. Define your first component
4. Register it as a custom element or render it as a virtual node

Explore the documentation sections to learn more about each concept in depth.
