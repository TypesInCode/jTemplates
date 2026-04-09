# j-templates LLM Primer v2

## Quick Overview

TypeScript reactive framework for browser UI. No compile step, minimal dependencies.

**Core concepts:** Components define UI via `Template()` method. State decorators (`@Value`, `@State`, `@Computed`) enable reactivity. DOM functions (`div()`, `button()`) create virtual nodes.

---

## Public API & Imports

```typescript
import { Component, calc } from "j-templates";
import { div, button, input, span, h1, /* ...see DOM Functions */ text } from "j-templates/DOM";
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy, Bound, Animation, AnimationType, IDestroyable } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
import { Injector } from "j-templates/Utils";  // also exported from j-templates/Utils
import { CreateRootPropertyAssignment, CreateEventAssignment } from "j-templates/DOM";
```

---

## Project Setup

```bash
npm install j-templates
```

**tsconfig.json** requires `"experimentalDecorators": true`.

**File naming:** kebab-case for components (`todo-list.ts`), kebab-case with `-service` suffix for services. Component exports: lowercase matching filename.

---

## Component Class

```typescript
class MyComponent extends Component<D, T, E> {
  // D = data type from parent (default: void)
  // T = template functions from parent (default: void)
  // E = event map type (default: {})

  Template() { return div({}, () => "Hello"); }

  Bound() {
    super.Bound(); // Required: initializes @Watch decorators
  }

  Destroy() {
    super.Destroy(); // Required: cleans up scopes and @Destroy properties
  }
}

// Convert to reusable function
export const myComponent = Component.ToFunction("my-component", MyComponent);

// With optional namespace (e.g., SVG)
export const svgCircle = Component.ToFunction("circle", SvgCircleComponent, "http://www.w3.org/2000/svg");

// Attach to DOM
Component.Attach(document.body, myComponent({}));

// Register as Web Component (creates open shadow DOM)
Component.Register("my-component", MyComponent);
```

### Component Properties

| Property | Access | Description |
|----------|--------|-------------|
| `Data` | `protected get` | Data from parent via `data: () => ({...})` |
| `Templates` | `protected get` | Parent-provided template functions |
| `Injector` | `public get` | Component's scoped DI injector |
| `VNode` | `protected get` | Underlying virtual element node (custom element host, not template root) |
| `Scope` | `protected get` | Internal scoped observable (`IObservableScope<D>`) |
| `Destroyed` | `public get` | Whether component is destroyed |

### Component Methods

| Method | Description |
|--------|-------------|
| `Template(): vNodeType \| vNodeType[]` | Override to define UI. Returns empty array by default. |
| `Bound(): void` | Lifecycle hook after DOM attachment. Calls `Bound.All(this)`. |
| `Destroy(): void` | Destroys scope + calls `Destroy.All(this)`. |
| `Fire<P extends keyof E>(event: P, data?: E[P]): void` | Fire component event. `data` is optional. |

### Component.ToFunction Config

```typescript
type vComponentConfig<D, E, P = HTMLElement> = {
  data?: () => D | undefined;    // Reactive data from parent
  props?: FunctionOr<RecursivePartial<P>> | undefined;  // DOM props on host element
  on?: ComponentEvents<E> | undefined;  // Event handlers
};

// ComponentEvents maps event names to callbacks:
type ComponentEvents<E> = { [P in keyof E]?: {(data: E[P]): void} };
```

### Custom Element Host

```html
<my-component>              <!-- Host element (styled via element selector) -->
  <div class="container">   <!-- Template root (styled via class selector) -->
    <!-- content -->
  </div>
</my-component>
```

**Note:** `this.VNode.node` is the custom element host, not the template root. Query children via `this.VNode.node.querySelector('.className')`.

---

## State Decorators

All decorators are for **Component classes only**. Services must use `ObservableScope`/`Store` APIs directly.

```typescript
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy } from "j-templates/Utils";

class MyComponent extends Component {
  // Primitives - lightweight scope, no proxy
  @Value() count: number = 0;
  @Value() isLoading: boolean = false;

  // Complex objects/arrays - deep reactivity via proxy
  @State() user: { name: string } = { name: "" };
  @State() items: TodoItem[] = [];

  // Cheap derived state - cached, new reference on update
  @Scope()
  get fullName() { return this.firstName + " " + this.lastName; }

  // Expensive derived state / new objects - cached, same reference via ApplyDiff
  @Computed()
  get completedReport() {
    const items = this.Data.items.filter(i => i.completed);
    items.sort((a, b) => a.completedTime < b.completedTime ? 1 : -1);
    return { completedCount: items.length, lastCompletedTime: items.length > 0 ? items[0].completedTime : "" };
  }

  // Sync getter with StoreAsync backend - requires default value
  @ComputedAsync(null)
  get userData(): User | null {
    return getUserSync(this.Data.userId);
  }

  // Watch changes - called immediately with initial value, then on each change
  @Watch((self) => self.count)
  handleCountChanged(newValue: number) { console.log("Count:", newValue); }

  // Dependency injection
  @Inject(DataService) dataService!: DataService;

  // Auto-cleanup on destroy (requires IDestroyable)
  @Destroy() timer: Timer = new Timer();

  // Simple getter reading this.Data - reactive without decorator
  get itemCount(): number { return this.Data.items.length; }
}
```

### Decorator Selection

| Value Type | Use | Why |
|------------|-----|-----|
| `number`, `string`, `boolean` | `@Value` | Lightweight, no proxy |
| `null`, `undefined` | `@Value` | Simple scope |
| `{ nested: objects }` | `@State` | Deep reactivity via proxy |
| `arrays (User[])` | `@State` | Array mutations tracked |
| Expensive getter / new objects | `@Computed()` | Cached + same reference via ApplyDiff |
| Cheap getter / primitives | `@Scope` | Cached, new reference on update |
| Sync getter + StoreAsync backend | `@ComputedAsync(default)` | Same reference, StoreAsync diffing |
| Watch changes | `@Watch` | Callback on change (greedy/batched) |
| DI from injector | `@Inject` | Lazy resolution from injector |
| Cleanup on destroy | `@Destroy` | Auto `.Destroy()` (requires `IDestroyable`) |
| Simple property access | None (plain getter) | Reading `this.Data` is reactive |

### @Computed vs @Scope vs @ComputedAsync

| Aspect | `@Computed()` | `@Scope()` | `@ComputedAsync(default)` |
|--------|---------------|------------|---------------------------|
| Object identity | Same ref (ApplyDiff) | New ref | Same ref (ApplyDiff) |
| Backend | StoreSync | Single scope | StoreAsync |
| Default param | No | N/A | Required |
| Best for | Complex objects, expensive ops | Primitives, cheap ops | Sync getter + StoreAsync diffing |

**Key difference:** `@Computed` preserves object identity across updates. `@Scope` returns a new object each time. Use `@Computed` when DOM reuse depends on reference stability (e.g., iterating arrays with `data:`).

### Async Patterns

```typescript
// 1. Direct async in services
private dataScope = ObservableScope.Create(async () => {
  return await fetch('/api/data');
});
get data(): Data | null {
  return ObservableScope.Value(this.dataScope); // null while loading
}

// 2. Component async with calc()
@Scope()
get CurrentUser() {
  return calc(async () => fetchUser(`/api/user/${this.userId}`));
}

// 3. @ComputedAsync for sync getter with StoreAsync backend
@ComputedAsync(null)
get userData(): User | null {
  return getUserSync(this.Data.userId); // Must be synchronous
}
```

**`calc()` details:** Only works within a watch context (falls back to direct call outside). Creates memoized greedy scopes. Supports `calc(callback, idOverride?)` for multiple calc scopes. If result is unchanged (`===`), dependents are not notified (circuit breaker).

---

## Template System

### DOM Functions

```typescript
import { div, span, button, input, h1, p, a, text, /* etc. */ } from "j-templates/DOM";
```

**Full list:**

| Category | Functions |
|----------|-----------|
| Layout | `div`, `span`, `section`, `article`, `aside`, `nav`, `main`, `header`, `footer`, `hr`, `blockquote`, `address` |
| Text | `h1`-`h6`, `p`, `a`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`, `sub`, `sup`, `mark`, `small`, `label`, `pre`, `code`, `kbd`, `samp`, `_var`, `cite`, `q`, `abbr`, `time`, `dfn`, `rt`, `rp` |
| Lists | `ul`, `ol`, `li`, `dl`, `dt`, `dd` |
| Tables | `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `col`, `colgroup` |
| Forms | `form`, `input`, `textarea`, `button`, `select`, `option`, `optgroup`, `label`, `fieldset`, `legend`, `datalist`, `output`, `progress`, `meter` |
| Media | `img`, `figure`, `figcaption`, `picture`, `source`, `audio`, `video`, `track`, `embed`, `object`, `param`, `iframe` |
| Interactive | `details`, `summary`, `dialog`, `menu` |
| Scripting | `canvas`, `svg`, `map`, `area` |
| Meta | `template`, `slot` |
| Utility | `text` - reactive text node (signature: `text(callback: () => string)`) |

**Note:** `_var` for `<var>` element (reserved word workaround). No SVG-specific elements are exported; use `Component.ToFunction` with namespace for custom SVG components.

### Config Properties

```typescript
type vNodeConfig<P = HTMLElement, E = HTMLElementEventMap, T = never> = {
  props?: FunctionOr<RecursivePartial<P>>;  // DOM properties (static or reactive function)
  attrs?: FunctionOr<{ [name: string]: string }>;  // HTML attributes
  on?: FunctionOr<vNodeEvents<E>>;  // Event handlers
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;  // Reactive data for iteration
};

type FunctionOr<T> = { (): T | Promise<T> } | T;  // Static value or reactive function
```

**Functions are reactive:** When referenced scope values change, the vNode re-renders.

### Template Patterns

```typescript
Template() {
  return div({ props: { className: "container" } }, () => [
    h1({}, () => "Title"),

    // Reactive data binding - iterates over array
    div({ data: () => this.Data.items }, (item) =>
      div({}, () => item.name)
    ),

    // Props as function (reactive)
    div({ props: () => ({ className: this.isActive ? "active" : "" }) }, () => "Content"),

    // Event handlers
    button({ on: { click: (e: MouseEvent) => this.handleClick(e) } }, () => "Click"),

    // Conditional rendering
    this.isLoading ? div({}, () => "Loading") : "",

    // Child component
    childComponent({ data: () => ({ id: 1 }) }),

    // Reactive text node
    text(() => `Count: ${this.count}`),

    // Raw HTML
    div({ props: { innerHTML: "<strong>Bold</strong>" } }),

    // Mixed text + elements (use text() or sibling elements - no plain strings in arrays)
    span({}, () => "Click "),
    button({}, () => "here"),
    text(() => " to continue")
  ]);
}
```

### `data:` Binding Behavior

| Return Value | Behavior |
|--------------|----------|
| `[]` (empty array) | No children rendered |
| `[a, b, c]` (array) | Iterates, renders child for each item |
| `{ id: 1 }` (object) | Wraps as `[{ id: 1 }]`, renders once |
| `"text"` (string) | Wraps as `["text"]`, renders once |
| `123` (number) | Wraps as `[123]`, renders once |
| `falsy` / `null` / `undefined` | Returns `[]`, no children rendered |

**Key:** Non-array values are wrapped in `[value]`. Array length determines child count. Children function receives each value (or wrapped value) as parameter. `data:` also accepts `Promise<T>` or `Promise<T[]>` for async data.

---

## Component Composition

### Parent → Child (Data)

```typescript
// Parent passes data
childComponent({ data: () => ({ userId: this.userId }) });

// Child receives via this.Data (read-only from parent)
class Child extends Component<{ userId: string }> {
  Template() { return div({}, () => this.Data.userId); }
}

// Data props = parent provides, child reads. @Value() = component internal state.
```

### Child → Parent (Events)

```typescript
interface ChildEvents { save: { data: string }; }

class Child extends Component<{}, {}, ChildEvents> {
  Template() {
    return button({ on: { click: () => this.Fire("save", { data: "value" }) } });
  }
}

// Parent handles events (Fire data parameter is optional)
childComponent({ on: { save: (payload) => console.log(payload.data) } });
```

### Template Callbacks

```typescript
interface RowTemplate<D> { render: (data: D) => vNode; }

class Table<D> extends Component<{ data: D[] }, RowTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item: D) =>
      this.Templates.render(item)
    );
  }
}

table({ data: () => ({ data: users }) }, { render: (user) => div({}, () => user.name) });
```

### Accessing DOM Elements

```typescript
Bound() {
  super.Bound();
  const host = this.VNode.node as HTMLElement;
  const scrollEl = host.querySelector('.scroll-container');
  scrollEl?.scrollTo(0, scrollEl.scrollHeight);
  // Use requestAnimationFrame() if child elements aren't ready yet
}
```

---

## Dependency Injection

### Injector API

```typescript
class Injector {
  constructor();  // Sets parent to Injector.Current()
  Get<T>(type: any): T;        // Searches parent chain. Returns undefined as T if not found.
  Set<T>(type: any, instance: T): T;  // Sets at this scope, returns instance.
}

namespace Injector {
  Current(): Injector | null;  // Get current injector scope
  Scope<R, P>(injector: Injector, action: (...args: P) => R, ...args: P): R;  // Execute within injector scope
}
```

### Abstract Service Pattern

```typescript
// Abstract interface
abstract class IDataService implements IDestroyable {
  abstract getData(): Data[];
  abstract Destroy(): void;
}

// Concrete implementation
class DataService implements IDataService {
  private store = new StoreSync();
  getData(): Data[] { return this.store.Get<Data[]>("data", []); }
  Destroy(): void { /* cleanup */ }
}

// Parent provides, child consumes
class App extends Component {
  @Destroy()
  @Inject(IDataService)
  dataService = new DataService();

  Template() { return childComponent({}); }
}

class Child extends Component {
  @Inject(IDataService) dataService!: IDataService;
}
```

**Key points:**
- Injector has a **parent chain** - `Get` traverses up if not found locally
- `@Inject` provides both getter and setter (lazy resolution on first access)
- Combine `@Inject` + `@Destroy` for services needing cleanup
- `@Destroy` requires the property type implement `IDestroyable`

---

## StoreSync & StoreAsync

### Base Store API (shared by both)

```typescript
class Store {
  constructor(keyFunc?: (value: any) => string | undefined);

  // Two overloads:
  Get<O>(id: string): O | undefined;        // Returns undefined if not found
  Get<O>(id: string, defaultValue: O): O;   // Creates and returns default if not found
}
```

### StoreSync (Synchronous)

```typescript
class StoreSync extends Store {
  constructor(keyFunc?: (value: any) => string | undefined);

  Write(data: unknown, key?: string): void;       // key derived from keyFunc if omitted
  Patch(key: string, patch: unknown): void;        // Merge patch into existing value
  Push(key: string, ...data: unknown[]): void;     // Append items to array at key
  Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): unknown[];
}
```

### StoreAsync (Asynchronous - all methods return Promises)

```typescript
class StoreAsync extends Store {
  constructor(keyFunc?: (value: any) => string | undefined);

  async Write(data: unknown, key?: string): Promise<void>;
  async Patch(key: string, patch: unknown): Promise<void>;
  async Push(key: string, ...data: unknown[]): Promise<void>;
  async Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): Promise<unknown[]>;
  Destroy(): void;  // Stops queue and destroys diff worker
}
```

**Key points:**
- `keyFunc` is for aliasing (resolving references by ID), not primary storage
- Explicit key overrides `keyFunc` when provided
- Use separate keys for separate data states (e.g., `"messages"` vs `"pending-messages"`)
- Always `await` StoreAsync operations
- `Get()` returns an observable proxy - cast with generics: `this.store.Get<Type[]>("key", [])`
- `StoreSync` has **no `Destroy()` method** (unlike `StoreAsync`)
- `Patch` throws if the target value is `undefined`

### ObservableNode API

```typescript
namespace ObservableNode {
  Create<T>(value: T): T;                                          // Wrap value in reactive proxy
  Unwrap<T>(value: T): T;                                         // Get raw value from proxy
  Touch(value: unknown, prop?: string | number): void;             // Manually trigger change notification
  ApplyDiff(rootNode: any, diffResult: JsonDiffResult): void;      // Apply diff in-place (used by @Computed)
  CreateFactory(alias?: (value: any) => any | undefined): <T>(value: T) => T;  // Factory with aliasing
}
```

---

## ObservableScope API

```typescript
namespace ObservableScope {
  // Create reactive scope. greedy=true batches updates. force=true always creates dynamic scope.
  Create<T>(valueFunction: { (): T | Promise<T> }, greedy?: boolean, force?: boolean): IObservableScope<T>;

  // Get value and register as dependency
  Value<T>(scope: IObservableScope<T>): T;

  // Get value without registering as dependency
  Peek<T>(scope: IObservableScope<T>): T;

  // Register scope as dependency without reading value
  Touch<T>(scope: IObservableScope<T>): void;

  // Subscribe to scope changes
  Watch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;

  // Unsubscribe from scope changes
  Unwatch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;

  // Register destruction callback
  OnDestroyed(scope: IObservableScope<unknown>, callback: EmitterCallback): void;

  // Manually mark scope as dirty (triggers recomputation)
  Update(scope: IObservableScope<any>): void;

  // Register emitter as dependency (advanced)
  Register(emitter: Emitter): void;

  // Destroy a single scope
  Destroy<T>(scope: IObservableScope<T>): void;

  // Destroy multiple scopes
  DestroyAll(scopes: IObservableScope<unknown>[]): void;
}
```

### Service Patterns

```typescript
// Derived state in services
class DataService implements IDestroyable {
  private store = new StoreAsync((value) => value.id);
  private derived = ObservableScope.Create(() => {
    const items = this.store.Get<Item[]>("items", []);
    return ObservableNode.Unwrap(items).filter(i => i.active);
  });

  get DerivedData() { return ObservableScope.Value(this.derived); }

  addItems(...items: Item[]) {
    this.store.Push("items", ...items);  // All scopes auto-recompute
  }

  Destroy(): void {
    this.store.Destroy();
    ObservableScope.Destroy(this.derived);
  }
}

// Sibling communication via shared service
class BusService implements IDestroyable {
  private _message: string = "";
  private messageScope = ObservableScope.Create(() => this._message, false, true);

  get message() { return ObservableScope.Value(this.messageScope); }
  set message(v: string) { this._message = v; ObservableScope.Update(this.messageScope); }

  Destroy(): void { ObservableScope.Destroy(this.messageScope); }
}
```

---

## Animation API

```typescript
import { Animation, AnimationType } from "j-templates/Utils";

enum AnimationType { Linear, EaseIn }  // EaseIn = cubic bezier

class Animation implements IDestroyable {
  constructor(type: AnimationType, duration: number, update: (next: number) => void);

  get Running(): boolean;
  get Start(): number;      // null if not running
  get End(): number;        // null if not running
  get Enabled(): boolean;

  Animate(start: number, end: number): Promise<void> | undefined;  // undefined if disabled or diff=0
  Disable(): void;   // Disables and cancels
  Enable(): void;
  Cancel(): void;    // Cancels running animation
  Destroy(): void;   // Calls Disable()
}
```

---

## Lifecycle

```
1. Component.Attach() called     ─ DOM: Not attached
2. vNode.Init() called           ─ DOM: Not attached
3. Component constructor runs    ─ DOM: Not attached
4. Bound() called                ─ DOM: Attached ✓ | Children: May not be ready ⚠
5. Template rendered, attached   ─ DOM: Fully rendered ✓
6. ... reactivity updates ...
7. Component.Destroy() called    ─ DOM: About to be removed
8. Destroy() called              ─ Cleanup: Scopes, @Destroy properties
```

- **Bound()** - DOM attached, `@Watch` initialized. Query children with `requestAnimationFrame()` if needed.
- **Destroy()** - Cleanup resources. Always call `super.Destroy()` and `super.Bound()`.
- `@Watch` callbacks fire immediately with initial value when `Bound()` runs.

---

## Component Communication Patterns

| Direction | Mechanism | Example |
|-----------|-----------|---------|
| Parent → Child | Data props | `child({ data: () => ({ id: 1 }) })` |
| Child → Parent | Events | `this.Fire("save", payload)` + `on: { save: handler }` |
| Parent → Child | Templates | `this.Templates.render(data)` |
| Sibling ↔ Sibling | Shared service | Inject same service, use `ObservableScope` |

---

## Common Patterns

### Loading State
```typescript
@Value() isLoading = false;
@Value() error: string | null = null;

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
  on: { input: (e: Event) => { this.value = (e.target as HTMLInputElement).value; } }
})
```

### Scrollable Flex Container
```css
.content { flex: 1; min-height: 0; overflow-y: auto; }
```

### Async Initialization
```typescript
@State() data: Data[] = [];
@Value() isLoading = false;

Bound() {
  super.Bound();
  this.LoadData();
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

---

## Best Practices

**State:**
- `@Value` for primitives, `@State` for objects/arrays
- `@Computed` for expensive derived state needing object identity
- `@Scope` for cheap derived state
- Simple getters reading `this.Data` are reactive without decorators
- Always call `super.Bound()` and `super.Destroy()` when overriding

**State Location:**

| State Type | Location | API |
|------------|----------|-----|
| Raw data store | Service | `StoreAsync`/`StoreSync` |
| Derived (shared) | Service | `ObservableScope.Create()` |
| Derived (local, cheap) | Component | `@Scope()` |
| Derived (local, expensive/new objects) | Component | `@Computed()` |
| Primitives (local) | Component | `@Value()` |
| Complex (local) | Component | `@State()` |
| Async (component) | Component | `@Scope() + calc(async)` |
| Async (service) | Service | `ObservableScope.Create(async)` |
| External resources | Service | `IDestroyable` |

**Templates:**
- Keep `Template()` pure - no side effects
- Use functions for reactive bindings: `data: () => this.state`
- `text()` for reactive text nodes (no plain strings mixed with vNodes)
- `calc()` for optimization (circuit breaker), not required for arrays

**DI:**
- Define abstract service classes implementing `IDestroyable`
- `@Inject` with constructor tokens; override in injector for testing
- `@Inject` + `@Destroy` for services needing cleanup

**Reactivity:**
- Access data via `this.Data.prop` or getters for reactivity
- Don't access `@State`/`@Value` fields directly in templates (use getters)
- `data:` must be a function for reactivity: `data: () => this.items`

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `@State()` for primitives | Use `@Value()` |
| Missing `super.Bound()` / `super.Destroy()` | Always call when overriding |
| `@Computed()` for cheap ops | Use `@Scope()` |
| Non-function data bindings | `data: () => this.items` not `data: this.items` |
| Component without `ToFunction` | Always convert: `Component.ToFunction("name", Class)` |
| Decorators in service classes | Use `ObservableScope.Create()` in services |
| Service without `IDestroyable` | Implement `Destroy(): void` |
| React-style raw HTML | Use `innerHTML` prop: `div({ props: { innerHTML: html } })` |
| Plain strings mixed with vNodes in arrays | Use `text()` or sibling elements |
| `@Scope()` for simple property access | Plain getter reading `this.Data` is reactive |
| Missing generics on `Get()` | `this.store.Get<Type[]>("key", [])` |
| Not awaiting StoreAsync | Always `await this.store.Write(...)` |
| `@Value()`/`@State()` for services | Use `@Inject()` + `@Destroy()` |
| Missing `min-height: 0` in flex | Add to flex children that need scrolling |

---

## Debugging Reactivity

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Initial render works, updates don't | Direct array mutation | Replace array, don't mutate |
| Template never re-renders | `data:` not a function | Use `data: () => this.state` |
| Getter value stale | Not using `this.Data` | Read from `this.Data` in getter |
| `@Watch` never fires | Missing `super.Bound()` | Call in `Bound()` method |
| Memory leak | Missing cleanup | `@Destroy()` + `super.Destroy()` |
| No scrollbar in flex | Missing `min-height: 0` | Add to flex children |
| `StoreAsync.Write` error | Missing key | Provide key or keyFunc |
| `StoreSync.Patch` error | Target is undefined | Write value before patching |

---

## Complete Example

```typescript
import { Component, calc } from "j-templates";
import { div, input, button, span, text } from "j-templates/DOM";
import { Value, Scope, Watch, Inject, Destroy } from "j-templates/Utils";
import { StoreSync } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils";

// --- Types ---
interface TodoItem { id: string; text: string; completed: boolean; }

// --- Service ---
abstract class ITodoService implements IDestroyable {
  abstract readonly todos: TodoItem[];
  abstract addTodo(text: string): void;
  abstract toggleTodo(id: string): void;
  abstract Destroy(): void;
}

class TodoService implements ITodoService {
  private store = new StoreSync((item: TodoItem) => item.id);
  constructor() { this.store.Write([], "todos"); }

  get todos(): TodoItem[] { return this.store.Get<TodoItem[]>("todos", []); }
  addTodo(text: string) {
    this.store.Push("todos", { id: Date.now().toString(), text, completed: false });
  }
  toggleTodo(id: string) {
    this.store.Patch(id, { completed: true });
  }
  Destroy(): void { /* StoreSync has no Destroy */ }
}

// --- Child Component ---
interface TodoItemEvents { toggle: { id: string }; delete: { id: string }; }

class TodoItemComponent extends Component<{ todo: TodoItem }, void, TodoItemEvents> {
  Template() {
    return div({ props: () => ({ className: this.Data.todo.completed ? "done" : "" }) }, () => [
      span({}, () => this.Data.todo.text),
      button({ on: { click: () => this.Fire("toggle", { id: this.Data.todo.id }) } }, () => "Toggle"),
      button({ on: { click: () => this.Fire("delete", { id: this.Data.todo.id }) } }, () => "Delete")
    ]);
  }
}
export const todoItem = Component.ToFunction("todo-item", TodoItemComponent);

// --- Parent Component ---
class TodoList extends Component {
  @Inject(ITodoService) todoService!: ITodoService;
  @Value() newTodoText = "";

  @Scope()
  get todos() { return this.todoService.todos; }

  Template() {
    return div({ props: { className: "todo-app" } }, () => [
      input({
        props: () => ({ value: this.newTodoText, placeholder: "Add todo..." }),
        on: { input: (e: Event) => { this.newTodoText = (e.target as HTMLInputElement).value; } }
      }),
      button({ on: { click: () => { if (this.newTodoText.trim()) { this.todoService.addTodo(this.newTodoText.trim()); this.newTodoText = ""; } } } }, () => "Add"),
      div({ data: () => this.todos }, (todo) =>
        todoItem({
          data: () => ({ todo }),
          on: {
            toggle: ({ id }) => this.todoService.toggleTodo(id),
            delete: ({ id }) => console.log("delete", id)
          }
        })
      )
    ]);
  }
}
export const todoList = Component.ToFunction("todo-list", TodoList);

// --- App Root ---
class App extends Component {
  @Destroy()
  @Inject(ITodoService)
  todoService = new TodoService();

  Template() { return todoList({}); }
}
const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app"), app({}));
```

---

## Quick Reference

### Import Paths
```typescript
import { Component, calc } from "j-templates";
import { div, button, input, text, /* ... */ _var } from "j-templates/DOM";
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy, Bound, Animation, AnimationType, IDestroyable, Injector } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
```

### Component Pattern
```typescript
class MyComponent extends Component<Data, Templates, Events> {
  @Inject(Service) service!: Service;
  @Value() state = 0;
  @Scope() get derived() { return this.state * 2; }

  Template() { return div({}, () => "UI"); }
  Bound() { super.Bound(); /* optional */ }
  Destroy() { super.Destroy(); /* optional */ }
}
export const myComponent = Component.ToFunction("my-component", MyComponent);
```

### Service Pattern
```typescript
abstract class IMyService implements IDestroyable {
  abstract readonly data: DataType[];
  abstract DoWork(): Promise<void>;
  abstract Destroy(): void;
}

class MyService implements IMyService {
  private store = new StoreAsync((value) => value.id);
  get data(): DataType[] { return this.store.Get<DataType[]>("data", []); }
  async DoWork(): Promise<void> { await this.store.Write(result, "data"); }
  Destroy(): void { this.store.Destroy(); }
}
```

### Store Operations
```
Write(data, key?)         → Set value (keyFunc used if key omitted)
Push(key, ...items)       → Append items to array
Patch(key, updates)       → Partial update on object
Get<Type>(key, default)   → Read value (observable proxy) - always use generics
Splice(key, start, del?)  → Remove/insert items (returns deleted items)
```

### Decorator vs ObservableScope
| Context | Primitive | Object | Derived |
|---------|-----------|--------|---------|
| Component | `@Value()` | `@State()` | `@Scope()` / `@Computed()` |
| Service | N/A | `StoreSync`/`StoreAsync` | `ObservableScope.Create()` |