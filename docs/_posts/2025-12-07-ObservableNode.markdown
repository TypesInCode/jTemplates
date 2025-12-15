# ObservableNode

*File: `src/Store/Tree/observableNode.ts*`

This post covers **ObservableNode**, the proxy-based observable object system that underpins jTemplates' reactivity. An `ObservableNode` wraps plain JavaScript objects and arrays with a Proxy to intercept property access and mutations, automatically tracking dependencies through an `ObservableScope` system to enable fine-grained UI updates.

## Core Concepts

- **Proxy-Based Interception**: `ObservableNode.Create(value)` returns a Proxy that intercepts all property reads and writes on the target object/array. This allows the system to track which properties are accessed during computation and automatically notify dependents when they change.

- **Scope Tracking**: Each proxied object/array has an associated `IObservableScope` stored in `scopeCache`. For nested properties, leaf scopes are stored in `leafScopeCache` to enable fine-grained updates when specific properties change.

- **Read-Only Proxies**: When a custom `alias` function is provided to `CreateProxyFactory`, the resulting proxy becomes read-only. This is because the proxy operates on a transformed version of the original data rather than the original itself. Attempts to modify read-only proxies throw errors.

## Basic Usage

```ts
import { ObservableNode, ObservableScope } from 'j-templates';

// Create a mutable proxy object
const state = ObservableNode.Create({ count: 0, list: [] });

// Accessing properties through the proxy automatically tracks dependencies
const count = state.count; // Triggers proxy getter, automatically tracks scope

// Mutating properties triggers scope updates
state.count++; // Triggers ObservableScope.Update for the leaf scope
state.list.push('item'); // Triggers update for the array scope

// Access nested properties - each level is tracked separately
const firstItem = state.list[0]; // Tracks the array and the specific index
```

## Reactivity Use Cases

- **Component State**: ObservableNode objects can be used as component local state. Any mutation triggers re-render of the component's vnode through the scope system.

- **Array Mutations**: Array operations like `push`, `splice`, `sort`, etc., are intercepted and properly tracked. The system updates the appropriate leaf scopes when array contents change.

- **Nested Objects**: Deep property reads and writes are tracked via leaf scopes, enabling fine-grained updates. Only the specific nested property that changes triggers updates, not the entire object.

- **Store Access**: When accessing objects through stores (e.g., `store.Get(key)`), the returned ObservableNode objects are read-only. State changes must be performed via store methods (`Write`, `Patch`, `Push`, `Splice`) which generate diffs and update the store's internal state.

## File References

- **Implementation**: `src/Store/Tree/observableNode.ts`
- **Scope utilities**: `src/Store/Tree/observableScope.ts`

---

*Next post*: StoreSync & StoreAsync – synchronous vs asynchronous store APIs (`src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`).