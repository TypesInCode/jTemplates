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

// With optional namespace for SVG components
export const svgCircle = Component.ToFunction("circle", SvgCircleComponent, "http://www.w3.org/2000/svg");

// Attach to DOM
Component.Attach(document.body, myComponent({}));

// Register as Web Component
Component.Register("my-component", MyComponent);
```

**Custom Element Host:** `Component.ToFunction()` creates a custom element wrapper:

```html
<my-component>              ← Host element (styled via element selector)
  <div class="container">   ← Template root (styled via class selector)
    <!-- content -->
  </div>
</my-component>
```

```css
/* Host element */
my-component {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Template root */
.container {
  display: flex;
  flex: 1;
  overflow-y: auto;
}
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

  // Access underlying virtual node (custom element host, not template root)
  protected get VNode(): vElementNode { }

  // Access component's scope for advanced reactivity
  protected get Scope(): ObservableScope { }

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
  
  // Derived state - when generating new objects (no default param)
  @Computed()
  get completedReport() {
    const items = this.Data.items.filter(i => i.completed);
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
  
  // Synchronous computed with async-like caching behavior
  @ComputedAsync(null)
  get userData(): User | null {
    return fetchUserData(this.Data.userId);  // Synchronous getter
  }
}
```

### Decorator Selection Guide

| Value Type | Use | Why |
|------------|-----|-----|
| number, string, boolean | `@Value` | Lightweight, no proxy |
| null, undefined | `@Value` | Simple scope |
| { nested: objects } | `@State` | Deep reactivity |
| arrays (User[]) | `@State` | Array mutations |
| getters (expensive, no default param) | `@Computed()` | Cached; same ref on update (via ApplyDiff) |
| getters (cheap) | `@Scope` | Cached; new ref on dependency change |
| sync getters (StoreAsync backend) | `@ComputedAsync(default)` | Synchronous getter, StoreAsync caching |
| async functions in @Scope | `@Scope() { return calc(async () => ...) }` | Component async with memoization |
| async functions (services) | `ObservableScope.Create(async)` | Direct async, new ref, initial null |
| simple getters | none | Read `this.Data` - reactive without decorator |
| watch changes | `@Watch` | Callback on change |
| dependency | `@Inject` | DI from injector |
| cleanup | `@Destroy` | Auto .Destroy() |

**Simple Getters:**
```typescript
// Reactive without decorator - reads this.Data
get count(): number {
  return this.Data.items.length;
}

// Use @Scope() when you want caching for expensive ops
@Scope()
get filtered(): Item[] {
  return this.Data.items.filter(i => i.active).sort(...);
}
```

### @Computed vs @Scope vs @ComputedAsync (all cache)

| Aspect | @Computed() | @Scope() | @ComputedAsync(default) |
|--------|-------------|----------|-------------------------|
| Object identity | ✅ Same | ❌ New | ✅ Same |
| Backend | StoreSync | Single scope | StoreAsync |
| Default param | No | N/A | Required |
| Best for | Complex objects | Primitives/cheap | Sync + StoreAsync |

**Object Reuse:** `@Computed()` and `@ComputedAsync()` preserve object identity via `ObservableNode.ApplyDiff`. Critical for NEW objects needing stable identity for DOM reuse.

### Async Patterns

**1. Direct async in services:**
```typescript
private dataScope = ObservableScope.Create(async () => {
  return await fetch('/api/data');
});

get data(): Data | null {
  return ObservableScope.Value(this.dataScope);  // null while loading
}
```

**2. Component async with calc():**
```typescript
@Scope()
get CurrentUser() {
  return calc(async () => fetchUser(`/api/user/${this.userId}`));
}
```

**3. @ComputedAsync for sync with StoreAsync:**
```typescript
@ComputedAsync(null)
get userData(): User | null {
  return getUserSync(this.Data.userId);  // Must be synchronous
}
```

**Async behavior (all patterns):**
- Async functions detected via `Symbol.toStringTag === "AsyncFunction"`
- Automatically sets `greedy: true` (batched updates)
- Initial value: `null` or Promise depending on pattern
- New reference on each update (no object reuse)

**Component vs Service Patterns:**
```typescript
// Components: Use decorators
class MyComponent extends Component {
  @Computed() get transformed() { return this.Data.items.map(...); }  // New objects
  @Scope() get filtered() { return this.Data.items.filter(...); }     // Existing refs
}

// Services: Use ObservableScope.Create()
class DataService implements IDestroyable {
  private derived = ObservableScope.Create(() => {
    const data = this.store.Get<Data[]>("data", []);
    return ObservableNode.Unwrap(data).filter(...);
  });
  get DerivedData() { return ObservableScope.Value(this.derived); }
}
```

**Framework Behavior:**
- Array container identity = micro-optimization (framework handles efficiently)
- Object identity inside arrays = critical (framework uses this to match DOM elements)

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
    text(() => `Count: ${this.count}`),
    
    // Raw HTML (use innerHTML prop, not { __html: })
    div({ props: { innerHTML: "<strong>Bold</strong>" } }),
    
    // Mixed text + elements (use text() or sibling elements)
    span({}, () => "Click "),
    button({}, () => "here"),
    span({}, () => " to continue")
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

**Text and HTML:**
- **`text(() => "...")`**: Reactive text nodes (required for mixing text with elements in arrays)
- **`innerHTML` prop**: Insert raw HTML (`div({ props: { innerHTML: html } })`)
- **Arrays**: Cannot mix plain strings with vNodes—use `text()` or sibling elements

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

### Data Props for Parent-to-Child Communication

**Data props = parent provides read-only vs @Value() = component internal state:**

```typescript
// Parent passes data prop
chatInput({
  data: () => ({ isSending: this.chatService.isSending }),
  on: { send: handleSend }
});

// Child receives via this.Data - read-only from parent
class ChatInput extends Component<{ isSending: boolean }, {}, ChatInputEvents> {
  Template() {
    return button({
      props: () => ({
        disabled: this.Data.isSending,  // Access via this.Data
        className: this.Data.isSending ? "sending" : ""
      })
    }, () => this.Data.isSending ? "Sending..." : "Send");
  }
}

// vs @Value() for component-internal state
@Value() localText: string = "";  // Component manages itself
```

**Key points:**
- **Data props = parent provides, child reads only**
- **@Value() = component internal state**
- **Access via `this.Data` in child component**
- **Use data props for read-only parent state**
- **Use @Value() for component-internal mutable state**

### Accessing DOM Elements

```typescript
class ScrollableComponent extends Component {
  Template() {
    return div({ props: { className: "scroll-container" } }, () => [...]);
  }
  
  Bound() {
    super.Bound();
    // Host element is ready, query for template children
    const host = this.VNode.node as HTMLElement;
    const scrollEl = host.querySelector('.scroll-container');
    scrollEl?.scrollTo(0, scrollEl.scrollHeight);
  }
}

```

**Key points:**
- **`this.VNode.node`** = custom element host (not template root)
- **Query children**: `this.VNode.node.querySelector('.className')`
- **Timing**: Safe in `Bound()` but children may need `requestAnimationFrame()`

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

**Note:** Component events don't bubble through DOM—only via j-templates `on:` system.

---

## Layout Patterns

### Scrollable Flex Container

**Problem:** Content overflows without scrollbar in flex layouts.

**Solution:** Add `min-height: 0` to nested flex children:

```css
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content {
  flex: 1;
  min-height: 0;          /* Critical for scroll */
  overflow-y: auto;
}
```

**Why:** Flex items default to `min-height: auto`, preventing shrinkage below content size.

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

**Key points:**
- **@Destroy() requires IDestroyable** interface
- **Abstract service classes implement IDestroyable**
- **Parent can use @Destroy()** for auto-cleanup
- **Child uses @Inject()** to receive service

**Injector API:**
```typescript
class Injector {
  Set<T>(type: ConstructorToken<T>, value: T): void;
  Get<T>(type: ConstructorToken<T>): T | undefined;
}
```

---

## Reactive Data Patterns

### Reactive Getters vs Decorators

**Simple getters reading this.Data are reactive without decorators:**

```typescript
class MyComponent extends Component<{ items: Item[] }> {
  // No decorator needed - reactive because it reads this.Data
  get itemCount(): number {
    return this.Data.items.length;
  }
  
  get firstItem(): Item | undefined {
    return this.Data.items[0];
  }
}
```

**When to use:**
- **Simple getter** - Trivial operations (length, direct property access)
- **@Scope()** - Expensive computations you want cached
- **@Computed()** - Creating new objects that need identity preservation

### calc() - Computed Scope Optimization

```typescript
import { calc } from "j-templates";

// Optimization: batch updates when parent scope changes frequently
// but derived value doesn't actually change
tbody({ data: () => calc(() => this.Data.data) }, (item) =>
  tr({}, () => div({}, () => item.name))
);
```

**For async patterns, see: [Async Patterns](#async-patterns)**

### ObservableScope (Advanced)

**Components:** Use `@Scope`/`@Computed` decorators  
**Services:** Use `ObservableScope.Create()` for derived state

```typescript
import { ObservableScope, StoreAsync } from "j-templates/Store";

// Service pattern: StoreAsync + ObservableScope
class DataService implements IDestroyable {
  private store = new StoreAsync((value) => value.id);
  
  // Sync derived state computation
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
    ObservableScope.Destroy(this.derivedData);
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

**For async operations, see: [Async Patterns](#async-patterns)**

### StoreSync - Shared Data

```typescript
import { StoreSync } from "j-templates/Store";

// Create store with key function for object sharing (optional but recommended)
private store = new StoreSync((value: Item) => value.id);

// Write data - requires key (either explicit or from keyFunc)
this.store.Write(user, "user-1");  // Explicit key
// OR if keyFunc provided:
this.store.Write(user);  // Uses keyFunc to derive key

// Patch
this.store.Patch("user-1", { name: "Updated" });

// Array operations
this.store.Write([], "users");
this.store.Push("users", user1, user2);

// Get data (returns read-only observable node)
const users = this.store.Get<User[]>("users", []);

// Note: Throws error if no key provided and no keyFunc defined
```

### StoreAsync - Async Data

```typescript
import { StoreAsync } from "j-templates/Store";

// Key function is required if not providing explicit keys
private store = new StoreAsync((value: Item) => value.id);

// Write requires a key - either explicit or derived from keyFunc
await this.store.Write({ id: "1", name: "Test" }); // Uses keyFunc
await this.store.Write({ id: "1", name: "Test" }, "my-key"); // Explicit key overrides keyFunc

// Separate keys for different data states
await this.store.Write(initialData, "messages");
await this.store.Write(streamingData, "pending-messages");

// Get returns observable node - cast with generics
const messages = this.store.Get<Message[]>("messages", []);
const pending = this.store.Get<Message[]>("pending-messages", []);

// Splice - remove items and get deleted items
const removed = await this.store.Splice("messages", 0, 1); // Returns Promise<Message[]>

// Note: Throws error if no key provided and keyFunc undefined
```

**Key points:**
- **keyFunc is for aliasing**, not primary key storage
- **Explicit keys override keyFunc** when provided
- **Separate keys for separate states** (messages vs pending-messages)
- **Always await StoreAsync methods** - they return Promise\<void\>
- **Get() returns observable node** - cast with `Get<Type[]>("key", [])`
- **Requires a key** - either explicit parameter or keyFunc must derive it
- **Splice() returns deleted items** - `Promise<T[]>` containing removed elements

**When to use:** Async data loading, background operations, workers. Combine with `ObservableScope.Create()` for derived state.

### Complete Service Pattern

```typescript
// types.ts - Abstract interface with IDestroyable
export abstract class IChatService implements IDestroyable {
  abstract readonly messages: Message[];
  abstract isSending: boolean;
  abstract sendMessage(content: string): Promise<void>;
  abstract Destroy(): void;
}

// dataService.ts - Concrete implementation
export class ChatService implements IChatService {
  private store = new StoreAsync();
  private state = ObservableNode.Create({ isSending: false });
  
  // Read-only property from store
  get messages(): Message[] {
    return this.store.Get<Message[]>("messages", []);
  }
  
  // Read-write property with backing field
  get isSending(): boolean {
    return this.state.isSending;
  }
  
  // Async operations with StoreAsync
  async sendMessage(content: string): Promise<void> {
    this.state.isSending = true;
    try {
      const newMessage: Message = { id: Date.now().toString(), content };
      await this.store.Write(newMessage, "messages"); // Separate key for messages
      // Process message...
    } finally {
      this.state.isSending = false;
    }
  }
  
  Destroy(): void {
    this.store.Destroy();
  }
}

// Usage with DI
class ChatApp extends Component {
  @Destroy()
  @Inject(IChatService)
  chatService = new ChatService(); // Inline creation in root component
  
  Template() {
    return div({}, () => [
      div({ data: () => this.chatService.messages }, (msg) =>
        div({}, () => msg.content)
      )
    ]);
  }
}
```

**Key points:**
- **Abstract interface defines contract** for DI
- **Implement IDestroyable** with `Destroy()` method
- **Private backing fields** for primitive state (`_isSending`)
- **StoreAsync for complex data** (arrays, objects)
- **Inline service creation** in root component
- **Async methods** for all StoreAsync operations

---

## Lifecycle

```
1. Component.Attach() called        └─ DOM: Not attached
2. vNode.Init() called              └─ DOM: Not attached
3. Component constructor runs       └─ DOM: Not attached
4. Bound() called                   └─ DOM: Attached ✓ | Children: May not be ready ⚠️
5. Template rendered, attached      └─ DOM: Fully rendered ✓
6. ... user interacts, reactivity updates ...
7. Component.Destroy() called       └─ DOM: About to be removed
8. Destroy() called                 └─ Cleanup: Scopes, @Destroy properties
```

**Lifecycle Emphasis:**
- **Bound()** - DOM attached, `@Watch` initialized. Query children with `requestAnimationFrame()` if needed
- **Destroy()** - Cleanup resources, stop timers, close connections
- **Order matters** - Always call `super.Bound()` and `super.Destroy()`

**Async Initialization Pattern:**
```typescript
@State() data: Data[] = [];
@Value() isLoading = false;

Bound() {
  super.Bound();
  this.LoadData();  // Safe to access DOM here
}

async LoadData() {
  this.isLoading = true;
  try {
    const result = await fetchData();
    await this.store.Write(result, "data");
  } finally {
    this.isLoading = false;
  }
}
```

**Lifecycle Methods:**
```typescript
class MyComponent<D, T, E> extends Component<D, T, E> {
  constructor(
    vNode: vElementNode, 
    config: vComponentConfig<D, E>, 
    templates: T
  ) {
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
| Derived (sync, object reuse) | Component | `@Computed()` | Transformed items |
| Primitives (local) | Component | `@Value()` | Input text, hover |
| Complex (local) | Component | `@State()` | Form data object |
| Async (component) | Component | `@Scope() + calc(async)` | User data fetch |
| Async (service) | Service | `ObservableScope.Create(async)` | API responses |
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

**Async vs Sync Patterns:**

| Pattern | Use Case | Location |
|---------|----------|----------|
| `StoreSync` | Synchronous operations, simple state | Services |
| `StoreAsync` | Async operations, complex diffs | Services |
| `ObservableScope.Create()` | Derived state in services | Services |
| `@Scope()` | Cheap derived state in components | Components |
| `@Computed()` | Object identity preservation in components | Components |

**StoreSync vs StoreAsync vs ObservableScope.Create():**
- **StoreSync** - Simple synchronous state, no async operations needed
- **StoreAsync** - Async data loading, requires `await` on all operations
- **ObservableScope.Create()** - Derived state computation in services
- **@Scope()/@Computed()** - Component-specific derived state

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
- **Surgical Reactivity**: Template functions (e.g. `data: () => this.state`) are dependency registration points. They link specific DOM nodes to `observableScopes`, enabling surgical updates without component-wide re-renders.
- **Object Identity**: `@Computed` uses `ApplyDiff` to merge changes into existing references. This prevents the framework from destroying and recreating the entire DOM subtree when a new object is returned.
- **StoreAsync Constraints**: Uses Web Workers for diffing; data passed to `Write`/`Patch` must be JSON-serializable (no methods or circular references).
- **`calc()` as Circuit Breaker**: Prevents reactivity propagation. If the result is the same (`===`), dependents are not notified, avoiding unnecessary child re-renders.
- **Host vs Root**: `this.VNode.node` is the Custom Element host tag. The Template root is a child of this host.
- **Execution**: Decorators $\rightarrow$ `ObservableScope` $\rightarrow$ Dependency registration via `WatchFunction` $\rightarrow$ Microtask batch update $\rightarrow$ Scheduled DOM update.

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
@Scope() /* or */ @Computed() get filtered() {} // Scopes created when first accessed
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

### ❌ Don't Use @Computed() for Cheap Operations

```typescript
@Value() firstName = "";
@Value() lastName = "";

// WRONG - Overkill
@Computed()
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
  @Computed() get Report() { }  // Won't work!
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

### ❌ Raw HTML: Wrong Pattern from React

```typescript
// WRONG - { __html: } is React, not j-templates
div({}, () => [{ __html: "<strong>Bold</strong>" }])

// CORRECT - Use innerHTML prop
div({ props: { innerHTML: "<strong>Bold</strong>" } })
```

### ❌ Mixing Text and Elements in Arrays

```typescript
// WRONG - Plain strings aren't vNodes
div({}, () => ["Click ", button({}, () => "here"), " to continue"])

// CORRECT - Use text() or sibling elements
div({}, () => [
  text(() => "Click "),
  button({}, () => "here"),
  text(() => " to continue")
])
```

### ❌ Scroll Not Working in Flex Layout

```css
/* WRONG - Missing min-height: 0 */
.content {
  flex: 1;
  overflow-y: auto;
}

/* CORRECT - Add min-height: 0 */
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

### ❌ StoreAsync.Write Signature Confusion

```typescript
// WRONG - keyFunc handles key derivation
await store.Write(message, message.id); // Redundant if keyFunc provided

// CORRECT - Separate keys for different data states
await store.Write(messages, "messages");
await store.Write(pending, "pending-messages");
```

### ❌ Using @Scope() for Simple Property Access

```typescript
// WRONG - Overkill
@Scope()
get count(): number { return this.Data.items.length; }

// CORRECT - Simple getter is reactive too
get count(): number { return this.Data.items.length; }
```

### ❌ Missing TypeScript Generics on Get()

```typescript
// WRONG - Type is unknown
const data = this.store.Get("key");

// CORRECT - Cast to expected type
const data = this.store.Get<Type[]>("key", []);
```

### ❌ Not Awaiting StoreAsync Operations

```typescript
// WRONG - Missing await
this.store.Write(data, "key");

// CORRECT - Always await StoreAsync methods
await this.store.Write(data, "key");
```

### ❌ Missing IDestroyable on @Destroy() Services

```typescript
// WRONG - TypeScript requires IDestroyable
abstract class IService {
  // Missing Destroy() method
}

class ChildComponent extends Component {
  @Destroy()
  @Inject(IService)
  service!: IService;  // TypeScript error
}

// CORRECT - Implement IDestroyable
abstract class IService implements IDestroyable {
  abstract Destroy(): void;
}
```

### ❌ Using @Value() or @State() for Services

```typescript
// WRONG - Services aren't primitives
@Value() service = new Service();
@State() service = new Service();

// CORRECT - Use @Inject() with @Destroy()
@Destroy()
@Inject(IService)
service!: IService;
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

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Initial render works, updates don't | Direct array mutation | Replace array, don't mutate |
| Template never re-renders | `data:` not a function | Use `data: () => this.state` |
| Getter value stale | Not using `this.Data` | Read from `this.Data` in getter |
| @Watch never fires | Missing `super.Bound()` | Call in `Bound()` method |
| Memory leak | Missing cleanup | Use `@Destroy()` + `super.Destroy()` |
| No scrollbar | Missing `min-height: 0` | Add to flex children |
| Scroll not working | Querying host element | Query `.className` not host |

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
| Transform objects (.map create new) | `@Computed()` | New objects need identity preservation |
| Aggregations (report objects) | `@Computed()` | Complex object should maintain reference |
| Filter only (.filter existing refs) | `@Scope()` | Objects already have identity |
| Sort existing objects | `@Scope()` | Object references unchanged |
| String concatenation | `@Scope()` | Cheap, identity doesn't matter |
| Math on primitives | `@Scope()` | Minimal overhead needed |
| Boolean logic | `@Scope()` | Simple derived value |

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
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy } from "j-templates/Utils";
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
Write(value, optional_key) → Set value (keyFunc used if key omitted)
Push(key, ...items)        → Add items to array
Patch(key, updates)        → Partial update on object
Get<Type>(key, default)    → Read value (observable node) - cast with generics
```

### Service Pattern (Complete)
```typescript
// Abstract interface
export abstract class IMyService implements IDestroyable {
  abstract readonly data: DataType[];
  abstract DoWork(): Promise<void>;
  abstract Destroy(): void;
}

// Concrete implementation
export class MyService implements IMyService {
  private store = new StoreAsync();
  private _isLoading = false;
  
  get data(): DataType[] {
    return this.store.Get<DataType[]>("data", []);
  }
  
  get isLoading(): boolean { return this._isLoading; }
  set isLoading(v: boolean) { this._isLoading = v; }
  
  async DoWork(): Promise<void> {
    this._isLoading = true;
    try {
      const result = await fetchData();
      await this.store.Write(result, "data");
    } finally {
      this._isLoading = false;
    }
  }
  
  Destroy(): void {
    this.store.Destroy();
  }
}

// Usage
class App extends Component {
  @Destroy()
  @Inject(IMyService)
  service = new MyService();
}
```

### Key API Clarifications
- **`keyFunc` in constructor** = for aliasing, not primary key storage
- **`Write(data, optional_key)`** = explicit key overrides keyFunc
- **`Separate keys`** = use for different states (messages vs pending-messages)
- **`Get<Type[]>()`** = always use generics to cast observable node
- **`await` StoreAsync** = all Write/Push/Patch methods are async
- **Simple getters** = reactive without decorators when reading `this.Data`
- **`@Destroy()` + `@Inject()`** = requires IDestroyable interface

---

## Quick Reference

### Import Paths
```typescript
import { Component, calc } from "j-templates";
import { Value, State, Computed, Scope, Watch, Inject, Destroy, Bound } from "j-templates/Utils";
import { div, button, input, text } from "j-templates/DOM";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
```

### Decorator Selection
| Value | Use | Why |
|-------|-----|-----|
| `number`, `string`, `boolean` | `@Value` | Lightweight |
| `{ nested }`, `[]` | `@State` | Deep reactivity |
| Cheap getter | `@Scope` | Cached, new ref |
| Expensive getter | `@Computed` | Cached, same ref |
| Sync + StoreAsync | `@ComputedAsync` | Cached, same ref |

### Lifecycle Timing
| Method | DOM | Safe to Query |
|--------|-----|---------------|
| Constructor | ❌ | No |
| Bound() | ✓ Host | ⚠️ Use `requestAnimationFrame()` |
| After Bound() | ✓ Full | Yes |

### Common Patterns
```typescript
// Loading state
@Value() loading = false;
div({}, () => this.loading ? "Loading..." : "Ready")

// Form input
@Value() text = "";
input({ props: () => ({ value: this.text }), on: { input: e => this.text = e.target.value } })

// Raw HTML
div({ props: { innerHTML: html } })

// Mixed text/elements
[text(() => "Text "), button({}, () => "Btn")]

// Scrollable flex
.content { flex: 1; min-height: 0; overflow-y: auto; }
```

---
