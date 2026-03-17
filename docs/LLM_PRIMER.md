# j-templates LLM Primer

## Quick Overview

TypeScript reactive framework for browser UI. No compile step, minimal dependencies.

**Core concepts:** Components define UI via `Template()` method. State decorators (`@Value`, `@State`, `@Computed`) enable reactivity. DOM functions (`div()`, `button()`) create virtual nodes.

---

## Project Setup

### Installation

```bash
npm install j-templates
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Required:** `"experimentalDecorators": true` enables decorator support.

### Recommended Build Tools

**Vite:**
```bash
npm create vite@latest my-app -- --template vanilla-ts
npm install j-templates
```

**Parcel:**
```bash
npm install j-templates parcel --save-dev
```

j-templates works with any bundler supporting TypeScript and ES modules.

### File Naming

- **Components:** kebab-case (e.g., `todo-list.ts`, `data-table.ts`)
- **Services:** kebab-case with `-service` suffix (e.g., `data-service.ts`)
- **Component exports:** lowercase matching filename (e.g., `export const todoList`)

---

## Core API

### Component Class

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class MyComponent extends Component<D, T, E> {
  // D = data type from parent
  // T = template functions from parent  
  // E = event map type

  Template() {
    return div({}, () => "Hello");
  }

  Bound() {
    // Called after DOM attachment - @Watch decorators initialized here
    super.Bound(); // Required: calls Bound.All(this)
  }

  Destroy() {
    // Cleanup resources
    super.Destroy(); // Required: calls Destroy.All(this)
  }
}

// Convert to reusable function
export const myComponent = Component.ToFunction("my-component", MyComponent);

// Attach to DOM
Component.Attach(document.body, myComponent({}));

// Register as Web Component
Component.Register("my-component", MyComponent);
```

### Generic Parameters

- `D`: Data type from parent via `data: () => ({ ... })`. Access via `this.Data`
- `T`: Template functions from parent. Access via `this.Templates`
- `E`: Event map `{ eventName: payloadType }`. Fire via `this.Fire("event", payload)`

### Component Properties

```typescript
class MyComponent extends Component<D, T, E> {
  // Access component's scoped data
  protected get Data(): D { }

  // Access parent-provided templates
  protected get Templates(): T { }

  // Access component's injector
  protected get Injector(): Injector { }

  // Access underlying virtual node
  protected get VNode(): vElementNode { }

  // Check if component is destroyed
  public get Destroyed(): boolean { }
}
```

---

## State Management

### Decorators

```typescript
import { Value, State, Computed, Scope, Watch, Inject, Destroy, Bound } from "j-templates/Utils";

class MyComponent extends Component {
  // Primitives - lightweight
  @Value() count: number = 0;
  @Value() isLoading: boolean = false;

  // Complex objects/arrays - deep reactivity
  @State() user: { name: string } = { name: "" };
  @State() items: TodoItem[] = [];

  // Derived state - cached, new reference (cheap computations)
  @Scope()
  get doubled() {
    return this.count * 2;
  }
  
  // Derived state - when generating new objects
  @Computed({
    completedCount: 0,
    lastCompletedTime: ""
  })
  get completedReport() {
    const items = this.items.filter(i => i.completed);
    items.sort((a, b) => a.completedTime < b.completedTime ? 1 : -1);
    
    return {
      completedCount: items.length,
      lastCompletedTime: items.length > 0 ? items[0].completedTime : ""
    };
  }

  // Watch changes
  @Watch((self) => self.count)
  handleCountChanged(newValue: number) {
    console.log("Count:", newValue);
  }

  // Dependency injection
  @Inject(DataService)
  dataService!: DataService;

  // Auto-cleanup on destroy
  @Destroy()
  timer: Timer = new Timer();
}
```

### Decorator Selection Guide

| Value Type | Use | Why |
|------------|-----|-----|
| number, string, boolean | `@Value` | Lightweight, no proxy |
| null, undefined | `@Value` | Simple scope |
| { nested: objects } | `@State` | Deep reactivity |
| arrays (User[]) | `@State` | Array mutations |
| getters (expensive) | `@Computed` | Caching + object reuse |
| getters (cheap) | `@Scope` | Caching only |
| watch changes | `@Watch` | Callback on change |
| dependency | `@Inject` | DI from injector |
| cleanup | `@Destroy` | Auto .Destroy() |

### @Computed vs @Scope (both cache)

| Aspect | @Computed | @Scope |
|--------|-----------|--------|
| Object identity | ✅ Same reference | ❌ New reference |
| Overhead | Store + diff | Single scope |
| Best for | Creating new objects | Returning existing objects |

**Object Reuse:** `@Computed` preserves object identity via `ObservableNode.ApplyDiff`. Critical for NEW objects needing stable identity for DOM reuse.

**Context: Decorators vs ObservableScope**
```typescript
// Components: Use decorators
class MyComponent extends Component {
  @Computed([]) get transformed() { return this.items.map(/* ... */); }
  @Scope() get filtered() { return this.items.filter(/* ... */); }
}

// Services: Use ObservableScope.Create()
class DataService implements IDestroyable {
  private derived = ObservableScope.Create(() => {
    const data = this.store.Get<Data[]>("data", []);
    return ObservableNode.Unwrap(data).filter(/* ... */);
  });
  
  get DerivedData() { return ObservableScope.Value(this.derived); }
}
```

**Framework Behavior:**
- Array container identity = micro-optimization (framework handles efficiently)
- Object identity inside arrays = critical (framework uses this to match DOM elements)

**Component Examples:**
```typescript
// ✅ @Computed - Creating NEW objects
@Computed([])
get transformedItems() {
  return this.items.map(i => ({ id: i.id, displayName: `Item: ${i.name}` }));
}

// ✅ @Scope - Returning EXISTING objects
@Scope()
get filteredItems() { return this.items.filter(i => i.active); }

// ✅ @Scope - Primitives
@Scope()
get itemCount() { return this.items.length; }
```

---

## Template System

### DOM Functions

```typescript
import { 
  div, h1, button, input, span, 
  table, tbody, tr, td, thead, th,
  text
} from "j-templates/DOM";

Template() {
  return div({ props: { className: "container" } }, () => [
    h1({}, () => "Title"),
    
    // Reactive data binding
    div({ data: () => this.Data.items }, (item) =>
      div({}, () => item.name)
    ),
    
    // Props as function
    div({
      props: () => ({ className: this.isActive ? "active" : "" })
    }, () => "Content"),
    
    // Event handlers
    button({
      on: { 
        click: (e: MouseEvent) => this.handleClick(e)
      }
    }, () => "Click"),
    
    // Conditional
    this.isLoading ? div({}, () => "Loading") : "",
    
    // Component
    childComponent({ data: () => ({ id: 1 }) }),
    
    // Reactive text node
    text(() => `Count: ${this.count}`)
  ]);
}
```

### Config Properties

```typescript
interface NodeConfig<P = HTMLElement, E = HTMLElementEventMap, T = never> {
  props?: FunctionOr<RecursivePartial<P>>;  // DOM properties
  attrs?: FunctionOr<{ [name: string]: string }>;  // HTML attributes
  on?: FunctionOr<vNodeEvents<E>>;  // Event handlers
  data?: () => T | Array<T>;  // Reactive data for iteration
}
```

**Functions are reactive:** When referenced scope values change, vNode re-renders.

### data: () => Binding Behavior

When `data:` returns a value and a children function is provided, the framework iterates:

```typescript
// Framework iterates over data value:
tbody({ data: () => this.items }, (item) => tr({}, () => ...))
```

**Value handling:**

| Return Value | Behavior |
|--------------|----------|
| `[]` (empty array) | No children rendered |
| `[a, b, c]` (array) | Iterates, renders child for each item |
| `{ id: 1 }` (object) | Wraps as `[{ id: 1 }]`, renders once |
| `"text"` (string) | Wraps as `["text"]`, renders once |
| `123` (number) | Wraps as `[123]`, renders once |
| `falsy` / `null` / `undefined` | Returns `[]`, no children rendered |

**Examples:**

```typescript
// Array - iterates normally
div({ data: () => this.items }, (item) => 
  div({}, () => item.name)
)
// items = [] → no divs
// items = [a, b] → two divs

// Object - renders once
div({ data: () => this.selectedItem }, (item) => 
  div({}, () => item.name)
)
// selectedItem = { id: 1 } → renders once with { id: 1 }

// Falsy - no children
div({ data: () => this.items }, (item) => 
  div({}, () => item.name)
)
// items = null → no divs
// items = undefined → no divs
```

**Key points:**
- Non-array values are wrapped in `[value]`
- Falsy values (`null`, `undefined`) render no children
- Array length determines number of child renders
- Children function receives each value (or wrapped value) as parameter

---

## Component Composition

### ToFunction Pattern

```typescript
// Child component
class Cell extends Component<{ data: User }> {
  Template() {
    return div({}, () => this.Data.data.name);
  }
}
export const cell = Component.ToFunction("cell", Cell);

// Parent uses it
class App extends Component {
  Template() {
    return cell({ data: () => ({ data: this.user }) });
  }
}
```

### Register as Web Component

```typescript
class MyComponent extends Component {
  Template() {
    return div({}, () => "Web Component");
  }
}

// Register as custom element
Component.Register("my-component", MyComponent);

// Use in HTML: <my-component></my-component>
```

### Template Callbacks

```typescript
interface RowTemplate<D> {
  render: (data: D) => vNode;
}

class Table<D> extends Component<{ data: D[] }, RowTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item: D) =>
      this.Templates.render(item)
    );
  }
}

// Usage
table({ data: () => ({ data: users }) }, {
  render: (user) => div({}, () => user.name)
});
```

### Component Events

```typescript
interface ButtonEvents {
  click: { x: number; y: number };
}

class Button extends Component<{}, {}, ButtonEvents> {
  Template() {
    return button({
      on: { click: (e) => this.Fire("click", { x: e.clientX, y: e.clientY }) }
    }, () => "Click");
  }
}

// Parent handles event
button({
  data: () => ({}),
  on: { click: (p) => console.log(p.x, p.y) }
});
```

---

## Dependency Injection

### Abstract Service Classes

```typescript
// Define interface via abstract class
abstract class DataService {
  abstract getData(): Data[];
  abstract addData(item: Data): void;
}

// Component injects abstract type
class Child extends Component {
  @Inject(DataService)
  dataService!: DataService;  // Any DataService implementation

  Template() {
    return div({}, () => this.dataService.getData().length);
  }
}

// Parent provides concrete implementation
class App extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new RealDataService();  // Concrete implementation

  Template() {
    return child({});
  }
}
```

### IDestroyable Services

Services with cleanup needs (timers, connections, subscriptions):

```typescript
import { IDestroyable } from "j-templates/Utils";

class SocketService implements IDestroyable {
  private socket: WebSocket | null = null;
  
  connect() { this.socket = new WebSocket("wss://..."); }
  
  Destroy(): void {
    this.socket?.close();
    this.socket = null;
  }
}

// @Destroy automatically calls service.Destroy()
class ChatComponent extends Component {
  @Destroy()
  @Inject(SocketService)
  socketService!: SocketService;
}
```

**Benefits:** Decouples components from implementations, enables mocking in tests.

**Injector API:**
```typescript
class Injector {
  Set<T>(type: ConstructorToken<T>, value: T): void;
  Get<T>(type: ConstructorToken<T>): T | undefined;
}
```

---

## Reactive Data Patterns

### calc() - Optional Optimization

```typescript
import { calc } from "j-templates";

// NOT required for array reactivity (@State works fine)
// Use only when parent scope changes but derived value doesn't

// Optimization: batch updates when parent changes frequently
tbody({ data: () => calc(() => this.Data.data) }, (item) =>
  tr({}, () => div({}, () => item.name))
);
```

**When to use:** Parent scope aggregates multiple values, or derived primitive unchanged despite parent changes.

### ObservableScope (Advanced)

**Components:** Use `@Scope`/`@Computed` decorators  
**Services:** Use `ObservableScope.Create()` for derived state

```typescript
import { ObservableScope, StoreAsync } from "j-templates/Store";

// Service pattern: StoreAsync + ObservableScope
class DataService implements IDestroyable {
  private store = new StoreAsync((value) => value.id);
  
  // Derived state computation
  private derivedData = ObservableScope.Create(() => {
    const items = this.store.Get<Item[]>("items", []);
    return ObservableNode.Unwrap(items)
      .filter(i => i.active)
      .sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
  });
  
  // Reactive getter
  get DerivedData() {
    return ObservableScope.Value(this.derivedData);
  }
  
  // Mutation triggers recomputation
  addItems(...items: Item[]) {
    this.store.Push("items", ...items);
    // All ObservableScope.Create() scopes auto-recompute
  }
  
  Destroy(): void {
    this.store.Destroy();
  }
}
```

**Standalone usage:**
```typescript
private counter = ObservableScope.Create(() => counterValue);

get Count() { return ObservableScope.Value(this.counter); }
get CountPeek() { return ObservableScope.Peek(this.counter); }

ObservableScope.Watch(this.counter, (scope) => { });
ObservableScope.Destroy(this.counter);
```

### StoreSync - Shared Data

```typescript
import { StoreSync } from "j-templates/Store";

// Create store with key function for object sharing
private store = new StoreSync((value) => value.id);

// Write data
this.store.Write(user, "user-1");

// Patch
this.store.Patch("user-1", { name: "Updated" });

// Array operations
this.store.Write([], "users");
this.store.Push("users", user1, user2);

// Get data (returns read-only observable node)
const users = this.store.Get<User[]>("users", []);
```

### StoreAsync - Async Data

```typescript
import { StoreAsync } from "j-templates/Store";

// With key function for object sharing (recommended)
private store = new StoreAsync((value) => value.id);

// Same API as StoreSync
this.store.Write(data, "data");
this.store.Push("data", newItem1, newItem2);
const data = this.store.Get("data", defaultValue);
```

**When to use:** Async data loading, background operations, workers. Combine with `ObservableScope.Create()` for derived state.

### Complete Service Pattern

```typescript
// types.ts - Service interface
export abstract class ActivityDataService {
  abstract GetActivityData(): ActivityRow[];
  abstract GetReport(): Report;
}

// dataService.ts - Implementation
export class DataService extends ActivityDataService implements IDestroyable {
  private store = new StoreAsync((value) => value.id);
  
  // Reactive derived computations
  private activityData = ObservableScope.Create(() => {
    const activities = this.store.Get<Activity[]>("activities", []);
    return ObservableNode.Unwrap(activities).sort(/* ... */);
  });
  
  private report = ObservableScope.Create(() => {
    const data = ObservableScope.Value(this.activityData);
    return computeReport(data);
  });
  
  // Reactive getters
  get ActivityData() { return ObservableScope.Value(this.activityData); }
  get Report() { return ObservableScope.Value(this.report); }
  
  // Interface implementation
  GetActivityData(): ActivityRow[] { return this.ActivityData; }
  GetReport(): Report { return this.Report; }
  
  // Mutations
  RefreshData() {
    const newActivities = generateActivities();
    this.store.Push("activities", ...newActivities);
    // All scopes auto-recompute
  }
  
  // Cleanup
  Destroy(): void { this.store.Destroy(); }
}

// app.ts - Usage with DI
class App extends Component {
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();
  
  Template() {
    return div({}, () => this.dataService.GetReport().totalActivities);
  }
}
```

---

## Lifecycle

```
1. Component.Attach() called
2. vNode.Init() called
3. Component constructor runs
4. Bound() called - @Watch decorators initialized (calls Bound.All(this))
5. Template rendered, attached to DOM
6. ... user interacts, reactivity updates ...
7. Component.Destroy() called
8. Destroy() called - scopes destroyed, @Destroy cleanup (calls Destroy.All(this))
```

**Lifecycle Methods:**
```typescript
class MyComponent extends Component {
  constructor(vNode: vElementNode, config: any, templates: any) {
    super(vNode, config, templates);
    // Component construction
  }

  Bound() {
    super.Bound(); // Required - initializes @Watch decorators
    // Post-DOM attachment initialization
  }

  Destroy() {
    super.Destroy(); // Required - cleans up scopes and @Destroy properties
    // Custom cleanup
  }
}
```

---

## Best Practices

**State:**
- Use `@Value` for primitives, `@State` for objects/arrays
- Use `@Computed` for expensive derived state, `@Scope` for cheap
- Clean up in `Destroy()` - use `@Destroy` decorator for auto-cleanup
- Always call `super.Bound()` and `super.Destroy()` when overriding

**State Location Decision Table:**
| State Type | Location | Decorator/API | Example |
|------------|----------|---------------|---------|
| Raw data store | Service | `StoreAsync`/`StoreSync` | Messages, users |
| Derived (shared) | Service | `ObservableScope.Create()` | Counts, aggregates |
| Derived (local) | Component | `@Scope()` | Filtered list |
| Primitives (local) | Component | `@Value()` | Input text, hover |
| Complex (local) | Component | `@State()` | Form data object |
| External resources | Service | `IDestroyable` | WebSocket, timers |

**Templates:**
- Keep `Template()` pure - no side effects
- Use functions for reactive bindings: `data: () => this.state`
- Use `calc()` only for optimization, not required for arrays
- Use `text()` for reactive text nodes

**Components:**
- Name descriptively: kebab-case for ToFunction type names
- Use generics for typed data/events
- Pass data as functions: `data: () => ({ ... })`
- Design template interfaces: `CellTemplate<D>`

**DI:**
- Define abstract service classes
- Use `@Inject` with constructor types
- Override in injector for testing
- Combine `@Inject` and `@Destroy` for services needing cleanup

**Reactivity:**
- Access data via `this.Data.prop` or getters for reactivity
- Don't access `@State`/`@Value` fields directly in templates
- Use getters to wrap `this.Data` for scoped updates

---

## Available DOM Functions

```typescript
// From "j-templates/DOM"

// Layout
div, span, section, article, aside, nav, main, header, footer, hr, blockquote, address

// Text content
h1, h2, h3, h4, h5, h6, p, a, b, strong, i, em, u, s, strike, del, ins, sub, sup, mark, small
label, pre, code, kbd, samp, var, cite, q, abbr, time, dfn, rt, rp

// Lists
ul, ol, li, dl, dt, dd

// Tables
table, thead, tbody, tfoot, tr, th, td, col, colgroup

// Forms
form, input, textarea, button, select, option, optgroup, label, fieldset, legend
datalist, output, progress, meter

// Media
img, figure, figcaption, picture, source, audio, video, track, embed, object, param, iframe

// Interactive
details, summary, dialog, menu

// Scripting
canvas, svg, map, area

// Meta
template, slot

// Utilities
text() - reactive text node
```

---

## Utilities

```typescript
// From "j-templates/Utils"
Value, State, Computed, Scope, Watch, Inject, Destroy, Bound
Animation, AnimationType
Injector
IDestroyable (interface)

// From "j-templates/Store"  
ObservableScope, ObservableNode, StoreSync, StoreAsync

// From "j-templates"
Component, calc
```

### Animation

```typescript
import { Animation, AnimationType } from "j-templates/Utils";

class MyComponent extends Component {
  @Destroy()
  animation = new Animation(AnimationType.EaseIn, 1000, (value) => {
    // Update UI with interpolated value
    this.progress = value;
  });

  async startAnimation() {
    await this.animation.Animate(0, 100);
  }
}
```

**AnimationType:**
- `AnimationType.Linear` - Linear interpolation
- `AnimationType.EaseIn` - Ease-in cubic bezier

---

## Common Patterns

### Loading State
```typescript
@Value() isLoading = false;
@Value() error: string | null = null;
@State() items: Item[] = [];

@Watch((self) => self.isLoading)
handleLoading(loading) {
  if (loading) this.error = null;
}

Template() {
  return div({}, () => [
    this.isLoading ? div({}, () => "Loading...") : "",
    this.error ? div({}, () => this.error) : "",
    div({ data: () => this.items }, (item) => div({}, () => item.name))
  ]);
}
```

### Form Handling
```typescript
@Value() value = "";

input({
  props: () => ({ value: this.value }),
  on: {
    input: (e: Event) => {
      this.value = (e.target as HTMLInputElement).value;
    }
  }
})
```

### Auto-refresh Timer
```typescript
import { RefreshTimer } from "./services/refreshTimer";

@Destroy()
refreshTimer = new RefreshTimer(() => this.refresh(), 5000);

Bound() {
  super.Bound();
  this.refreshTimer.start();
}
```

### Service with StoreSync
```typescript
class TodoService {
  private store = new StoreSync<TodoItem>((item) => item.id);

  constructor() {
    this.store.Write([], "todos");
  }

  addTodo(text: string) {
    const newTodo = { id: Date.now().toString(), text, completed: false };
    this.store.Push("todos", newTodo);
  }

  toggleTodo(id: string) {
    const todos = this.store.Get<TodoItem[]>("todos", []);
    const todo = todos.find(t => t.id === id);
    if (todo) this.store.Patch(id, { completed: !todo.completed });
  }

  getTodos(): TodoItem[] {
    return this.store.Get<TodoItem[]>("todos", []);
  }

  Destroy() {
    // StoreSync doesn't need cleanup, but implement if needed
  }
}
```

---

## Internal Mechanics (For Debugging)

**Reactivity Flow:**
1. Decorators create `ObservableScope` or `ObservableNode` instances storing values
2. `Template()` functions read these scopes via `this.Data`, getters, `@State` access
3. Scope reads register dependencies in watch context
4. When scope value changes, watchers fire in microtask batch
5. `vNode` re-renders affected DOM nodes via scheduled updates

**Scope Types:**
- `static`: Fixed value, no tracking, zero overhead
- `dynamic`: Tracks dependencies, caches result, emits on change
- `greedy`: Batches updates via microtask queue (used for watch callbacks, async operations)

**Object Sharing:**
`StoreSync` with key function shares objects by ID. Two writes with same key return same reference, enabling efficient diff updates.

**Diff Updates:**
`@Computed` uses `StoreSync` + `ObservableNode.ApplyDiff` to update objects in-place, preserving identity across re-renders.

**Memory Management:**
- All scopes tracked in component's scope map (WeakMap-based)
- `Component.Destroy()` calls `ObservableScope.DestroyAll()` via `Destroy.All(this)`
- `@Destroy` properties get `.Destroy()` called automatically
- `@Watch` subscriptions auto-cleanup via scope destruction
- Lazy initialization: scopes created on first access, not construction

**Lazy Initialization:**
```typescript
@Value() count: number = 0;  // Scope created when first accessed
@State() items: Item[] = []; // ObservableNode created when first accessed
@Scope() /* or */ @Computed([]) get filtered() {} // Scopes created when first accessed
```

---

## Testing Strategies

### Unit Testing Components

```typescript
import { describe, it, expect } from "vitest";
import { MyComponent } from "./my-component";
import { Component } from "j-templates";

describe("MyComponent", () => {
  it("should render with data", () => {
    const componentFn = Component.ToFunction("test", MyComponent);
    const vnode = componentFn({ data: () => ({ value: "test" }) });
    
    expect(vnode).toBeDefined();
    expect(vnode.definition.type).toBe("test");
  });
});
```

### Testing Services

```typescript
import { DataService } from "./data-service";

describe("DataService", () => {
  it("should add items", () => {
    const service = new DataService();
    service.addItem({ id: "1", name: "Test" });
    
    const items = service.getItems();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe("Test");
  });
});
```

### Testing with Mock Dependencies

```typescript
class TestComponent extends Component {
  @Inject(LoggerService) logger!: LoggerService;
  
  doWork() {
    this.logger.log("working");
  }
}

// In test
const mockLogger = { log: vi.fn() };
const component = new TestComponent(vnode, {}, {});
component.Injector.Set(LoggerService, mockLogger);

component.doWork();
expect(mockLogger.log).toHaveBeenCalledWith("working");
```

---

## Complete Example

This example demonstrates all primary patterns together:

```typescript
// 1. Service with StoreSync (dependency injection target)
import { StoreSync } from "j-templates/Store";

export class TodoService {
  private store = new StoreSync<TodoItem>((item) => item.id);

  constructor() {
    this.store.Write([], "todos");
  }

  addTodo(text: string) {
    const newTodo = { id: Date.now().toString(), text, completed: false };
    this.store.Push("todos", newTodo);
  }

  toggleTodo(id: string) {
    const todos = this.store.Get<TodoItem[]>("todos", []);
    const todo = todos.find(t => t.id === id);
    if (todo) this.store.Patch(id, { completed: !todo.completed });
  }

  getTodos(): TodoItem[] {
    return this.store.Get<TodoItem[]>("todos", []);
  }

  Destroy() {
    // Cleanup if needed
  }
}

// 2. Child component with events
import { Component } from "j-templates";
import { div, input, span, button } from "j-templates/DOM";
import { Value } from "j-templates/Utils";

interface TodoItemEvents {
  toggle: { id: string };
  delete: { id: string };
}

class TodoItemComponent extends Component<{ todo: TodoItem }, void, TodoItemEvents> {
  @Value() isHovered = false;
  
  get Todo() {
    return this.Data.todo;
  }

  Template() {
    return div({
      props: () => ({
        className: `todo-item ${this.Todo.completed ? "completed" : ""}`
      }),
      on: {
        mouseenter: () => this.isHovered = true,
        mouseleave: () => this.isHovered = false
      }
    }, () => [
      input({
        props: () => ({ type: "checkbox", checked: this.Todo.completed }),
        on: { change: () => this.Fire("toggle", { id: this.Todo.id }) }
      }),
      span({ props: { className: "text" } }, () => this.Todo.text),
      button({
        props: () => ({ 
          className: "delete", 
          style: this.isHovered ? "display:inline" : "display:none" 
        }),
        on: { click: () => this.Fire("delete", { id: this.Todo.id }) }
      }, () => "×")
    ]);
  }
}
export const todoItem = Component.ToFunction("todo-item", TodoItemComponent);

// 3. Parent component with composition, injected service, reactive state
import { Component, calc } from "j-templates";
import { div, input, button, span } from "j-templates/DOM";
import { Value, Scope, Watch, Inject, Destroy } from "j-templates/Utils";

class TodoList extends Component {
  // Injected service
  @Inject(TodoService)
  todoService!: TodoService;

  // Reactive properties
  @Value() newTodoText = "";
  @Value() filter = "all";

  // Derived state (cheap computation - use @Scope)
  @Scope()
  get filteredTodos() {
    const todos = this.todoService.getTodos();
    switch (this.filter) {
      case "active": return todos.filter(t => !t.completed);
      case "completed": return todos.filter(t => t.completed);
      default: return todos;
    }
  }

  // Watch for side effects
  @Watch((self) => self.filteredTodos.length)
  handleTodoCountChanged(count: number) {
    console.log(`Total todos: ${count}`);
  }

  // Template with all patterns
  Template() {
    return div({ props: { className: "todo-app" } }, () => [
      // Header with input
      div({ props: { className: "header" } }, () => [
        input({
          props: () => ({
            type: "text",
            value: this.newTodoText,
            placeholder: "Add todo..."
          }),
          on: {
            input: (e: Event) => {
              this.newTodoText = (e.target as HTMLInputElement).value;
            },
            keypress: (e: KeyboardEvent) => {
              if (e.key === "Enter" && this.newTodoText.trim()) {
                this.todoService.addTodo(this.newTodoText.trim());
                this.newTodoText = "";
              }
            }
          }
        }),
        button({
          on: { click: () => {
            if (this.newTodoText.trim()) {
              this.todoService.addTodo(this.newTodoText.trim());
              this.newTodoText = "";
            }
          }}
        }, () => "Add")
      ]),

      // Filter buttons
      div({ props: { className: "filters" } }, () => [
        button({
          props: () => ({ className: this.filter === "all" ? "active" : "" }),
          on: { click: () => this.filter = "all" }
        }, () => "All"),
        button({
          props: () => ({ className: this.filter === "active" ? "active" : "" }),
          on: { click: () => this.filter = "active" }
        }, () => "Active"),
        button({
          props: () => ({ className: this.filter === "completed" ? "active" : "" }),
          on: { click: () => this.filter = "completed" }
        }, () => "Completed")
      ]),

      // Todo list with composition and data binding
      div({ 
        props: { className: "todo-list" }, 
        data: () => this.filteredTodos 
      }, (todo) =>
        todoItem({
          data: () => ({ todo }),
          on: {
            toggle: ({ id }) => this.todoService.toggleTodo(id),
            delete: ({ id }) => {
              const todos = this.todoService.getTodos();
              const remaining = todos.filter(t => t.id !== id);
              this.todoService.store.Write(remaining, "todos");
            }
          }
        })
      ),

      // Footer with computed count
      div({ props: { className: "footer" } }, () => [
        span({}, () => `${this.filteredTodos.length} items left`)
      ])
    ]);
  }

  /* Implementing Bound/Destroy is not required */
  Bound() {
    super.Bound();
    // Initialize after DOM attachment
  }

  Destroy() {
    super.Destroy();
    // Cleanup if needed
  }
}
export const todoList = Component.ToFunction("todo-list", TodoList);

// 4. Attach to DOM
import { TodoService } from "./todo-service";

class App extends Component {
  @Inject(TodoService)
  todoService = new TodoService();

  Template() {
    return todoList({});
  }
}

const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app"), app({}));
```

**Patterns demonstrated:**
- `@Value`, `@Scope` reactive properties (primitive vs derived)
- `StoreSync` for shared data with key function
- `@Inject` dependency injection with `@Destroy` for cleanup
- `Component.ToFunction` composition
- `Component.Attach` DOM attachment
- `this.Fire` component events
- Native framework iteration via `data:` binding (not `.map()`)
- Scoped reactive access - getters wrap `this.Data` for granular updates
- Event handlers with reactive updates
- `@Watch` side effects
- Lifecycle methods with `super.Bound()` and `super.Destroy()` calls

---

## Common Mistakes & Anti-Patterns

### ❌ Don't Use @State for Primitives

```typescript
// WRONG - Overhead unnecessary
@State() count: number = 0;

// CORRECT - Use @Value
@Value() count: number = 0;
```

### ❌ Don't Forget super.Bound() and super.Destroy() when overriding lifecycle events

```typescript
// WRONG - @Watch won't initialize, memory leaks
Bound() {
  // Missing super.Bound()
}

Destroy() {
  // Missing super.Destroy()
}

// CORRECT
Bound() {
  super.Bound(); // Required
  /* additional logic */
}

Destroy() {
  super.Destroy(); // Required
  /* additional logic */
}
```

### ❌ Don't Use @Computed for Cheap Operations

```typescript
@Value() firstName = "";
@Value() lastName = "";

// WRONG - Overkill
@Computed("")
get fullName() {
  return this.firstName + " " + this.lastName; // Cheap operation
}

// CORRECT - Use @Scope
@Scope()
get fullName() {
  return this.firstName + " " + this.lastName;
}
```

### ❌ Don't Pass Non-Function Data Bindings

```typescript
// WRONG - Not reactive
div({ data: this.items }, (item) => ...)

// CORRECT - Function enables reactivity
div({ data: () => this.items }, (item) => ...)
```

### ❌ Don't Create Components Without ToFunction

```typescript
// WRONG - Can't use in templates
class MyComponent extends Component { }

// CORRECT - Convert to function
class MyComponent extends Component { }
export const myComponent = Component.ToFunction("my-component", MyComponent);
```

### ❌ Don't Use Decorators in Plain Service Classes

```typescript
// WRONG - Decorators don't work outside Component classes
class DataService {
  @Computed([]) get Report() { }  // Won't work!
}

// CORRECT - Use ObservableScope.Create() in services
class DataService implements IDestroyable {
  private report = ObservableScope.Create(() => computeStats());
  get Report() { return ObservableScope.Value(this.report); }
  Destroy(): void { }
}
```

### ❌ Don't Forget IDestroyable for Services with Resources

```typescript
// WRONG - No cleanup
class SocketService {
  connect() { this.socket = new WebSocket("..."); }
}

// CORRECT - Implement cleanup
class SocketService implements IDestroyable {
  private socket: WebSocket | null = null;
  connect() { this.socket = new WebSocket("..."); }
  Destroy(): void { this.socket?.close(); }
}
```

---

## Debugging Reactivity Issues

### UI Not Updating Checklist

1. **Check decorator usage**: Is state marked with `@Value` or `@State`?
2. **Check data access**: Using `this.Data.prop` or getter, not direct field access?
3. **Check data binding**: Is `data:` a function `() => this.state`?
4. **Check array mutations**: Replacing array, not mutating directly?
5. **Check super.Bound()**: Called in `Bound()` method?

### Debug Example

```typescript
@State() items: Item[] = [];

// Add debug watcher
@Watch((self) => self.Data.items.length)
handleItemsChanged(length: number) {
  console.log("Items changed:", length);
}

Template() {
  console.log("Template rendering, items:", this.Data.items.length);
  return div({ data: () => this.Data.items }, ...);
}
```

### Common Symptoms

| Symptom | Likely Cause |
|---------|--------------|
| Initial render works, updates don't | Direct array mutation |
| Template never re-renders | `data:` not a function |
| Getter value stale | Not using `this.Data` in getter |
| @Watch never fires | Missing `super.Bound()` |
| Memory leak | Missing `super.Destroy()` or `@Destroy` |

---

## Component Communication Patterns

### Parent → Child (Data)

```typescript
// Parent passes data
childComponent({ data: () => ({ user: this.user }) });

// Child receives via this.Data
class Child extends Component<{ user: User }> {
  Template() {
    return div({}, () => this.Data.user.name);
  }
}
```

### Child → Parent (Events)

```typescript
// Child defines and fires events
interface ChildEvents {
  save: { data: string };
}

class Child extends Component<{}, {}, ChildEvents> {
  Template() {
    return button({
      on: { click: () => this.Fire("save", { data: "value" }) }
    });
  }
}

// Parent handles events
childComponent({
  on: { save: (payload) => console.log(payload.data) }
});
```

### Parent → Child (Templates)

```typescript
// Child accepts template
class Table<D> extends Component<{ data: D[] }, { row: (item: D) => vNode }> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item) =>
      this.Templates.row(item)
    );
  }
}

// Parent provides template
table({ data: () => ({ data: users }) }, {
  row: (user) => div({}, () => user.name)
});
```

### Sibling Communication (Via Shared Service)

```typescript
// Shared service
class BusService {
  _message: string = "";
  messageScope = ObservableScope.Create(() => this._message);
  
  get message() {
    return ObservableScope.Value(this.messageScope);
  }
  
  set message(value: string) {
    this._message = value;
    ObservableScope.Update(this.messageScope);
  }
  
  sendMessage(msg: string) { this.message = msg; }
}

// Sibling 1 - Sends
class Sender extends Component {
  @Inject(BusService) bus!: BusService;
  Template() {
    return button({ on: { click: () => this.bus.sendMessage("Hello") } });
  }
}

// Sibling 2 - Receives
class Receiver extends Component {
  @Inject(BusService) bus!: BusService;
  @Watch((self) => self.bus.message)
  handleMessage(msg: string) { console.log(msg); }
}
```

---

## Type Safety Patterns

### Component Generics

```typescript
class MyComponent<D, T, E> extends Component<D, T, E>
//                ^  ^  ^
//                |  |  └─ Events: { eventName: payloadType }
//                |  └────── Templates: { templateName: renderFn }
//                └──────────── Data: { propNames: types }
```

### Typing Data (D)

```typescript
// Simple data
class Child extends Component<{ id: number; name: string }> {
  Template() {
    return div({}, () => this.Data.id); // Typed
  }
}

// Complex data
interface UserData {
  user: User;
  permissions: string[];
}

class Child extends Component<UserData> {
  Template() {
    return div({}, () => this.Data.user.name); // Fully typed
  }
}
```

### Typing Events (E)

```typescript
interface MyEvents {
  click: { x: number; y: number };
  change: { value: string };
  delete: { id: string };
}

class Button extends Component<void, void, MyEvents> {
  Template() {
    return button({
      on: {
        click: () => this.Fire("click", { x: 0, y: 0 }), // Typed payload
      }
    });
  }
}

// Parent receives typed payloads
button({
  on: {
    click: (payload) => {
      // payload typed as { x: number; y: number }
      console.log(payload.x, payload.y);
    }
  }
});
```

### Typing Templates (T)

```typescript
interface RowTemplate<D> {
  row: (data: D) => vNode;
}

class Table<D> extends Component<{ data: D[] }, RowTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item) =>
      this.Templates.row(item) // Typed
    );
  }
}
```

---

## Performance Optimization

### @Computed vs @Scope Performance

| Scenario | Use | Reason |
|----------|-----|--------|
| Transform objects (.map create new) | `@Computed` | New objects need identity preservation |
| Aggregations (report objects) | `@Computed` | Complex object should maintain reference |
| Filter only (.filter existing refs) | `@Scope` | Objects already have identity |
| Sort existing objects | `@Scope` | Object references unchanged |
| String concatenation | `@Scope` | Cheap, identity doesn't matter |
| Math on primitives | `@Scope` | Minimal overhead needed |
| Boolean logic | `@Scope` | Simple derived value |

### Lazy Loading Components

```typescript
// Load component only when needed
@Value() showDetail = false;

Template() {
  const elements = [
    button({ on: { click: () => this.showDetail = true } })
  ];
  
  if (this.showDetail)
    elements.push(detailComponent({}));
    
  return elements;
}
```

### Virtual Lists (Large Data)

```typescript
// Render only visible items
@State() visibleRange = { start: 0, end: 50 };

// @Scope is correct here - returning existing object references
@Scope()
get visibleItems() {
  return this.allItems.slice(this.visibleRange.start, this.visibleRange.end);
  // Objects already have identity, array container doesn't matter
}

Template() {
  return div({ data: () => this.visibleItems }, ...);
}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| UI not updating | `data:` not function | Use `data: () => this.state` |
| UI not updating | Direct `@State` access | Use `this.Data` or getters |
| UI not updating | Missing `super.Bound()` | Call in `Bound()` method |
| Memory leaks | Missing cleanup | Use `@Destroy()` + `super.Destroy()` |
| Service state not reactive | Using decorators in service | Use `ObservableScope.Create()` |
| Service not cleaned up | No `IDestroyable` | Implement `Destroy()` method |
| Events not firing | Wrong payload type | Check event interface |
| DI not working | Service not provided | Use `@Inject` + parent provides |

## Quick Reference

### Import Paths
```typescript
import { Component, calc } from "j-templates";
import { div, button, input } from "j-templates/DOM";
import { Value, State, Computed, Scope, Watch, Inject, Destroy } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
import { Animation, AnimationType, IDestroyable } from "j-templates/Utils";
```

### Component Pattern
```typescript
class MyComponent extends Component<Data, Templates, Events> {
  @Inject(Service) service!: Service;
  @Value() state = 0;
  @Scope() get derived() { return this.state * 2; }
  
  Template() { return div({}, () => "UI"); }
  Bound() { super.Bound(); }
  Destroy() { super.Destroy(); }
}

export const myComponent = Component.ToFunction("name", MyComponent);
```

### Service Pattern
```typescript
// Abstract interface
abstract class DataService {
  abstract getData(): Data[];
}

// Concrete implementation
class DataServiceImpl extends DataService implements IDestroyable {
  private store = new StoreAsync((value) => value.id);
  private derived = ObservableScope.Create(() => this.process());
  
  get DerivedData() { return ObservableScope.Value(this.derived); }
  
  getData(): Data[] { return this.DerivedData; }
  Destroy(): void { this.store.Destroy(); }
}

// Usage with DI
class App extends Component {
  @Destroy()
  @Inject(DataService)
  service = new DataServiceImpl();
}
```

### Decorator vs ObservableScope
| Context | Primitive | Object | Derived State |
|---------|-----------|--------|---------------|
| Component | `@Value()` | `@State()` | `@Scope()`/`@Computed()` |
| Service | N/A | `StoreSync/Async` | `ObservableScope.Create()` |

### Lifecycle Quick Guide
```
1. Attach() → 2. Constructor → 3. Bound() → 4. Render → 5. Destroy()
                    ↑                        ↑
              super.Bound()           super.Destroy()
```

### StoreSync/Async Operations
```
Write(value, key)   → Set value for key
Push(key, ...items) → Add items to array
Patch(key, updates) → Partial update on object
Get(key, default)   → Read value (observable node)
```

---
