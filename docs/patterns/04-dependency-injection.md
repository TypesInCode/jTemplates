# Dependency Injection

## Overview

j-templates provides a scoped, type-safe dependency injection system. Each component has an `Injector` that resolves dependencies by type. Injectors form a parent-child hierarchy following the component tree — if a dependency isn't found locally, the framework walks up to parent injectors. The `@Inject` decorator provides declarative access, and `@Destroy` ensures automatic cleanup.

## Injector

### Class

```typescript
import { Injector } from "j-templates/Utils";
```

| Member | Signature | Description |
|---|---|---|
| `constructor` | `()` | Creates an injector. Parent is set to `Injector.Current()`. |
| `parent` | `Injector` | The parent injector in the hierarchy. |
| `Get` | `<T>(type: any): T` | Resolve a dependency by type. Searches up the parent chain. Returns `undefined` if not found. |
| `Set` | `<T>(type: any, instance: T): T` | Register a dependency at this scope. Returns the instance. |

### Namespace

| Method | Signature | Description |
|---|---|---|
| `Injector.Current` | `(): Injector` | Returns the currently active injector (or `null`). |
| `Injector.Scope` | `<R, P>(injector: Injector, action: (...args: P) => R, ...args: P): R` | Sets `injector` as the active scope, executes `action`, then restores the previous scope. |

## @Inject

```typescript
@Inject(type: ConstructorToken<I>)
```

`ConstructorToken<I>` is a union type accepting concrete classes or abstract classes:

```typescript
type ConstructorToken<I> = { new (...args: any[]): I } | (abstract new (...args: any[]) => I);
```

How it works:
1. Replaces the property with a getter/setter pair.
2. **Getter** calls `this.Injector.Get(type)` — resolves from the injector hierarchy.
3. **Setter** calls `this.Injector.Set(type, value)` — registers at the current scope.
4. When initialized with `new Service()`, the service is automatically registered.

This enables two patterns:

**Provider** — Initialize with `new` to register the service at the current injector:

```typescript
@Injectable(MyService)
myService = new MyService();
```

**Consumer** — Declare without initialization (use `!` assertion) to receive from a parent injector:

```typescript
@Inject(MyService)
myService!: MyService;
```

## @Destroy

```typescript
@Destroy()
```

Marks a property for automatic cleanup. When `Destroy.All()` is called (from `Component.Destroy()`), `.Destroy()` is invoked on every `@Destroy`-marked property whose value implements `IDestroyable`.

```typescript
interface IDestroyable {
  Destroy(): void;
}
```

### Combining @Inject and @Destroy

When a service implements `IDestroyable`, stack both decorators to ensure automatic cleanup:

```typescript
@Destroy()
@Inject(DataService)
dataService = new DataService();
```

When the component is destroyed, `dataService.Destroy()` is called automatically.

## Provider/Consumer pattern

### Abstract class as service contract

```typescript
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
}
```

### Provider (parent component)

```typescript
class App extends Component {
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();

  Template() {
    return div({}, () => childComponent({}));
  }
}
```

The `new DataService()` both creates the instance and registers it in the component's injector. `@Destroy` ensures cleanup when the component is destroyed.

### Consumer (child component)

```typescript
class ChildComponent extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return div({}, () => this.service.GetActivityData());
  }
}
```

The child's injector automatically resolves `ActivityDataService` from the parent's injector.

## Hierarchical lookup

When a component calls `this.Injector.Get(SomeType)`:

1. The component's own injector is checked.
2. If not found, the lookup continues to the parent injector.
3. This continues until the token is found or the root is reached.

This means services registered at any level are automatically available to all descendant components.

## IDestroyable

Any class that manages resources (timers, subscriptions, stores) should implement `IDestroyable`:

```typescript
export class RefreshTimer implements IDestroyable {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private onRefresh: () => void, private interval: number) {
    this.start();
  }

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

Usage with `@Destroy`:

```typescript
class App extends Component {
  @Destroy()
  refreshTimer = new RefreshTimer(() => this.refreshData(), 500);
}
```

## Best Practices

- **Use abstract classes for service contracts.** This enables interface-based design and makes it easy to swap implementations for testing.
- **Provide at the highest needed scope.** Services registered in a parent component are available to all descendants.
- **Stack `@Destroy` with `@Inject`.** Ensures that injected services implementing `IDestroyable` are cleaned up automatically.
- **Use `!` assertion for consumers.** `service!: ServiceType` signals that the value will be provided at runtime, not at declaration.
- **Implement `IDestroyable` for resource-managing classes.** Timers, subscriptions, stores, and animations should all implement `Destroy()`.

## Source

- `src/Utils/injector.ts` — Injector class and namespace
- `src/Utils/decorators.ts` — `@Inject`, `@Destroy`, `Bound.All`, `Destroy.All`
- `src/Utils/utils.types.ts` — `IDestroyable`, `RecursivePartial`

## See Also

- [Components](./01-components.md) — Component lifecycle and `Destroy()`
- [Reactivity](./02-reactivity.md) — `@Watch` and reactive decorators
- [Templates & Data](./03-templates-and-data.md) — Animation and `@Destroy`