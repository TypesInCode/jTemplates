---
title: "State vs. Value: Choosing the Right Decorator"
date: 2025-12-05
tags: [state, value, decorators, reactivity]
---

## Navigation
- Prev: [Reactive Updates](/2025-12-05-reactive-updates.md)
- Next: [Computed Decorator](/2025-12-06-computed-decorator.md)

## Introduction
Welcome to jTemplates! When you start building components, you’ll need a way to store data that the UI reacts to. jTemplates provides two decorators for this purpose:

- **`@State`** – for complex, mutable structures such as objects, arrays, or maps.
- **`@Value`** – for simple primitive values (string, number, boolean, etc.).

Both decorators hide the low‑level `ObservableScope` API, but they differ in how changes are applied to the DOM.

## How the Framework Updates the DOM (No Virtual DOM)
jTemplates does **not** use a virtual‑DOM diff. Instead, it directly reconciles the real DOM when a reactive scope changes. The core of this process lives in `src/Node/vNode.ts`:
- `UpdateChildren` schedules a call to `NodeConfig.reconcileChildren` (lines 44‑66) which patches the actual DOM nodes in place.
- For property and attribute updates, `ScheduledAssignment` (lines 82‑96) schedules a direct assignment on the element.

Thus, when a decorator triggers a change, the framework updates the *real* DOM efficiently without an intermediate virtual representation.

## `@State` – Complex Data
`@State` creates an **`ObservableNode`** that stores the whole value in its `root`. The implementation can be seen in `src/Utils/decorators.ts:45‑63`.
```ts
class TodoList extends Component {
  @State() items: Todo[] = [];

  add(todo: Todo) {
    // Replace the root – diff engine computes minimal changes
    this.items = [...this.items, todo];
  }
}
```
- **Root replacement** – assigning a new object/array replaces the node’s `root`. The diff engine (`StoreSync`/`StoreAsync`) computes a JSON‑Patch and `NodeConfig.reconcileChildren` updates only the affected DOM nodes.
- **Nested reactivity** – because the root can be any JSON‑serializable value, deep updates are handled by re‑assigning the parent structure or by using the store helpers (`store.Push`, `store.Splice`).
- **Performance** – only the changed paths are emitted, preserving element identity and event listeners.

## `@Value` – Primitive Data
`@Value` creates a lightweight **`ObservableScope`** that holds a single primitive. Its code lives in `src/Utils/decorators.ts:76‑98`.
```ts
class Counter extends Component {
  @Value() count = 0;

  increment() {
    this.count += 1; // triggers ObservableScope.Update automatically
  }
}
1196) schedules a direct assignment on the element.

Thus, when a decorator triggers a change, the framework updates the *real* DOM efficiently without an intermediate virtual representation.

## `@State` – Complex Data
`@State` creates an **`ObservableNode`** that stores the whole value in its `root`. The implementation can be seen in `src/Utils/decorators.ts:45‑63`.
```ts
class TodoList extends Component {
  @State() items: Todo[] = [];

  add(todo: Todo) {
    // Replace the root – diff engine computes minimal changes
    this.items = [...this.items, todo];
  }
}
```
- **Root replacement** – assigning a new object/array replaces the node’s `root`. The diff engine (`StoreSync`/`StoreAsync`) computes a JSON‑Patch and `NodeConfig.reconcileChildren` updates only the affected DOM nodes.
- **Nested reactivity** – because the root can be any JSON‑serializable value, deep updates are handled by re‑assigning the parent structure or by using the store helpers (`store.Push`, `store.Splice`).
- **Performance** – only the changed paths are emitted, preserving element identity and event listeners.

## `@Value` – Primitive Data
`@Value` creates a lightweight **`ObservableScope`** that holds a single primitive. Its code lives in `src/Utils/decorators.ts:76‑98`.
```ts
class Counter extends Component {
  @Value() count = 0;

  increment() {
    this.count += 1; // triggers ObservableScope.Update automatically
  }
}
```
- The setter updates the stored value and calls `ObservableScope.Update`, which schedules `ScheduledAssignment` (lines 82‑96) to assign the new value directly to the element’s property or attribute.
- No diffing is needed for primitives, making updates cheap and immediate.

## When to Use Which Decorator
| Use case | Decorator | Why |
|----------|-----------|-----|
| Lists, objects, maps, nested structures | `@State` | Diff‑based updates keep DOM patches minimal.
| Simple flags, counters, strings | `@Value` | Lightweight scope, direct assignment.

## Interaction with the Store (Optional)
If you need persistence, you can write the current state to a store:
```ts
this.store?.Write(this.items, "todos");
```
`@State` works naturally with `StoreSync`/`StoreAsync` because the diff engine already produces JSON patches. `@Value` can also be stored, but you’ll typically store the whole primitive value.

## Summary
- **`@State`** – complex, mutable data; uses `ObservableNode` and DOM diffing via `NodeConfig.reconcileChildren`.
- **`@Value`** – primitive data; uses `ObservableScope` with direct DOM assignments.
- Both decorators abstract away the low‑level reactivity API, letting you focus on building components.

---

**References**
- `StateDecorator` – `src/Utils/decorators.ts:45‑63`
- `ValueDecorator` – `src/Utils/decorators.ts:76‑98`
- DOM reconciliation – `src/Node/vNode.ts:44‑66`
- Scheduled assignments – `src/Node/vNode.ts:82‑96`
