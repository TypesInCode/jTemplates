# DOM Elements

*File: `src/DOM/elements.ts`*

The DOM module provides factory functions for creating virtual DOM (`vNode`) elements using standard HTML tags. These functions replace manual `vNode.Create` calls, enabling clean, declarative template construction with built‑in reactivity.

## Core Functionality

Each exported function (e.g., `div`, `button`, `a`) is a `vNode.ToFunction()` wrapper that accepts a `vNodeConfig` and optional children, returning a `vNode` ready for rendering:

```ts
export const div = vNode.ToFunction("div");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
export const text = (callback: () => string) => {
  return vNode.ToFunction("text")({ props: () => ({ nodeValue: callback() }) });
};
```

## Reactive vs Static Configuration

Props, events, and children can be provided as **static values** or **reactive functions**:

- **Static** – Plain objects or arrays; assigned once, no reactivity.
  ```ts
  div({ props: { className: 'container' } }, [
    button({ on: { click: () => console.log('clicked') } }, () => 'Click')
  ])
  ```

- **Reactive** – Functions returning values; automatically tracked via `ObservableScope` and re‑evaluated when dependencies change.
  ```ts
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

When a function is used, the framework:
- Creates an `ObservableScope` around it.
- Watches for changes to its dependencies (e.g., `this.Data`, `@State`, `@Value`).
- Automatically re‑runs the function and updates the DOM.

## Child Nodes

Children can be:
- Static arrays of `vNode` or strings.
- Reactive functions returning arrays or a single `vNode`.

```ts
// Static children
div({}, [
  button({}, () => 'OK'), 
  button({}, () => 'Cancel')
])

// Reactive children (preferred)
div({ data: () => this.Data.items }, (item) => div({}, () => item.name));
```

### Data Property Behaviors

The `data` argument passed to a DOM factory (e.g., the first argument of `div({ … }, …)`) behaves as follows:

1. **Falsy values hide/destroy children** – `null`, `undefined`, `false`, `0`, or `''` removes all existing children and renders nothing.  
2. **Arrays are auto‑iterated** – When `data` is an array (`T[]`), the provided `children` function is called for each element (`(data: T) => vNodeType`). The returned vNodes are concatenated.  
   - Signature: `data: T[]`, `children: (data: T) => vNodeType`.  
3. **Objects are treated as a single child** – Non‑array, non‑falsy values render as one child using the supplied children function or static content.

**Preferred pattern** – Pass the data as a function and render each item directly in the children callback:

```ts
Template() {
  return div({ data: () => this.Data.items }, (item) => div({}, () => item.name));
}
```

### Data Property Behaviors

The `data` argument passed to a DOM factory (e.g., the first argument of `div({ … }, …)`) behaves as follows:

1. **Falsy values hide/destroy children** – `null`, `undefined`, `false`, `0`, or `''` removes all existing children and renders nothing.  
2. **Arrays are auto‑iterated** – When `data` is an array (`T[]`), the provided `children` function is called for each element (`(data: T) => vNodeType`). The returned vNodes are concatenated.  
   - Signature: `data: T[]`, `children: (data: T) => vNodeType`.  
3. **Objects are treated as a single child** – Non‑array, non‑falsy values render as one child using the supplied children function or static content.

**Best‑practice pattern** – Map over data directly in the children callback without manually creating arrays:

```ts
Template() {
  return div({ data: () => this.Data.items }, (item) => div({}, () => item.name));
}
```

## Internal Mechanics

The framework uses these utilities to handle assignments:

- `createPropertyAssignment` – Updates element properties (e.g., `style`, `className`) when `props` is a function.  
- `createEventAssignment` – Attaches/detaches event listeners when `on` is a function.  
- `createAttributeAssignment` – Updates attributes (e.g., `aria-label`) from `attrs`.  

These are automatically invoked based on whether values are static or reactive; no manual setup is required.

## Example: Reactive Counter

```ts
import { Component } from 'j-templates';
import { div, button } from 'j-templates/DOM';

interface State { count: number }

class Counter extends Component<State, void> {
  @State()
  private state: State = { count: 0 };

  private inc() {
    this.state.count++; // ✅ Reactive — triggers automatic update
  }

  Template() {
    return div({
      props: () => ({
        style: { fontFamily: 'sans-serif', padding: '0.5rem' },
      }),
      on: () => ({
        click: () => this.inc(),
      }),
    }, [
      div({}, () => `Count: ${this.state.count}`),
      button({}, () => 'Increment'),
    ]);
  }
}

Component.Register('counter', Counter);
```

> **Note** – Direct mutation of non‑decorated state (e.g., `this.state.count++` without `@State()`) will not trigger updates. Always use `@State()`, `@Value()`, or `StoreSync` for reactive state.

## Summary

- **Static vs Reactive**: Choose static for constant values; use reactive functions for any `this.Data`, `@State`, or `@Value` dependencies.  
- **Children**: Can be static arrays, strings, or reactive functions that return arrays/objects.  
- **Data Prop**: Falsy values clear children; arrays auto‑iterate over the `children` callback; objects render as a single child.  
- **Best Practice**: Pass a `data` function and map inside the `children` callback; avoid manual array creation inside `Template()`.  
- **Lifecycle**: `Template()` must return vNodes; `Bound()` runs after mounting; `Destroy()` is automatic.

## File References

- **Factory definitions**: `src/DOM/elements.ts`  
- **Property assignment**: `src/DOM/createPropertyAssignment.ts`  
- **Event assignment**: `src/DOM/createEventAssignment.ts`  
- **Attribute assignment**: `src/DOM/createAttributeAssignment.ts`  
- **VNode creation**: `src/Node/vNode.ts`  
- **Reactivity**: `src/Store/Tree/observableScope.ts`  
- **Decorators**: `src/Utils/decorators.ts`  

---  

*Next post*: ObservableScope — how reactive scopes are created, read, and watched.
