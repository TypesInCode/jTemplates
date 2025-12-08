# ObservableNode

*File: `src/Store/Tree/observableNode.ts`

This post covers **ObservableNode**, the proxy‑based observable object system that underpins jTemplates’ reactivity. An `ObservableNode` wraps plain JavaScript objects/arrays with a Proxy so that any property read or write is tracked by an `ObservableScope`, enabling automatic UI updates.

## Core Concepts
- **Proxy Creation** – `ObservableNode.Create(value)` returns a proxy that mirrors the original value while intercepting gets/sets.
- **Read‑only Mode** – Passing an `alias` to `CreateProxyFactory` produces a read‑only proxy; attempts to modify throw an error.
- **Scope Caching** – Each object/array has an associated `IObservableScope` stored in `scopeCache` or `leafScopeCache` for leaf properties.

## Basic Usage
```ts
import { ObservableNode, ObservableScope } from 'j-templates';

// Create a mutable proxy object
const state = ObservableNode.Create({ count: 0, list: [] });

// Read a value – automatically tracks the scope
const count = ObservableScope.Value(state.count);
console.log('count →', count); // 0

// Mutate – updates scopes and notifies dependents
state.count++; // triggers ObservableScope.Update for the leaf scope
```

## Reactivity Use Cases
- **Component state**: Proxy objects can be used as component local state; any mutation triggers re‑render of the component's vnode.
- **Derived scopes**: `ObservableScope.Create` can derive values from other scopes, automatically updating when the source changes.
- **Array mutations**: Operations like `push`, `splice`, `sort`, etc., are intercepted; the corresponding leaf scopes are refreshed.
- **Nested objects**: Deep property reads/writes are tracked via leaf scopes, enabling fine‑grained updates.
- **Computed values**: `ObservableScope.CalcScope` (exposed as `calc`) creates read‑only computed scopes that recompute when dependencies change.
- **Batch updates**: Multiple mutations within the same tick are queued and processed together for efficiency.

## File References
- **Implementation**: `src/Store/Tree/observableNode.ts`
- **Scope utilities**: `src/Store/Tree/observableScope.ts`
- **JSON diff helpers**: `src/Utils/json.ts`

---
*Next post*: StoreSync & StoreAsync – synchronous vs asynchronous store APIs (`src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`).
