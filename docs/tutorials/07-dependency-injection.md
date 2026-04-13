# Tutorial 7: Dependency Injection

**Duration:** 60 minutes  
**What You'll Build:** Service-architected component with dependency injection

---

## What You'll Build

In this tutorial, you'll build a **Data Viewer Application** that uses dependency injection to provide services to components:

- **DataService**: A service that manages data with proper cleanup (IDestroyable)
- **LoggerService**: A service that provides logging functionality
- **DataViewer**: A component that consumes these services via injection
- **App**: A parent component that provides the services to child components

You'll learn how to:
- Why dependency injection matters (loose coupling, testability)
- Use the Injector class and hierarchical lookup
- Use the `@Inject` decorator for service injection
- Create service contracts with abstract classes
- Combine `@Inject` with `@Destroy` for automatic cleanup

---

## Prerequisites

- Completed Tutorials 1-6
- Understanding of component architecture (Tutorial 2)
- Familiarity with decorators (Tutorial 5)
- Node.js 18+ installed

---

## Learning Objectives

By the end of this tutorial, you will be able to:

1. ✅ Explain why dependency injection improves code quality
2. ✅ Create abstract class service contracts
3. ✅ Use the Injector class to register and retrieve services
4. ✅ Use the `@Inject` decorator to inject dependencies
5. ✅ Implement the IDestroyable pattern for cleanup
6. ✅ Combine `@Inject` with `@Destroy` for automatic resource management
7. ✅ Build a component architecture with parent-provided services

---

## Step 1: The Problem with Direct Dependencies

Before learning dependency injection, let's see the problem it solves.

### Tight Coupling Problem

```typescript
// ❌ Problem: Component creates its own dependencies
class DataViewer extends Component {
  private dataService = new DataService();  // Hard-coded dependency
  private logger = new LoggerService();     // Hard-coded dependency
  
  Template() {
    const data = this.dataService.GetData();  // Can't swap implementation
    this.logger.Log("Rendering data");        // Can't mock for testing
    
    return div({}, () => data.length);
  }
}
```

**Problems:**
1. **Tight Coupling**: Component is tightly coupled to concrete implementations
2. **Hard to Test**: Can't replace services with mocks in unit tests
3. **Hard to Swap**: Changing implementations requires modifying component code
4. **Code Duplication**: Each component creates its own service instances

### Dependency Injection Solution

```typescript
// ✅ Solution: Component receives dependencies via injection
class DataViewer extends Component {
  @Inject(DataService)
  dataService!: DataService;  // Received from parent
  
  @Inject(LoggerService)
  logger!: LoggerService;     // Received from parent
  
  Template() {
    const data = this.dataService.GetData();  // Works with any implementation
    this.logger.Log("Rendering data");        // Can be mocked
    
    return div({}, () => data.length);
  }
}
```

**Benefits:**
1. **Loose Coupling**: Component depends on abstractions, not implementations
2. **Testable**: Easy to inject mock services
3. **Flexible**: Swap implementations without changing component code
4. **Centralized**: Services created once, shared across components

---

## Step 2: The Injector Class

The `Injector` class is the core of the DI system. It's a scoped container that manages type/instance pairs.

### Basic Injector Usage

```typescript
import { Injector } from "j-templates/Utils/injector";

// Create an injector
const injector = new Injector();

// Register a service (Set)
injector.Set(LoggerService, new LoggerService());

// Retrieve a service (Get)
const logger = injector.Get<LoggerService>(LoggerService);

// Use the service
logger.Log("Hello from injector!");
```

### Parent-Child Hierarchy

Injectors support a parent-child hierarchy. Child injectors can access services registered in parent injectors:

```typescript
// Parent injector
const parentInjector = new Injector();
parentInjector.Set(LoggerService, new LoggerService());

// Child injector (inherits from parent)
const childInjector = new Injector();
childInjector.parent = parentInjector;

// Child can access parent's services
const logger = childInjector.Get<LoggerService>(LoggerService);  
// Returns parent's LoggerService instance

// Child can also register its own services
childInjector.Set(DataService, new DataService());

// Parent can't access child's services
const dataService = parentInjector.Get<DataService>(DataService);  
// Returns undefined
```

### Component Injector Integration

Every component automatically has an `Injector` property. When you create a vNode for a component, the framework:

1. Creates a new `Injector` instance for the component
2. Sets its `parent` to the parent component's injector
3. Makes it accessible via `this.Injector` in the component

```typescript
class ParentComponent extends Component {
  Template() {
    // Framework creates injector for child
    return childComponent({});
  }
}

class ChildComponent extends Component {
  Template() {
    // this.Injector has parent = ParentComponent's injector
    return div({}, () => "Child");
  }
}
```

---

## Step 3: The @Inject Decorator

The `@Inject` decorator provides declarative dependency injection syntax.

### Basic @Inject Usage

```typescript
import { Inject } from "j-templates/Utils";

class MyComponent extends Component {
  @Inject(LoggerService)
  logger!: LoggerService;
  
  Template() {
    // First access resolves from injector
    this.logger.Log("Component rendering");
    
    return div({}, () => "Hello");
  }
}
```

### How @Inject Works

The `@Inject` decorator creates a getter/setter that uses the component's `Injector`:

```typescript
// What @Inject does internally:
@Inject(LoggerService)
logger!: LoggerService;

// Becomes:
get logger(): LoggerService {
  return this.Injector.Get(LoggerService);  // Retrieve from hierarchy
}

set logger(value: LoggerService) {
  this.Injector.Set(LoggerService, value);  // Register at current scope
}
```

### Provider Pattern (Parent Component)

Parent components provide services by initializing the `@Inject` property:

```typescript
class App extends Component {
  @Inject(DataService)
  dataService = new DataService();  // Registers in injector
  
  Template() {
    return childComponent({});  // Child can access DataService
  }
}
```

**Key Points:**
- Initialize with `new Service()` to register and provide
- The service is automatically registered in the component's injector
- All child components can access this service

### Consumer Pattern (Child Component)

Child components consume services by declaring without initialization:

```typescript
class DataViewer extends Component {
  @Inject(DataService)
  dataService!: DataService;  // Retrieved from parent's injector
  
  Template() {
    const data = this.dataService.GetData();
    return div({}, () => data.length);
  }
}
```

**Key Points:**
- Use `!` (non-null assertion) to indicate it will be injected
- Don't initialize - framework retrieves from parent injector
- If not found in parent, returns `undefined`

## Step 4: Service Contracts with Abstract Classes

Use abstract classes to define service contracts. This enables interface-based design and easy mocking.

### Defining a Service Contract

```typescript
// Define abstract class as contract
export abstract class DataService {
  abstract GetData(): Item[];
  abstract Save(item: Item): Promise<void>;
  abstract Delete(id: number): Promise<void>;
}
```

**Benefits of Abstract Classes:**
1. **Type Safety**: TypeScript enforces the contract
2. **Multiple Implementations**: Different classes can implement the same contract
3. **Clear API**: Contract defines expected methods
4. **Documentation**: Self-documenting service interface

### Implementing the Contract

```typescript
import { DataService } from "./data-service";
import { StoreSync } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";

// Concrete implementation
export class RealDataService extends DataService implements IDestroyable {
  private store = new StoreSync();
  
  GetData(): Item[] {
    return this.store.Get<Item[]>("items", []);
  }
  
  async Save(item: Item): Promise<void> {
    this.store.Write(item, item.id.toString());
  }
  
  async Delete(id: number): Promise<void> {
    this.store.Splice("items", id, 1);
  }
  
  Destroy(): void {
    this.store.Destroy();
  }
}
```

### Multiple Implementations

You can create multiple implementations of the same contract:

```typescript
// Real implementation (API calls)
export class ApiDataService extends DataService implements IDestroyable {
  async GetData(): Promise<Item[]> {
    const response = await fetch('/api/items');
    return response.json();
  }
  
  async Save(item: Item): Promise<void> {
    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
  }
  
  Destroy(): void {
    // Cleanup if needed
  }
}

// Mock implementation (for testing)
export class MockDataService extends DataService {
  private mockData: Item[] = [
    { id: 1, name: "Test Item 1" },
    { id: 2, name: "Test Item 2" }
  ];
  
  GetData(): Item[] {
    return this.mockData;
  }
  
  async Save(item: Item): Promise<void> {
    // In-memory save
    const index = this.mockData.findIndex(i => i.id === item.id);
    if (index >= 0) {
      this.mockData[index] = item;
    } else {
      this.mockData.push(item);
    }
  }
  
  async Delete(id: number): Promise<void> {
    this.mockData = this.mockData.filter(i => i.id !== id);
  }
}
```

### Swapping Implementations

You can swap implementations by registering different instances in the injector:

```typescript
// Production: Use real API service
class App extends Component {
  @Inject(DataService)
  dataService = new ApiDataService();
  
  Template() {
    return dataViewer({});  // Receives ApiDataService
  }
}

// Testing: Use mock service
class TestApp extends Component {
  @Inject(DataService)
  dataService = new MockDataService();
  
  Template() {
    return dataViewer({});  // Receives MockDataService
  }
}
```

---

## Step 5: Combining @Inject with @Destroy

Services that manage resources (timers, subscriptions, stores) should implement `IDestroyable` and be marked with `@Destroy`.

### The IDestroyable Pattern

```typescript
import { IDestroyable } from "j-templates/Utils/utils.types";

export interface IDestroyable {
  Destroy(): void;
}
```

### Service with IDestroyable

```typescript
import { DataService } from "./data-service";
import { StoreAsync } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";

export class DataService implements IDestroyable {
  private store = new StoreAsync();
  
  GetData(): Item[] {
    return this.store.Get<Item[]>("items", []);
  }
  
  async Save(item: Item): Promise<void> {
    await this.store.Write(item, item.id.toString());
  }
  
  Destroy(): void {
    this.store.Destroy();  // Clean up async store
  }
}
```

### Using @Destroy with @Inject

```typescript
class App extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new DataService();  // Auto-cleanup on component destroy
  
  Template() {
    return div({}, () => "App with injected service");
  }
  
  Destroy(): void {
    super.Destroy();  // Calls Destroy.All(this)
    // dataService.Destroy() is called automatically
  }
}
```

### How @Destroy Works

The `@Destroy` decorator:

1. **Records the property name** in a prototype-level array
2. **Component.Destroy()** calls `Destroy.All(this)`
3. **Destroy.All()** calls `.Destroy()` on all `@Destroy`-marked properties
4. **Order matters**: `super.Destroy()` should be called to trigger cleanup

```typescript
class MyComponent extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new DataService();
  
  @Destroy()
  timer = new RefreshTimer(() => this.refresh(), 1000);
  
  Destroy(): void {
    super.Destroy();  // Calls Destroy.All(this)
    // dataService.Destroy() and timer.Destroy() called automatically
  }
}
```

**⚠️ Important**: Always call `super.Destroy()` in your Destroy() method to ensure cleanup runs!

---

## Step 6: Complete Example - Service-Archected Component

Let's build a complete application demonstrating all DI concepts.

### Project Structure

```
tutorial-7/
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Main component (provides services)
│   ├── services/
│   │   ├── data-service.ts      # DataService contract & implementation
│   │   └── logger-service.ts    # LoggerService contract & implementation
│   └── components/
│       └── data-viewer.ts       # Component using injected services
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

### 1. Create Data Models

First, let's define our data models:

```typescript
// src/models/item.ts
export interface Item {
  id: number;
  name: string;
  value: number;
  createdAt: Date;
}
```

### 2. Create DataService Contract and Implementation

```typescript
// src/services/data-service.ts
import { ObservableNode } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";
import { Item } from "../models/item";

// Service contract (abstract class)
export abstract class DataService {
  abstract GetData(): Item[];
  abstract AddItem(item: Omit<Item, "id" | "createdAt">): void;
  abstract DeleteItem(id: number): void;
}

// Concrete implementation
export class RealDataService extends DataService implements IDestroyable {
  private data = ObservableNode.Create({ items: [] as Item[], nextId: 1 });
  
  GetData(): Item[] {
    return this.data.items;
  }
  
  AddItem(item: Omit<Item, "id" | "createdAt">): void {
    const newItem: Item = {
      ...item,
      id: this.data.nextId++,
      createdAt: new Date()
    };
    this.data.items.push(newItem);
  }
  
  DeleteItem(id: number): void {
    const index = this.data.items.findIndex(i => i.id === id);
    if (index >= 0) {
      this.data.items.splice(index, 1);
    }
  }
  
  Destroy(): void {
    this.data.items = [];
    this.data.nextId = 1;
  }
}
```

### 3. Create LoggerService

```typescript
// src/services/logger-service.ts
import { IDestroyable } from "j-templates/Utils/utils.types";

export abstract class LoggerService {
  abstract Log(message: string): void;
  abstract Error(message: string): void;
  abstract Warn(message: string): void;
}

export class RealLoggerService extends LoggerService implements IDestroyable {
  private logHistory: string[] = [];
  
  Log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] LOG: ${message}`;
    this.logHistory.push(logEntry);
    console.log(logEntry);
  }
  
  Error(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ERROR: ${message}`;
    this.logHistory.push(logEntry);
    console.error(logEntry);
  }
  
  Warn(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] WARN: ${message}`;
    this.logHistory.push(logEntry);
    console.warn(logEntry);
  }
  
  Destroy(): void {
    this.logHistory = [];
  }
}

// Mock implementation for testing
export class MockLoggerService extends LoggerService {
  public logs: string[] = [];
  
  Log(message: string): void {
    this.logs.push(`LOG: ${message}`);
  }
  
  Error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }
  
  Warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
  }
  
  Destroy(): void {
    this.logs = [];
  }
}
```

### 4. Create DataViewer Component

```typescript
// src/components/data-viewer.ts
import { Component } from "j-templates";
import { Value, Inject } from "j-templates/Utils";
import { div, h3, button, input, span, ul, li } from "j-templates/DOM";
import { DataService } from "../services/data-service";
import { LoggerService } from "../services/logger-service";
import { Item } from "../models/item";

interface DataViewerTemplate {
  renderItem: (item: Item) => any;
}

class DataViewer extends Component<{}, DataViewerTemplate, void> {
  @Inject(DataService)
  dataService!: DataService;
  
  @Inject(LoggerService)
  logger!: LoggerService;
  
  @Value()
  newItemName: string = "";
  
  @Value()
  newItemValue: number = 0;
  
  Bound(): void {
    super.Bound();
    this.logger.Log("DataViewer initialized");
  }
  
  private handleAddItem(): void {
    if (this.newItemName.trim()) {
      this.dataService.AddItem({
        name: this.newItemName.trim(),
        value: this.newItemValue
      });
      
      this.logger.Log(`Added item: ${this.newItemName}`);
      
      // Reset form
      this.newItemName = "";
      this.newItemValue = 0;
    }
  }
  
  private handleDeleteItem(id: number): void {
    this.dataService.DeleteItem(id);
    this.logger.Log(`Deleted item: ${id}`);
 }
  
  Template() {
    return div({ props: { className: "data-viewer" } }, () => [
      h3({ props: { className: "title" } }, () => "Data Viewer"),
      
      // Add Item Form
      div({ props: { className: "add-form" } }, () => [
        input({
          props: () => ({
            type: "text",
            placeholder: "Item name",
            value: this.newItemName
          }),
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newItemName = target.value;
            }
          }
        }),
        input({
          props: () => ({
            type: "number",
            placeholder: "Value",
            value: String(this.newItemValue)
          }),
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newItemValue = parseInt(target.value) || 0;
            }
          }
        }),
        button({
          props: { className: "btn-add" },
          on: {
            click: () => this.handleAddItem()
          }
        }, () => "Add Item")
      ]),
      
      // Items List - Using framework data iteration
      // Pass array as data prop - framework automatically iterates
      // Call GetData() directly in data prop to register at smallest scope
      div({ props: { className: "items" } }, () => [
        // Access GetData() here for count - registers at this span's scope
        span({ props: { className: "count" } }, () => 
          `Total items: ${this.dataService.GetData().length}`
        ),
        // Framework data iteration - passes single item to children function
        ul({ 
          props: { className: "item-list" },
          data: () => this.dataService.GetData()  // Framework iterates this array
        }, (item: Item) =>  // Framework passes single item here
          li({ props: { className: "item" } }, () => [
            this.Templates.renderItem(item),
            button({
              props: { className: "btn-delete" },
              on: {
                click: () => this.handleDeleteItem(item.id)
              }
            }, () => "Delete")
          ])
        )
      ])
    ]);
  }
  
  Destroy(): void {
    super.Destroy();
    this.logger.Log("DataViewer destroyed");
  }
}

export const dataViewer = Component.ToFunction("data-viewer", DataViewer);
```

### 5. Create Main App Component

```typescript
// src/app.ts
import { Component } from "j-templates";
import { div, h1, h2 } from "j-templates/DOM";
import { dataViewer } from "./components/data-viewer";
import { DataService, RealDataService } from "./services/data-service";
import { LoggerService, RealLoggerService } from "./services/logger-service";
import { Item } from "./models/item";

class App extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new RealDataService();
  
  @Destroy()
  @Inject(LoggerService)
  logger = new RealLoggerService();
  
  Bound(): void {
    super.Bound();
    this.logger.Log("App initialized");
    
    // Add some sample data
    this.dataService.AddItem({ name: "Item 1", value: 100 });
    this.dataService.AddItem({ name: "Item 2", value: 200 });
    this.dataService.AddItem({ name: "Item 3", value: 300 });
  }
  
  Template() {
    return div({ props: { className: "app" } }, () => [
      h1({ props: { className: "title" } }, () => 
        "Tutorial 7: Dependency Injection"
      ),
      h2({ props: { className: "subtitle" } }, () => 
        "Services injected via @Inject decorator"
      ),
      dataViewer(
        {},  // No data props
        {
          renderItem: (item: Item) => 
            div({ props: { className: "item-render" } }, () => 
              `${item.name} (Value: ${item.value})`
            )
        }  // Template functions
      )
    ]);
  }
  
  Destroy(): void {
    super.Destroy();
    this.logger.Log("App destroyed");
  }
}

// Attach the app
const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));

console.log("Tutorial 7: Dependency Injection loaded successfully!");
```

### 6. Testing with Mock Services

One of the key benefits of dependency injection is testability. You can inject mock services during testing.

**Example: Unit Tests with Vitest**

```typescript
// src/services/data-service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { RealDataService, MockDataService } from "./data-service";

describe("DataService", () => {
  let service: RealDataService;

  beforeEach(() => {
    service = new RealDataService();
  });

  it("should add items correctly", () => {
    service.AddItem({ name: "Test Item", value: 100 });
    
    const data = service.GetData();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Item");
    expect(data[0].value).toBe(100);
  });

  it("should delete items by ID", () => {
    service.AddItem({ name: "Item 1", value: 100 });
    service.AddItem({ name: "Item 2", value: 200 });
    
    service.DeleteItem(1);
    
    const data = service.GetData();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(2);
  });
});

describe("MockDataService for Testing", () => {
  it("should provide mock data without side effects", () => {
    const mockService = new MockDataService();
    
    mockService.AddItem({ name: "Mock Item", value: 50 });
    mockService.DeleteItem(1);
    
    expect(mockService.GetData()).toHaveLength(0);
  });
});
```

**Running Tests:**

```bash
npm run test
```

**Benefits of This Testing Approach:**

1. **No External Dependencies**: Mock services don't hit databases or APIs
2. **Fast Execution**: Tests run in milliseconds without async operations
3. **Isolation**: Each test is independent and repeatable
4. **Verification**: MockLoggerService captures logs for assertion

**Testing Component with Injected Services:**

```typescript
// In component tests, you can inject mocks:
class TestComponent extends Component {
  @Inject(DataService)
  dataService = new MockDataService();  // Use mock for testing
  
  @Inject(LoggerService)
  logger = new MockLoggerService();     // Capture logs without console noise
}
```

### Testing Component Logic

For UI components, you can test the business logic separately from the framework. Here's an example testing the DataViewer's handlers:

```typescript
// src/components/data-viewer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { DataService } from "../services/data-service";
import { LoggerService } from "../services/logger-service";

describe("DataViewer Component Logic", () => {
  // Create mock implementations
  class MockDataService implements DataService {
    private items: Item[] = [];
    
    GetData() { return [...this.items]; }
    AddItem(item: Omit<Item, "id" | "createdAt">) {
      this.items.push({ ...item, id: 1, createdAt: new Date() });
    }
    DeleteItem(id: number) {
      this.items = this.items.filter(i => i.id !== id);
    }
  }

  class MockLoggerService implements LoggerService {
    logs: string[] = [];
    Log(msg: string) { this.logs.push(msg); }
    Error(msg: string) { this.logs.push(msg); }
    Warn(msg: string) { this.logs.push(msg); }
  }

  let dataService: MockDataService;
  let loggerService: MockLoggerService;
  let newItemName: string;
  let newItemValue: number;

  beforeEach(() => {
    dataService = new MockDataService();
    loggerService = new MockLoggerService();
    newItemName = "";
    newItemValue = 0;
  });

  it("should add item when name is provided", () => {
    // Simulate user input
    newItemName = "Test Item";
    newItemValue = 100;

    // Execute add logic (mimicking handleAddItem)
    if (newItemName.trim()) {
      dataService.AddItem({
        name: newItemName.trim(),
        value: newItemValue,
      });
      loggerService.Log(`Added item: ${newItemName}`);
      
      // Reset form
      newItemName = "";
      newItemValue = 0;
    }

    // Verify
    expect(dataService.GetData()).toHaveLength(1);
    expect(dataService.GetData()[0].name).toBe("Test Item");
    expect(loggerService.logs).toContain(
      expect.stringContaining("Added item: Test Item")
    );
    expect(newItemName).toBe("");
    expect(newItemValue).toBe(0);
  });

  it("should not add item when name is empty", () => {
    newItemName = "   ";
    
    if (newItemName.trim()) {
      dataService.AddItem({ name: newItemName.trim(), value: newItemValue });
    }

    expect(dataService.GetData()).toHaveLength(0);
  });

  it("should delete item by ID", () => {
    dataService.AddItem({ name: "Item 1", value: 100 });
    dataService.AddItem({ name: "Item 2", value: 200 });

    dataService.DeleteItem(1);
    loggerService.Log(`Deleted item: 1`);

    expect(dataService.GetData()).toHaveLength(1);
    expect(dataService.GetData()[0].id).toBe(2);
  });
});
```

**Benefits of Testing Component Logic:**

1. **No Framework Dependencies**: Test business logic without Component initialization
2. **Fast Execution**: Runs in milliseconds without DOM setup
3. **Clear Intent**: Tests focus on behavior, not rendering
4. **Easy Mocking**: Replace services with simple test doubles

**Running Tests:**

```bash
npm run test
```

**Test Coverage Example:**

- ✅ DataViewer: 10 tests covering add/delete workflows
- ✅ DataService: 5 tests covering CRUD operations
- ✅ LoggerService: 4 tests covering logging and cleanup
- ✅ Mock services: 3 tests verifying test isolation

---

## Try It Yourself Exercises

### Exercise 1: Create a Mock Logger for Testing

Create a `MockLoggerService` that stores logs in memory instead of console:

```typescript
// Your task: Implement MockLoggerService that:
// 1. Stores all logs in a string[] array
// 2. Provides a GetLogs() method to retrieve all logs
// 3. Provides a ClearLogs() method to reset the array
// 4. Implements Destroy() to clear logs
```

<details>
<summary>Click for solution</summary>

```typescript
export class MockLoggerService extends LoggerService {
  private logs: string[] = [];
  
  Log(message: string): void {
    this.logs.push(`LOG: ${message}`);
  }
  
  Error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }
  
  Warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
  }
  
  GetLogs(): string[] {
    return [...this.logs];  // Return copy
  }
  
  ClearLogs(): void {
    this.logs = [];
  }
  
  Destroy(): void {
    this.ClearLogs();
  }
}
```
</details>

### Exercise 2: Create a Cache Service

Create a caching service that wraps the DataService:

```typescript
// Your task: Implement CacheableDataService that:
// 1. Extends DataService
// 2. Caches items for 5 seconds
// 3. Returns cached data if not expired
// 4. Fetches fresh data if cache expired
```

<details>
<summary>Click for solution</summary>

```typescript
export class CacheableDataService extends DataService implements IDestroyable {
  private cache: { items: Item[]; timestamp: number } | null = null;
  private cacheDuration = 5000;  // 5 seconds
  private timerId: ReturnType<typeof setTimeout> | null = null;
  
  constructor(private wrappedService: DataService) {
    super();
  }
  
  GetData(): Item[] {
    const now = Date.now();
    
    // Return cached if not expired
    if (this.cache && (now - this.cache.timestamp) < this.cacheDuration) {
      return this.cache.items;
    }
    
    // Fetch fresh data
    const items = this.wrappedService.GetData();
    this.cache = { items, timestamp: now };
    return items;
  }
  
  AddItem(item: Omit<Item, "id" | "createdAt">): void {
    this.wrappedService.AddItem(item);
    this.cache = null;  // Invalidate cache
  }
  
  DeleteItem(id: number): void {
    this.wrappedService.DeleteItem(id);
    this.cache = null;  // Invalidate cache
  }
  
  Destroy(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.cache = null;
  }
}
```
</details>

### Exercise 3: Test with Mock Service

Create a test component that uses `MockLoggerService` instead of `RealLoggerService`:

```typescript
// Your task: Modify App to use MockLoggerService for testing
```

<details>
<summary>Click for solution</summary>

```typescript
import { MockLoggerService } from "./services/logger-service";

class TestApp extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new RealDataService();
  
  @Destroy()
  @Inject(LoggerService)
  logger = new MockLoggerService();  // Use mock instead
  
  // ... rest of component
}
```
</details>

---

## Troubleshooting

### "Cannot read property 'Get' of undefined"

**Problem:** The injected service is undefined when accessed.

**Solution:** Make sure the parent component provides the service:

```typescript
// ❌ Wrong - not initializing the service
@Inject(LoggerService)
logger!: LoggerService;  // Will be undefined if not in parent

// ✅ Correct - providing the service
@Inject(LoggerService)
logger = new LoggerService();  // Registers in injector
```

### Services Not Being Cleaned Up

**Problem:** Memory leaks from timers/subscriptions not being cleaned up.

**Solution:** Make sure to call `super.Destroy()`:

```typescript
// ❌ Wrong - forgot to call super.Destroy()
Destroy(): void {
  // Custom cleanup only, @Destroy properties not cleaned
}

// ✅ Correct - call super.Destroy() first
Destroy(): void {
  super.Destroy();  // Triggers @Destroy cleanup
  // Custom cleanup
}
```

### "Service not found in injector hierarchy"

**Problem:** Child component can't find service from parent.

**Solution:** Check injector hierarchy:

```typescript
// Ensure parent provides service
class Parent extends Component {
  @Inject(MyService)
  service = new MyService();  // ✅ Registers in parent's injector
  
  Template() {
    return childComponent({});  // ✅ Child inherits parent's injector
  }
}
```

### Multiple Service Instances

**Problem:** Each component creates its own service instance instead of sharing.

**Solution:** Register service at the highest needed scope:

```typescript
// ❌ Wrong - each instance creates its own service
class ComponentA extends Component {
  @Inject(MyService)
  service = new MyService();  // Creates instance when component constructs
}

// ✅ Correct - register once at root level
class RootComponent extends Component {
  @Inject(MyService)
  service = new MyService();  // Single instance for all children
  
  Template() {
    return div({}, () => [
      componentA({}),  // ✅ Uses Root's instance via injection
      componentB({})   // ✅ Uses Root's instance via injection
    ]);
  }
}
```

---

## Key Concepts Summary

### Dependency Injection Benefits

| Aspect | Without DI | With DI |
|--------|-----------|---------|
| **Coupling** | Tight (hard-coded) | Loose (abstractions) |
| **Testability** | Hard to mock | Easy to inject mocks |
| **Flexibility** | Changes require code edits | Swap implementations |
| **Code Duplication** | Each component creates | Single shared instance |

### Injector Hierarchy

```
Root Component (Injector A)
    │
    ├── Service1 registered here
    │
    └── Child Component (Injector B, parent = A)
        │
        ├── Can access Service1 (from A)
        │
        └── Service2 registered here
            │
            └── Grandchild (Injector C, parent = B)
                ├── Can access Service1 (from A)
                └── Can access Service2 (from B)
```

### @Inject Decorator Patterns

| Pattern | Code | Purpose |
|---------|------|---------|
| **Provider** | `@Inject(Svc) svc = new Svc()` | Register and provide service |
| **Consumer** | `@Inject(Svc) svc!: Svc` | Receive from parent |
| **With Default** | `@Inject(Svc) svc = new Svc()` | Use fallback if not injected |

### @Inject + @Destroy Combination

```typescript
class App extends Component {
  @Destroy()                    // Mark for cleanup
  @Inject(DataService)          // Inject from injector
  dataService = new DataService();  // Register and use
  
  Destroy(): void {
    super.Destroy();  // Calls dataService.Destroy() automatically
  }
}
```

---

## References

### Tutorial Documentation

- **Tutorial 5: Decorators Deep Dive** - Understanding decorators (`docs/tutorials/05-decorators-deep-dive.md`)
- **Tutorial 6: Component Composition** - Component patterns (`docs/tutorials/06-component-composition.md`)

### Patterns Documentation

- **Dependency Injection** - Full API reference (`docs/patterns/04-dependency-injection.md`)
- **Reactivity** - @Inject and @Destroy details (`docs/patterns/02-reactivity.md`)

### Framework Source

- **Injector** - `src/Utils/injector.ts`
- **Decorators** - `src/Utils/decorators.ts`
- **IDestroyable** - `src/Utils/utils.types.ts`

### Example Projects

- **Real-Time Dashboard** - Production DI example (`examples/real_time_dashboard/`)

---

## Check Your Understanding

✅ **Can you explain** why dependency injection improves code quality?

✅ **Can you create** an abstract class service contract?

✅ **Can you use** the `@Inject` decorator for dependency injection?

✅ **Can you implement** the IDestroyable pattern for cleanup?

✅ **Can you combine** `@Inject` with `@Destroy` for automatic resource management?

---

## Next Steps

- **Tutorial 8: Building a Complete App** - Combine all concepts in a real-time dashboard
- **Review Patterns** - Read the full patterns documentation for deeper understanding
- **Build Your Own** - Create a small app using dependency injection patterns

---

## Success Checklist

A tutorial is complete when:

- [x] Documentation is clear and accurate
- [x] Example project builds with `npm run build`
- [x] Dev server runs with `npm run dev`
- [x] App renders correctly in browser
- [x] All exercises have clear instructions
- [x] References to patterns docs are accurate
- [x] Troubleshooting covers common issues
