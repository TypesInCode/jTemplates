# calc / CalcScope

In the previous post, we explored how reactive state management works in jTemplates through ObservableScope and ObservableNode. Now, let's dive into how computed values are handled using the `calc` function (which is an alias for `CalcScope`).

## What is calc?

The `calc` function is used to create reactive computed values. It's exported from `j-templates` as `calc` and is an alias for the `CalcScope` function found in `src/Store/Tree/observableScope.ts`. Computed values are derived from other reactive values and automatically update when their dependencies change.

## Usage

To use `calc`, you wrap a function that returns a computed value. Here's a basic example:

```typescript
import { calc } from 'j-templates';

const baseValue = ObservableScope.Create(() => 5);
const doubled = ObservableScope.Create(() => calc(() => ObservableScope.Value(baseValue) * 2));

// The doubled value will be 10
console.log(ObservableScope.Value(doubled)); // 10
```

## How it Works

The key difference between `calc` and a standard ObservableScope is in how it's created and managed:

1. **Special Creation Flag**: When `calc` creates an ObservableScope internally, it passes `true` as the second parameter to `ObservableScope.Create()`, setting the `calc` property to true.

2. **Dependency Tracking**: `calc` leverages the scope tracking system to automatically detect dependencies. When you use `calc`, it records the current "watching" context and tracks which scopes were accessed during execution.

3. **Caching Behavior**: `calc` can cache and reuse computed scopes when the same expression is evaluated multiple times within a single reactive context, avoiding redundant calculations.

4. **Special Dirty Handling**: ObservableScopes created with `calc = true` have special behavior in the `DirtyScope` function. They track changes differently and ensure proper re-computation, only emitting when the computed value actually changes.

## Example in a Component

Here's how you might use `calc` within a component:

```typescript
import { Component } from 'j-templates';
import { calc } from 'j-templates';

class MyComponent extends Component<{ count: number }, void, void> {
  Template() {
    return div({}, 
      // Using calc to create a computed value
      span({}, () => calc(() => `Count is: ${this.Data.count}`)),
      // Another computed value based on the first
      span({}, () => calc(() => `Double count is: ${this.Data.count * 2}`))
    );
  }
}
```

## Key Differences from Standard ObservableScopes

1. **calc = true flag**: ObservableScopes created via `calc` have their `calc` property set to true
2. **Automatic dependency tracking**: `calc` automatically tracks dependencies in the current reactive context
3. **Reusability**: `calc` can reuse existing computed scopes to avoid redundant computations when the same expression is evaluated multiple times within a single reactive context
4. **Different dirty handling**: Computed scopes handle dirty state and updates differently to optimize performance, emitting only when the computed value actually changes rather than on every dependency update

## Integration with Other Features

`calc` works seamlessly with other reactive features in jTemplates:

- It integrates with the ObservableScope system for dependency tracking
- Works with decorators like `@Computed` for more convenient computed property definitions
- Supports async operations through the async scope system

When using `calc`, you don't need to manually manage the lifecycle of computed scopes; they're automatically tracked and cleaned up as part of the reactive system.

## Key Points to Remember

1. `calc` is an alias for `CalcScope` exported from `j-templates`
2. Computed values automatically update when dependencies change
3. The system caches computed values to avoid redundant calculations
4. `calc` works within the broader ObservableScope ecosystem

The `calc` function provides a clean and efficient way to create reactive computed properties in your jTemplates applications, making it easy to derive new values from existing reactive state without manual dependency management.
