# Dependency Injection

## Overview

Dependency Injection (DI) in j-templates provides a scoped, type-safe way to share services and dependencies across the component tree. The framework's injector system supports parent-child hierarchies, abstract class tokens, and automatic cleanup through IDestroyable.

## Key Concepts

- **Injector class**: Scoped dependency container with type-based resolution
- **@Inject decorator**: Declarative dependency injection
- **Parent-child hierarchy**: Child injectors can access parent instances
- **Abstract class tokens**: Interface-based service contracts
- **IDestroyable**: Cleanup pattern for injected resources

### How @Inject Works

The `@Inject` decorator creates a getter/setter pair that uses the component's `Injector` property:

- **Getting**: Calls `this.Injector.Get(type)` to retrieve the service, searching up the component hierarchy
- **Setting**: Calls `this.Injector.Set(type, value)` to register the service at the current scope
- **Registration**: When you initialize an `@Inject` property with `new Service()`, the service is automatically registered in the injector

This enables two patterns:
1. **Service Provider**: Initialize with `new Service()` to register and provide the service
2. **Service Consumer**: Declare without initialization (with `!` assertion) to receive from parent

## API Reference

### Class: Injector

Scoped dependency container that manages types/instances as key/value pairs.

**Constructor:**
```typescript
constructor()
```

**Properties:**
- `parent`: `Injector` - The parent injector in the hierarchy

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Get<T>()` | `(type: any): T` | Gets instance/value based on a key type, searching parent scopes |
| `Set<T>()` | `(type: any, instance: T): T` | Sets instance/value based on a key type at this scope |

### Decorator: @Inject

Declarative dependency injection decorator that creates a getter/setter using the component's injector.

**Signature:**
```typescript
@Inject(type: ConstructorToken<I>)
```

**Parameters:**
- `type`: `ConstructorToken<I>` - The constructor or abstract class token for the dependency

**Behavior:**
- Getter calls `this.Injector.Get(type)` to retrieve from hierarchy
- Setter calls `this.Injector.Set(type, value)` to register at current scope
- When initialized with `new Service()`, registers the service in the injector

### Type: ConstructorToken

Union type for dependency injection tokens (concrete classes or abstract classes).

**Definition:**
```typescript
type ConstructorToken<I> = {
  new (...args: any[]): I;
} | (abstract new (...args: any[]) => I);
```

**Purpose:** Enables both concrete classes and abstract classes to be used as injection tokens.

### Interface: IDestroyable

Interface for objects that require cleanup when destroyed.

**Definition:**
```typescript
interface IDestroyable {
  Destroy(): void;
}
```

## Usage Examples

### Basic Dependency Injection

```typescript
// Service contract (abstract class)
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
}

// Service class (implements contract)
export class DataService implements ActivityDataService, IDestroyable {
  private store = new StoreAsync();

  GetActivityData(): ActivityRow[] {
    return this.store.Get<Activity[]>("activities", []);
  }

  Destroy(): void {
    this.store.Destroy();
  }
}

// Component provides service (initializes with new)
class App extends Component {
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();

  Template() {
    return div({}, () => this.dataService.GetActivityData());
  }
}

// Child component consumes service (no initialization)
class ChildComponent extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return div({}, () => this.service.GetActivityData());
  }
}
```

### Abstract Class as Token

```typescript
// Service contract (abstract class)
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
}

// Component uses abstract class as token
class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;  // Can be any implementation

  Template() {
    return div({}, () => this.service.GetActivityData());
  }
}
```

### Parent-Child Injector Hierarchy

```typescript
// Parent provides service by initializing with new
class ParentComponent extends Component {
  @Inject(MyService)
  service = new MyService();

  Template() {
    return childComponent({});  // Child can access MyService
  }
}

// Child consumes service (no initialization, uses ! assertion)
class ChildComponent extends Component {
  @Inject(MyService)
  service!: MyService;  // Injected from parent's injector

  Template() {
    return div({}, () => this.service.getData());
  }
}
```

### Custom Service with IDestroyable

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

// Usage with @Destroy
class App extends Component {
  @Destroy()
  refreshTimer = new RefreshTimer(() => this.refreshData(), 500);
}
```

## Framework Integration

Dependency Injection integrates with:

- **@Inject decorator**: Declarative injection syntax
- **Component Architecture**: Each component has its own Injector
- **IDestroyable**: Interface for cleanup-aware services
- **@Destroy decorator**: For automatic cleanup, see Decorators section

## Best Practices

- **Use abstract classes for contracts**: Enables interface-based design and easy mocking
- **Provider pattern**: Initialize with `new Service()` to register services in parent components
- **Consumer pattern**: Use `service!: ServiceType` (with `!` assertion) to receive services from parents
- **Implement IDestroyable**: Clean up resources to prevent memory leaks
- **Use @Destroy with @Inject**: Combine for automatic cleanup of injected services
- **Register at highest needed scope**: Services registered in parent components are available to all descendants

## Related Patterns

- **Decorators**: @Inject creates getter/setter using component's Injector property; @Destroy cleans up services implementing IDestroyable
- **Component Architecture**: Each component has its own Injector that follows the component tree hierarchy
- **IDestroyable**: Interface for cleanup-aware services that are automatically destroyed when marked with @Destroy

## Framework Source

- `src/Utils/injector.ts` - Injector class implementation
- `src/Utils/decorators.ts` - @Inject decorator implementation
- `src/Utils/utils.types.ts` - IDestroyable interface definition

## References

- [App Component - Service Provider](../../examples/real_time_dashboard/src/app.ts) - Shows service registration with initialization
- [Activity Data Table - Service Consumer](../../examples/real_time_dashboard/src/components/activity-data-table.ts) - Shows service consumption without initialization
- [Activity Data Table Types - Service Contract](../../examples/real_time_dashboard/src/components/activity-data-table.types.ts) - Shows abstract class token pattern
- [Data Service - IDestroyable Implementation](../../examples/real_time_dashboard/src/services/dataService.ts) - Shows service with cleanup
