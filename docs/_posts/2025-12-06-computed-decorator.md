---
title: "Using @Computed and @ComputedAsync"
date: 2025-12-06
tags: [computed, decorator, reactivity]
---

## Navigation
- Prev: [State vs. Value](/2025-12-05-state-vs-value.md)
- Next: None

## Introduction
`@Computed` and `@ComputedAsync` let you define read‑only derived values that automatically update the UI when the state they depend on changes. They hide the low‑level `ObservableScope` API and keep your components declarative.

## What `@Computed` Does
`@Computed` creates a **getter scope** that watches any `@State`/`@Value` accessed inside the getter. The value is written to a temporary **StoreSync** and exposed via a read‑only scope.

- Implementation: `src/Utils/decorators.ts:49‑84` (factory at 43‑63).
- DOM update: scheduled through `ScheduledAssignment` in `src/Node/vNode.ts:82‑96`.

### How it works (step‑by‑step)
1. The decorator creates `getterScope = ObservableScope.Create(getter)`.
2. `ObservableScope.Watch(getterScope, ...)` writes the evaluated value to a `StoreSync` (`store.Write`).
3. `propertyScope = ObservableScope.Create(() => store.Get('root', defaultValue))` reads from the store.
4. When any dependent state changes, the store diff triggers `ObservableScope.Update`, which eventually schedules a DOM update.

### Example (synchronous getter)
```ts
class Cart extends Component {
  @State() items: Item[] = [];

  @Computed(0)
  get total() {
    return this.items.reduce((s, i) => s + i.price, 0);
  }
}
```
The `total` property updates automatically whenever `items` changes; you can bind it in a template with `{ data: () => this.total }`.

## What `@ComputedAsync` Does
`@ComputedAsync` follows the same pattern but uses **StoreAsync** internally, which queues writes and performs diffing asynchronously. **Important:** the getter must still return a plain value; it does **not** return a `Promise`. The async behavior is limited to the store's write queue.

- Implementation: `src/Utils/decorators.ts:98‑138` (factory at 92‑108).
- Store: `src/Store/Store/storeAsync.ts:1‑82`.

### How it works (step‑by‑step)
1. `getterScope = ObservableScope.Create(async () => getter.call(this))` – the async wrapper allows the store to handle writes asynchronously.
2. `ObservableScope.Watch(getterScope, ...)` writes the value to a `StoreAsync` (`asyncStore.Write`).
3. `propertyScope = ObservableScope.Create(() => asyncStore.Get('root', defaultValue))` reads the cached value.
4. `StoreAsync` queues the write via `AsyncQueue.Next` and applies the diff, which eventually triggers `ObservableScope.Update` and a scheduled DOM update.

### Example (still a synchronous getter)
```ts
class UserStats extends Component {
  @State() userId = 1;

  @ComputedAsync(null)
  get userInfo() {
    // Must return a plain object; the async store will handle the write queue.
    return this.userCache[this.userId] ?? { name: "Guest", points: 0 };
  }
}
```
Even though the decorator uses an async store, the getter itself returns a normal value. The store queues the write, making it safe for high‑frequency updates.

## Best‑Practice Checklist
- Provide a default value – used while the store is empty.
- Keep the getter pure – no side effects, network calls, or mutations.
- Do **not** return a `Promise` from a `@ComputedAsync` getter.
- Use `@State` or `@Value` for the raw mutable data the computed getter reads.
- Rely on component destruction (`@Destroy`) to clean up the internal async store.
- Prefer `@Computed` for cheap derivations; use `@ComputedAsync` only when you need the async write queue (e.g., many rapid updates).

## Common Pitfalls & Debugging Tips
- Returning a `Promise` from a `@ComputedAsync` getter results in `undefined` because the store expects a plain value.
- Mutating the returned object directly bypasses reactivity – treat the result as immutable and reassign if it changes.
- Forgetting to include all dependent state in the getter prevents the framework from tracking updates.

## Summary
`@Computed` gives you a synchronous derived value; `@ComputedAsync` gives the same but writes through an asynchronous store, not through a promise‑returning getter.

## References
- `ComputedDecorator` – `src/Utils/decorators.ts#L49`
- `ComputedAsyncDecorator` – `src/Utils/decorators.ts#L98`
- `StoreSync` – `src/Store/Store/storeSync.ts`
- `StoreAsync` – `src/Store/Store/storeAsync.ts`
- `ScheduledAssignment` (DOM update) – `src/Node/vNode.ts#L82`
- `UpdateChildren` / `reconcileChildren` – `src/Node/vNode.ts#L44`
