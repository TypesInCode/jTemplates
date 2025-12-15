# ObservableScope

*File: `src/Store/Tree/observableScope.ts`*

`ObservableScope` is the fundamental reactivity primitive in jTemplates. It wraps a value-producing function and automatically tracks dependencies to notify observers when the value changes.

## Core API

```ts
import { ObservableScope } from 'j-templates';

// External mutable state
const state = { count: 0 };

// Create a scope that reads from external state
const countScope = ObservableScope.Create(() => state.count);

// Read the current value (read-only)
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

// Register a watcher that will be called when the scope changes
ObservableScope.Watch(countScope, logValue);
// Initial log: value → 0

// After updating the state:
state.count = 5;
ObservableScope.Update(countScope);
// Subsequent log: value → 5
```

## Key Principles

### 1. **Read-Only Access**
`ObservableScope.Value(scope)` is a read-only operation. It returns the current value of the scope but does not allow modification of the underlying state.

### 2. **Dependency Tracking**
When a scope's function accesses other values (including other scopes), those dependencies are automatically tracked. When any dependency changes, the scope is marked as dirty and will recompute its value on the next access.

### 3. **Explicit Updates**
Changes to external state must be followed by `ObservableScope.Update(scope)` to notify the scope system of changes. The scope doesn't automatically detect changes to external variables.

### 4. **No Automatic Re-evaluation**
Unlike some reactivity systems, ObservableScope doesn't automatically recompute values when dependencies change. The value is only recomputed when `ObservableScope.Value()` is called after `ObservableScope.Update()`.

## Dependent Scope Example

```ts
import { ObservableScope } from 'j-templates';

// Base mutable state
const state = { count: 0 };

// Parent scope reading the count
const parentScope = ObservableScope.Create(() => state.count);

// Child scope that derives a value from the parent scope
const doubleScope = ObservableScope.Create(() => ObservableScope.Value(parentScope) * 2);

// Initial read
console.log('double:', ObservableScope.Value(doubleScope)); // 0

// Mutate the base state and update parent
state.count = 5;
ObservableScope.Update(parentScope);

// Child automatically reflects the change
console.log('double after update:', ObservableScope.Value(doubleScope)); // 10
```

## Framework Integration Patterns

While ObservableScope is a standalone primitive, it's commonly used in jTemplates with these patterns:

### Using the @Value Decorator
The preferred pattern for creating reactive values in components is using the `@Value` decorator, which automatically creates and manages an ObservableScope:

```ts
import { Component, Value } from 'j-templates';

class MyComponent extends Component {
  // Create a reactive property using @Value decorator
  @Value()
  count: number = 0;
  
  // The decorator automatically:
  // 1. Creates an ObservableScope to track the property value
  // 2. Updates the scope when the property is modified
  // 3. Enables dependency tracking for computed properties
  
  // Access the value directly
  get doubledCount() {
    return this.count * 2;
  }
}

// Usage:
const component = new MyComponent();
console.log(component.count); // 0
component.count = 5; // Automatically triggers scope updates
console.log(component.count); // 5
```

### VNode Properties
ObservableScope can be used to create reactive properties on virtual nodes:

```ts
const scope = ObservableScope.Create(() => props.value);
ObservableScope.Watch(scope, (scope) => {
  // Update DOM property when scope changes
  element.textContent = ObservableScope.Value(scope);
});
```

## File References

- **Implementation**: `src/Store/Tree/observableScope.ts`
- **Component integration**: `src/Node/component.ts`
- **VNode handling**: `src/Node/vNode.ts`
- **Decorator implementation**: `src/Utils/decorators.ts`

---

*Next post*: ObservableNode — proxy-based observable objects and how they integrate with scopes.