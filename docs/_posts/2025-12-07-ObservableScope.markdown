# ObservableScope

*File: `src/Store/Tree/observableScope.ts`*

`ObservableScope` is the primitive building block of jTemplates’ reactivity system. It wraps a value‑producing function and notifies dependents when the value changes.

## Core API
```ts
import { ObservableScope } from 'j-templates';

// External mutable state
const state = { count: 0 };
// Create a synchronous scope that reads from the external state
const countScope = ObservableScope.Create(() => state.count);

// Read the current value (read‑only)
const current = ObservableScope.Value(countScope); // 0

// Update the external state and notify the scope
state.count++;
ObservableScope.Update(countScope);
```

## Watching a Scope
```ts
function logValue(scope: any) {
  console.log('value →', ObservableScope.Value(scope));
}
ObservableScope.Watch(countScope, logValue);
// Initial log: value → 0
// After update (above) logs: value → 1
```

*Explanation*
- `ObservableScope.Create` builds a scope from a mutable `state` object.
- `ObservableScope.Value(scope)` reads the current snapshot; it is **read‑only**.
- `ObservableScope.Update(scope)` marks the scope dirty and schedules a re‑evaluation, allowing dependent vNodes to refresh.
- `ObservableScope.Watch` can be used for side‑effects or debugging.

## Dependent Scope Example
```ts
import { ObservableScope } from 'j-templates';

// Base mutable state
const state = { count: 0 };
// Parent scope reading the count
const parentScope = ObservableScope.Create(() => state.count);
// Child scope that derives a value from the parent scope using a new ObservableScope
const doubleScope = ObservableScope.Create(() => ({
  doubled: ObservableScope.Value(parentScope) * 2
}));

// Initial read
console.log('double:', ObservableScope.Value(doubleScope).doubled); // 0

// Mutate the base state and update parent
state.count = 5;
ObservableScope.Update(parentScope);

// Child automatically reflects the change
console.log('double after update:', ObservableScope.Value(doubleScope).doubled); // 10
```
## File References
- **Implementation**: `src/Store/Tree/observableScope.ts`
- **Component integration**: `src/Node/component.ts`
- **VNode handling**: `src/Node/vNode.ts`

---
*Next post*: ObservableNode – proxy‑based observable objects and how they integrate with scopes.