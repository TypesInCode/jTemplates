# Data Modeling

## Overview

Data Modeling in j-templates involves defining TypeScript interfaces for domain entities and display objects. The reactive store system works seamlessly with these models, supporting nested objects and key-based object sharing for memory efficiency.

## Key Concepts

- **TypeScript interfaces**: Domain models and DTOs for type safety
- **Nested objects**: Object relationships in data structures
- **StoreAsync key functions**: Object identity and sharing
- **DTO pattern**: Data Transfer Objects for display optimization
- **Type parameters**: Generic components with typed data

## Usage Examples

### Domain Models

```typescript
export interface User {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  url: string;
  time_spent: number;
  user: User;
}
```

### DTO Pattern for Display

```typescript
// Full model
export interface Activity {
  id: string;
  timestamp: string;
  url: string;
  time_spent: number;
  user: User;  // Nested object
}

// DTO for table display
export interface ActivityRow {
  timestamp: string;
  url: string;
  time_spent: number;
  user: {
    name: string;  // Flattened, name only
  };
}

// Conversion function
function toActivityRow(activity: Activity): ActivityRow {
  return {
    timestamp: activity.timestamp,
    url: activity.url,
    time_spent: activity.time_spent,
    user: { name: activity.user.name }
  };
}
```

### StoreAsync with Key Function

```typescript
import { StoreAsync } from "j-templates/Store";

// Key function for object sharing
private store = new StoreAsync((value) => value.id);

// Two activities with same user will share the user object
const activity1 = {
  id: "act-1",
  timestamp: "2023-01-01T12:00:00Z",
  url: "https://example.com/page1",
  time_spent: 30,
  user: { id: "usr-1", name: "John" }
};

const activity2 = {
  id: "act-2",
  timestamp: "2023-01-01T13:00:00Z",
  url: "https://example.com/page2",
  time_spent: 45,
  user: { id: "usr-1", name: "John" }
};

// Store writes
this.store.Write(activity1);
this.store.Write(activity2);

// After both writes, user objects are shared:
// this.store.Get("usr-1") === user object
// activity1.user === activity2.user (same instance!)
```

### Generic Components with Data Types

```typescript
// Generic table component
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    // D is the data type
    return div({}, () => this.Data.data);  // D[]
  }
}

// Usage with specific type
interface User {
  id: string;
  name: string;
  email: string;
}

const users: User[] = [...];
const columns: Column[] = [...];
const cellTemplate: CellTemplate<User> = {...};

dataTable({ data: () => ({ columns, data: users }) }, cellTemplate);
```

### Service Contracts with Data Types

```typescript
// Abstract class as service contract
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
  abstract GetReport(): Report;
}

// Concrete implementation
export class DataService implements ActivityDataService {
  private store = new StoreAsync((value) => value.id);
  
  GetActivityData(): ActivityRow[] {
    const activities = this.store.Get<Activity[]>("activities", []);
    return ObservableNode.Unwrap(activities).map(toActivityRow);
  }
  
  GetReport(): Report {
    // Compute report from activities
    return this.report;
  }
}
```

### Nested Object Relationships

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
}

// Store handles nested objects
this.store.Write(user, "usr-1");
// All nested objects are tracked
```

### Type-Safe Data Access

```typescript
class App extends Component<{ user: User }> {
  Template() {
    return div({}, () => [
      h1({}, () => this.Data.user.name),  // Type-safe
      div({}, () => this.Data.user.email)  // Type-safe
    ]);
  }
}
```

### Array Operations with Reactive Store

```typescript
// Push items to array
this.store.Push("activities", activity1, activity2);

// Splice array
this.store.Splice("activities", 0, 1);  // Remove first item

// Patch nested property
this.store.Patch("usr-1", { name: "Updated Name" });

// Write new data
this.store.Write([activity1, activity2], "activities");
```

## Framework Integration

Data Modeling integrates with:

- **Reactive State Management**: StoreAsync tracks all data
- **Component Architecture**: Generic type parameters for type safety
- **Dependency Injection**: Services return typed data
- **Template System**: Data props use typed interfaces

## Best Practices

- **Use interfaces for models**: Type-safe domain entities
- **Create DTOs for display**: Flatten nested structures for tables
- **Define key functions**: Enable object sharing with StoreAsync
- **Separate concerns**: Domain models vs display models
- **Leverage generics**: Type-safe generic components

## Related Patterns

- **Component Architecture**: Generic type parameters for data
- **Dependency Injection**: Services return typed data
- **Reactive State Management**: StoreAsync tracks all data

## Framework Source

- `src/Store/Store/storeAsync.ts` - StoreAsync with key functions
- `src/Store/Store/storeSync.ts` - StoreSync (synchronous version)

## References

- [Activity Model](../../examples/real_time_dashboard/src/data/activity.ts)
- [User Model](../../examples/real_time_dashboard/src/data/user.ts)
- [Activity Data Table Types](../../examples/real_time_dashboard/src/components/activity-data-table.types.ts)
- [Data Service](../../examples/real_time_dashboard/src/services/dataService.ts)
