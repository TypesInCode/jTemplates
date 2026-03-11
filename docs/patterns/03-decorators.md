# Decorators

## Overview

Decorators in j-templates provide a declarative way to add reactive behavior, dependency injection, and cleanup logic to component properties and methods. The framework's decorators work with the reactive state management system to create a seamless development experience.

## Decorators by Category

### Reactive State

- **@State**: Creates a mutable ObservableNode, best for complex values
- **@Value**: Creates a mutable ObservableScope, best for primitive values
- **@Scope**: Uses a getter to create an ObservableScope, immutable
- **@Computed**: Uses a getter to create a StoreSync to support targeted updates to computed complex objects

### Reactivity Control

- **@Watch**: Observes property changes and triggers methods

### Dependency Injection

- **@Inject**: Enables dependency injection for services

### Lifecycle Management

- **@Destroy**: Marks properties for automatic cleanup; requires property value to implement IDestroyable (Destroy() method)
- **@Bound**: Internal decorator for lifecycle binding (framework use only)
- **IDestroyable interface**: Cleanup pattern for resource management

**Note:** For detailed cleanup patterns and examples, see the [@Destroy decorator documentation in the Decorators section](./03-decorators.md#decorator-destruct) and the [Dependency Injection section](./04-dependency-injection.md#decorator-destruct) for cleanup of injected services.

## API Reference

### Decorator: @Computed

Uses a getter to create a StoreSync to support targeted updates to computed complex objects.

**Signature:**
```typescript
@Computed(defaultValue: V): PropertyDecorator
```

**Parameters:**
- `defaultValue`: Default value for type inference (used internally as undefined for StoreSync)

**Example:**
```typescript
@Computed({ count: 0 })
get Report() {
  return this.dataService.GetReport();
}
```

**How it works:**
1. Creates a getter scope that calls the getter function
2. Watches the scope for changes to dependencies
3. When dependencies change, writes new value to StoreSync root
4. Returns cached values from StoreSync until dependencies change

### Decorator: @Value

Creates a mutable ObservableScope, best for primitive values.

**Signature:**
```typescript
@Value(): PropertyDecorator
```

**Example:**
```typescript
@Value()
counter = 0;

// Usage
this.counter = 5;  // Triggers reactivity
```

**How it works:**
1. Creates a getter/setter pair
2. Lazily creates an ObservableScope
3. Updates the scope when the value changes
4. Triggers dependent computations and re-renders

### Decorator: @Watch

Observes property changes and triggers methods.

**Signature:**
```typescript
@Watch(scope: (instance: T) => any): MethodDecorator
```

**Parameters:**
- `scope`: Function that returns the property to watch

**Example:**
```typescript
@Watch((comp) => comp.Data.value)
setCardValue(value: number) {
  this.animateCardValue.Animate(this.cardValue, value);
}
```

**How it works:**
1. Creates a scope that tracks the watched property
2. Method is called immediately with the current value when component is bound
3. When the watched property changes, the method is called with the new value
4. The scope is automatically managed and cleaned up
5. Throws error if applied to non-function property

### Decorator: @Inject

Enables dependency injection for services.

**Signature:**
```typescript
@Inject(type: ConstructorToken<I>): PropertyDecorator
```

**Parameters:**
- `type`: Constructor function or abstract class (the injection token)

**Example:**
```typescript
@Inject(ActivityDataService)
service!: ActivityDataService;
```

**How it works:**
1. Creates a getter/setter pair that uses the component's injector
2. Getter retrieves the instance from the injector via `Injector.Get(type)`
3. Setter stores the instance in the injector via `Injector.Set(type, val)`
4. Allows child components to access the same instance via @Inject
5. Requires component to have `Injector: Injector` property

**Hierarchical Lookup:**
The Injector hierarchy follows the component tree. When a component uses @Inject to retrieve a service:
- First, the component's own injector is checked for the token
- If not found, the lookup continues up the injector hierarchy (parent components)
- This continues until the token is found or the root is reached
- This enables services to be provided at any level and automatically available to all descendant components

### Decorator: @Destroy

Marks properties for automatic cleanup when component is destroyed. Requires the property value to implement the IDestroyable interface (with a Destroy() method).

**Signature:**
```typescript
@Destroy(): PropertyDecorator
```

**Example:**
```typescript
@Destroy()
refreshTimer = new RefreshTimer(() => this.dataService.RefreshData(), 500);
```

**How it works:**
1. Collects property names marked with @Destroy
2. When component is destroyed, calls `Destroy()` on properties that implement IDestroyable
3. Prevents memory leaks from unclosed timers, subscriptions, etc.

### Decorator: @State

Creates a mutable ObservableNode, best for complex values.

**Signature:**
```typescript
@State(): PropertyDecorator
```

**Example:**
```typescript
@State()
user: { name: string; age: number } = { name: "John", age: 30 };
```

**How it works:**
1. Creates an ObservableNode with { root: value } structure
2. Getter retrieves the root value from the ObservableNode
3. Setter updates the root value in the ObservableNode
4. Changes automatically notify dependent scopes

### Decorator: @Scope

Uses a getter to create an ObservableScope, immutable.

**Signature:**
```typescript
@Scope(): PropertyDecorator
```

**Example:**
```typescript
@Scope()
get fullName() {
  return `${this.firstName} ${this.lastName}`;
}
```

**How it works:**
1. Creates an ObservableScope from the getter function (with default parameters)
2. Automatically tracks dependencies accessed in the getter
3. Re-computes when dependencies change
4. Throws error if applied to non-getter or if setter exists

### Decorator: @Bound

Internal decorator namespace for lifecycle binding. Automatically called during component initialization.

**Functions:**
- `Bound.All(instance)`: Calls all bound methods for a component instance

**Note:** This decorator is used internally by the framework and typically not used directly in application code. The `Bound.All()` function is invoked by the component lifecycle to initialize @Watch decorators and other bound methods.

### Interface: IDestroyable

Cleanup interface for automatic resource management.

```typescript
interface IDestroyable {
  Destroy(): void;
}
```

**Example:**
```typescript
export class RefreshTimer implements IDestroyable {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  
  Destroy(): void {
    this.stop();
  }
}
```

## Usage Examples

### @Computed with Complex Derived State

```typescript
@Computed({
  topUrl: "",
  topUser: "",
  totalActivities: 0,
  uniqueUsers: 0,
  totalTime: 0,
  avgTimePerActivity: 0,
  topUserByVisits: 0,
  topUserByTime: "",
  topUserTimeSpent: 0,
  topUrlByVisits: 0,
  topUrlByTime: "",
  topUrlTimeSpent: 0,
})
get Report() {
  return this.dataService.GetReport();
}
```

### @Value for Primitive State

```typescript
class NumberCard extends Component<{ title: string; value: number }> {
  @Value()
  cardValue = 0;
  
  @Watch((comp) => comp.Data.value)
  setCardValue(value: number) {
    this.animateCardValue.Animate(this.cardValue, value);
  }
}
```

### @Watch for Property Observation

```typescript
@Watch((comp) => comp.Data.value)
handleDataChange(newValue: DataType) {
  console.log("Data changed:", newValue);
  // Perform side effects
}
```

### @Inject with Service Contract

```typescript
// Service contract
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
}

// Component with injected service
class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;
  
  Template() {
    return div({}, () => this.service.GetActivityData());
  }
}
```

### @Destroy with Multiple Resources

```typescript
class App extends Component {
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();
  
  @Destroy()
  refreshTimer = new RefreshTimer(() => this.dataService.RefreshData(), 500);
  
  @Destroy()
  eventSubscription = emitter.on("event", () => {});
}
```

### IDestroyable with Timer Cleanup

```typescript
export class RefreshTimer implements IDestroyable {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private onRefresh: () => void, private interval: number) {}

  start(): void {
    if (this.intervalId === null) {
      this.intervalId = setInterval(this.onRefresh, this.interval);
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  Destroy(): void {
    this.stop();
  }
}
```

### @State for Complex Data Structures

```typescript
class UserForm extends Component {
  @State()
  user: {
    name: string;
    email: string;
    preferences: {
      theme: string;
      notifications: boolean;
    };
  } = {
    name: "",
    email: "",
    preferences: {
      theme: "light",
      notifications: true
    }
  };

  updateEmail(email: string) {
    this.user.email = email; // Triggers reactivity
  }
}
```

### @Scope for Getter-Based Reactivity

```typescript
class Profile extends Component {
  @Value()
  firstName = "John";

  @Value()
  lastName = "Doe";

  @Scope()
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  Template() {
    return div({}, () => this.fullName); // Updates when firstName or lastName changes
  }
}
```

## Framework Integration

Decorators integrate with:

- **Reactive State Management**: @Computed and @Value use ObservableScope
- **Dependency Injection**: @Inject works with Injector
- **Component Architecture**: All decorators work with Component lifecycle

## Best Practices

- **Use @Computed for derived state**: Avoid manual caching of computed values
- **Use @State for complex data**: Objects and arrays with nested reactivity
- **Use @Scope for getter-based properties**: When you need reactive getters
- **Use @Value for primitives**: ObservableNode is for objects, @Value is for primitives
- **Clean up with @Destroy**: Always mark disposable resources with @Destroy
- **Define service contracts**: Use abstract classes for @Inject tokens
- **Watch specific properties**: Use precise selectors in @Watch

## Related Patterns

 - **Reactive State Management**: @Computed, @Value, @State, and @Scope use ObservableScope
- **Dependency Injection**: @Inject works with Injector
- **Component Architecture**: All decorators work with Component lifecycle
- **@Bound**: Internal decorator used by Component.Bound() lifecycle hook

## Framework Source

 - `src/Utils/decorators.ts` - All decorator implementations (@Computed, @Value, @State, @Scope, @Watch, @Inject, @Destroy, @Bound)
- `src/Utils/injector.ts` - Injector for @Inject
- `src/Utils/utils.types.ts` - IDestroyable interface

## References

- [App Component - @Computed, @Inject, @Destroy](../../examples/real_time_dashboard/src/app.ts)
- [Number Card - @Value, @Watch, @Destroy](../../examples/real_time_dashboard/src/components/number-card.ts)
- [Refresh Timer - IDestroyable](../../examples/real_time_dashboard/src/services/refreshTimer.ts)
