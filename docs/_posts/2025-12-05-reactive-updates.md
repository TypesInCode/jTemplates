---
layout: post
title: "Reactive Updates in jTemplates"
date: 2025-12-05 00:00:00 -0400
categories: understanding tutorial
---

## Navigation
- Prev: [Getting Started with jTemplates](/2025-12-05-getting-started-with-jtemplates.markdown)
- Next: [State vs. Value Decorators](/2025-12-05-state-vs-value.md)

## Introduction
jTemplates updates the real DOM directly – there is **no virtual‑DOM diff**. The framework relies on **ObservableScope** to track which parts of the UI depend on which pieces of data and patches only the affected nodes.

## How the Framework Applies Changes
1. A component’s `data` function returns `ObservableScope.Value(scope)` – this registers the read as a dependency. (`src/Store/Tree/observableScope.ts:41‑46`)
2. When you mutate the underlying object you call `ObservableScope.Update(scope)`. (`src/Store/Tree/observableScope.ts:80‑86`)
3. `ObservableScope.Update` marks the scope dirty, schedules a micro‑task, and eventually triggers `NodeConfig.reconcileChildren` which patches the real DOM in place. (`src/Node/vNode.ts:66‑70`)

## ObservableScope Basics
```ts
import { ObservableScope } from 'j-templates/Store/Tree/observableScope';

// Plain mutable state
const counter = { count: 0 };

// Wrap the state in a reactive scope – the getter is called whenever the UI reads the value
const counterScope = ObservableScope.Create(() => counter);

// Read the current value (registers a dependency)
const value = ObservableScope.Value(counterScope);
```
- The getter (`() => counter`) is **pure** – it only returns the current state.
- `ObservableScope.Value` records the read so the framework knows which UI parts depend on `counterScope`.

## Updating the UI
```ts
// Mutate the state
counter.count++;

// Notify listeners – this triggers a DOM patch for any dependent vNode
ObservableScope.Update(counterScope);
```
Only the nodes that called `ObservableScope.Value(counterScope)` are scheduled for update; the rest of the DOM is untouched.

## Data Binding in vNodes
```ts
import { div } from 'j-templates/DOM';

// The `data` property expects a function that returns the current value
const counterNode = div({
  data: () => ObservableScope.Value(counterScope)
}, (data) => `Count: ${data.count}`);
```
- The child callback receives the latest value each time the scope updates.
- No need for keys – the framework reconciles children by **object identity**.

## Automatic Array Iteration
```ts
import { div } from 'j-templates/DOM';

const items = [{ id: 1, text: 'A' }, { id: 2, text: 'B' }];
const itemsScope = ObservableScope.Create(() => items);

const listNode = div({
  data: () => ObservableScope.Value(itemsScope)
}, (item) => div({}, item.text));
```
- When `items` changes (e.g., `items.push(...)`), call `ObservableScope.Update(itemsScope)` and the framework will add, remove, or reorder DOM nodes accordingly.

## Best‑Practice Checklist
- Keep state objects **plain** and **mutable**; the getter should only return the object.
- Always call `ObservableScope.Update(scope)` after mutating the underlying data.
- Use **arrow functions** for the child callback so the framework tracks the correct dependency.
- For arrays, provide the whole array via `data:` – the framework handles iteration; avoid manual `.map()` inside the template.
- Batch multiple mutations and call `ObservableScope.Update` **once** to minimise DOM patches.

## Debugging Tips
- **Missing update?** Verify you called `ObservableScope.Update(scope)` after the mutation.
- **Wrong source?** Ensure the `data` function reads from the scope (`ObservableScope.Value(scope)`). Returning a plain variable bypasses reactivity.
- **Too many renders?** Consolidate related changes and invoke `ObservableScope.Update` a single time.

## Summary
- jTemplates patches the **real DOM** directly via `NodeConfig.reconcileChildren`.
- `ObservableScope` is the core reactive primitive – it tracks reads, marks dirty scopes, and schedules minimal DOM updates.
- Providing data through `data: () => ObservableScope.Value(scope)` gives you automatic reactivity for primitives, objects, and arrays.

**References**
- `ObservableScope.Create` – `src/Store/Tree/observableScope.ts:41`
- `ObservableScope.Value` – `src/Store/Tree/observableScope.ts:44`
- `ObservableScope.Update` – `src/Store/Tree/observableScope.ts:80`
- DOM reconciliation – `src/Node/vNode.ts:66`
