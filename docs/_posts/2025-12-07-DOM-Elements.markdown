# DOM Elements

*File: `src/DOM/elements.ts`*

The DOM module provides **factory functions** that create virtual‑DOM (`vNode`) definitions for standard HTML elements. These factories replace manual calls to `vNode.Create` and make component templates concise.

## What the Module Exposes
```ts
export const div = vNode.ToFunction("div");
export const a = vNode.ToFunction("a");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
// ... other HTML tags
export const text = (callback: () => string) => {
  const textElement = vNode.ToFunction("text");
  return textElement({ props: () => ({ nodeValue: callback() }) });
};
```
Each exported constant is a **function** that accepts a `vNodeConfig` object (props, attrs, on, data) and optional children, returning a `vNode` ready for rendering.

## How Props and Events Are Assigned
The framework uses two helper functions internally:
- `createPropertyAssignment` – assigns property values and updates them reactively when a `props` function returns a new object.
- `createEventAssignment` – wires event listeners declared in the `on` object.
When a component supplies `props` or `on` as a function, an `ObservableScope` is created and watched, so changes trigger automatic DOM updates.
```ts
export const div = vNode.ToFunction("div");
export const a = vNode.ToFunction("a");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
// ... other HTML tags
export const text = (callback: () => string) => {
  const textElement = vNode.ToFunction("text");
  return textElement({ props: () => ({ nodeValue: callback() }) });
};
```
Each exported constant is a **function** that accepts a `vNodeConfig` object (props, attrs, on, data) and optional children, returning a `vNode` ready for rendering.

## How Props and Events Are Assigned
The framework uses two helper functions internally:
- `createPropertyAssignment` – assigns property values and updates them reactively when a `props` function returns a new object.
- `createEventAssignment` – wires event listeners declared in the `on` object.
When a component supplies `props` or `on` as a function, an `ObservableScope` is created and watched, so changes trigger automatic DOM updates.

## Example: Simple Counter Component
```ts
import { Component, ObservableScope } from 'j-templates';
import { div, button } from 'j-templates/DOM';

interface State { count: number }

class Counter extends Component<{ count: number }, void> {
  // Local observable scope to hold mutable state
  private state = { count: 0 };
  private counterScope = ObservableScope.Create(() => this.state);

  private inc() {
    this.state.count++;
    ObservableScope.Update(this.counterScope);
  }

   Template() {
+    return div({
+      // Props are supplied as a function for reactivity
+      props: () => ({
+        style: { fontFamily: 'sans-serif', padding: '0.5rem' },
+      }),
+      // Event handlers are also reactive
+      on: () => ({
+        click: () => this.inc(),
+      }),
+    }, [
+      // Child nodes – a text node showing the count and a button
+      div({}, () => `Count: ${ObservableScope.Value(this.counterScope).count}`),
+      button({}, () => 'Increment'),
+    ]);
+  }

}

// Register as a custom element <counter-component>
Component.Register('counter', Counter);
```
**Explanation**
- `div` and `button` are imported from `j-templates/DOM` and used directly.
- `props` returns an object; the framework creates an `ObservableScope` that watches the returned value, so any change to `this.Data` re‑evaluates the function and updates the DOM via `createPropertyAssignment`.
- `on` returns an object mapping event names to callbacks; `createEventAssignment` ensures listeners are attached/detached when the vnode updates.
- Child nodes are supplied as an array; they can be other factory calls or plain strings (the `text` helper could also be used).

## When to Use the Helpers Directly
If you need fine‑grained control, you can import the low‑level helpers:
```ts
import { CreatePropertyAssignment } from 'j-templates/DOM/createPropertyAssignment';
import { CreateEventAssignment } from 'j-templates/DOM/createEventAssignment';
```
These are rarely needed in typical component templates because the `props`/`on` functions abstract the details.

## File References
- **Factory definitions**: `src/DOM/elements.ts`
- **Property assignment**: `src/DOM/createPropertyAssignment.ts`
- **Event assignment**: `src/DOM/createEventAssignment.ts`
- **Underlying vnode creation**: `src/Node/vNode.ts`

---
*Next post*: ObservableScope – how reactive scopes are created, read, and watched.
