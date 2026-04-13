# j-templates Syntax Primer

Complete reference for j-templates framework syntax. For pattern-oriented guides, see `docs/patterns/`.

**Core concepts:** Components define UI via `Template()`. State decorators (`@Value`, `@State`, `@Computed`) enable reactivity. DOM functions (`div()`, `button()`) create virtual nodes. No compile step, minimal dependencies.

---

## Imports & Setup

```bash
npm install j-templates
```

**tsconfig.json** requires `"experimentalDecorators": true`.

**File naming:** Components: kebab-case (`todo-list.ts`). Services: kebab-case + `-service` suffix. Exports: lowercase matching filename.

```typescript
import { Component, calc } from "j-templates";
import { div, button, input, span, h1, text, _var } from "j-templates/DOM";  // _var for <var>
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy, Bound, Animation, AnimationType, IDestroyable, Injector } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
import { CreateRootPropertyAssignment, CreateEventAssignment } from "j-templates/DOM";
```

**DOM Functions:** `div`, `span`, `section`, `article`, `aside`, `nav`, `main`, `header`, `footer`, `hr`, `blockquote`, `address`, `h1`-`h6`, `p`, `a`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`, `sub`, `sup`, `mark`, `small`, `label`, `pre`, `code`, `kbd`, `samp`, `_var`, `cite`, `q`, `abbr`, `time`, `dfn`, `rt`, `rp`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `col`, `colgroup`, `form`, `input`, `textarea`, `button`, `select`, `option`, `optgroup`, `fieldset`, `legend`, `datalist`, `output`, `progress`, `meter`, `img`, `figure`, `figcaption`, `picture`, `source`, `audio`, `video`, `track`, `embed`, `object`, `param`, `iframe`, `details`, `summary`, `dialog`, `menu`, `canvas`, `svg`, `map`, `area`, `template`, `slot`, `text`.

No SVG-specific elements exported; use `Component.ToFunction` with namespace for custom SVG components.

---

## Component

### Class & Generics

```typescript
class MyComponent extends Component<D, T, E> {
  // D = data type from parent (default: void)
  // T = template functions from parent (default: void)
  // E = event map type (default: {})

  Template(): vNodeType | vNodeType[] { return div({}, () => "Hello"); }
  Bound() { super.Bound(); }     // Required: initializes @Watch decorators
  Destroy() { super.Destroy(); } // Required: cleans up scopes and @Destroy properties
}
```

**Never override the constructor.** Use field initializers and `Bound()` for setup.

### Properties & Methods

| Property | Access | Description |
|----------|--------|-------------|
| `Data` | `protected get` | Data from parent via `data: () => ({...})` |
| `Templates` | `protected get` | Parent-provided template functions |
| `Injector` | `public get` | Component's scoped DI injector |
| `VNode` | `protected get` | Custom element host (not template root) |
| `Scope` | `protected get` | Internal scoped observable |
| `Destroyed` | `public get` | Whether component is destroyed |

| Method | Description |
|--------|-------------|
| `Template()` | Override to define UI. Returns empty array by default. |
| `Bound()` | Lifecycle hook after DOM attachment. Calls `Bound.All(this)`. |
| `Destroy()` | Destroys scope + calls `Destroy.All(this)`. |
| `Fire<P extends keyof E>(event: P, data?: E[P])` | Fire component event. `data` is optional. |

### ToFunction, Attach, Register

```typescript
// Convert class to reusable function (required for template use)
export const myComponent = Component.ToFunction("my-component", MyComponent);

// With namespace (SVG)
export const svgCircle = Component.ToFunction("circle", SvgCircle, "http://www.w3.org/2000/svg");

// Attach to DOM
Component.Attach(document.body, myComponent({}));

// Register as Web Component (creates open shadow DOM)
Component.Register("my-component", MyComponent);
```

**ToFunction config type:**
```typescript
type vComponentConfig<D, E, P = HTMLElement> = {
  data?: () => D | undefined;
  props?: FunctionOr<RecursivePartial<P>> | undefined;
  on?: ComponentEvents<E> | undefined;
};
type ComponentEvents<E> = { [P in keyof E]?: { (data: E[P]): void } };
type FunctionOr<T> = { (): T | Promise<T> } | T;
```

### Custom Element Host

`this.VNode.node` is the custom element host, not the template root. Query template children via `this.VNode.node.querySelector('.className')`.

```html
<my-component>              <!-- Host (styled via element selector) -->
  <div class="container">   <!-- Template root (styled via class selector) -->
```

---

## Template System

### DOM Function Signature

```typescript
function element<P, E, T>(
  config?: {
    props?: FunctionOr<RecursivePartial<P>>;   // DOM properties (static or reactive)
    attrs?: FunctionOr<{ [name: string]: string }>; // HTML attributes
    on?: FunctionOr<vNodeEvents<E>>;           // Event handlers
    data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>; // Reactive data
  },
  children?: vNodeType[] | ((data: T) => vNodeType[] | vNodeType | string)
): vNodeType
```

**Functions are reactive:** When referenced scope values change, the vNode re-renders.

### Template Patterns

```typescript
Template() {
  return div({ props: { className: "container" } }, () => [
    h1({}, () => "Title"),

    // Reactive data binding - framework iterates array
    div({ data: () => this.Data.items }, (item) =>
      div({}, () => item.name)
    ),

    // Reactive props
    div({ props: () => ({ className: this.isActive ? "active" : "" }) }, () => "Content"),

    // Event handlers
    button({ on: { click: (e: MouseEvent) => this.handleClick(e) } }, () => "Click"),

    // Conditional (ternary with string fallback)
    this.isLoading ? div({}, () => "Loading") : "",

    // Child component
    childComponent({ data: () => ({ id: 1 }) }),

    // Reactive text node
    text(() => `Count: ${this.count}`),

    // Raw HTML (use innerHTML prop, NOT { __html: })
    div({ props: { innerHTML: "<strong>Bold</strong>" } }),

    // Mixed text + elements (use text(), not plain strings in arrays)
    text(() => "Click "), button({}, () => "here"), text(() => " to continue")
  ]);
}
```

### data: Binding Behavior

| Return Value | Behavior |
|--------------|----------|
| `[]` | No children rendered |
| `[a, b, c]` | Iterates, renders child for each item |
| `{ id: 1 }` | Wraps as `[{ id: 1 }]`, renders once |
| `"text"` / `123` | Wraps as `[value]`, renders once |
| `falsy` / `null` / `undefined` | Returns `[]`, no children rendered |

**Also accepts** `Promise<T>` and `Promise<T[]>` for async data.

### Key Template Rules

1. **Pass arrays as `data:`** — framework iterates automatically. Don't call `.map()` inside children.
2. **Wrap children in functions** for separate reactive scopes. Without function wrapper, all children share parent scope.
3. **Two-way binding requires reactive props**: `props: () => ({ value: this.text })` (not static `props: { value: this.text }` which causes focus loss).
4. **Conditional rendering**: Use ternary with `""` fallback or `.filter(Boolean)`. Don't use `null` in arrays.
5. **`text()` for reactive text nodes** — no plain strings mixed with vNodes in arrays.

### Granular Reactive Scopes

```typescript
// With function wrapper — each span has independent scope
div({}, () => [span({}, () => this.value1), span({}, () => this.value2)]);
// Changing value1 only updates first span

// Without function wrapper — both spans share parent scope
div({}, [span({}, () => this.value1), span({}, () => this.value2)]);
// Changing value1 re-renders both spans
```

---

## State Decorators

All decorators are for **Component classes only**. Services must use `ObservableScope`/`Store` APIs directly.

### @Value — Primitive State

```typescript
@Value() count: number = 0;
@Value() isLoading: boolean = false;
```

Lightweight, no proxy. For `number`, `string`, `boolean`, `null`, `undefined`.

### @State — Complex State

```typescript
@State() user: { name: string } = { name: "" };
@State() items: TodoItem[] = [];
```

Deep reactivity via proxy. For objects with nested properties and arrays.

### @Scope — Cached Getter (New Reference)

```typescript
@Scope()
get fullName() { return `${this.firstName} ${this.lastName}`; }
```

Cached, returns new reference on update. For cheap computations, primitives, simple array operations that maintain object identity (filter, sort).

### @Computed — Cached Getter (Same Reference)

```typescript
@Computed()
get report() {
  return { total: this.items.reduce((s, i) => s + i.value, 0), average: /* ... */ };
}
```

Cached, preserves object identity via `ApplyDiff`. No default value parameter. For creating new objects in getter (filtering/sorting/aggregating data into new structures).

### @ComputedAsync — Sync Getter with StoreAsync Backend

```typescript
@ComputedAsync(null)
get userData(): User | null {
  return getUserSync(this.Data.userId); // Must be synchronous — "Async" refers to the StoreAsync backend
}
```

Requires default value parameter. Same reference preservation as `@Computed`. The getter **must be synchronous** — the "Async" in the name refers to the internal `StoreAsync` diffing mechanism, not the getter signature. For async data fetching, use `@Scope() + calc(async)` or `ObservableScope.Create(async)`.

### @Watch — Property Change Handler

```typescript
@Watch((self) => self.count)
handleCountChanged(newValue: number) { console.log("Count:", newValue); }

@Watch((self) => self.Data.value)
onDataChange(newValue: DataType) { /* ... */ }
```

Fires immediately with initial value when `Bound()` runs, then on each change. Subscription auto-cleaned on `Destroy()`. Uses greedy (batched) scope.

### @Inject — Dependency Injection

```typescript
@Inject(DataService) dataService!: DataService;
```

Creates getter/setter using component's injector. Getter: `this.Injector.Get(type)`. Setter: `this.Injector.Set(type, value)`.

### @Destroy — Auto-Cleanup

```typescript
@Destroy() timer: Timer = new Timer();  // Timer must implement IDestroyable
@Destroy() @Inject(DataService) dataService = new DataService();
```

Calls `.Destroy()` on marked properties during component teardown. Requires `IDestroyable` interface.

### Decorator Selection

| Value Type | Decorator | Why |
|------------|-----------|-----|
| `number`, `string`, `boolean` | `@Value` | Lightweight, no proxy |
| `null`, `undefined` | `@Value` | Simple scope |
| `{ nested: objects }` | `@State` | Deep reactivity via proxy |
| `arrays (User[])` | `@State` | Array mutations tracked |
| Cheap getter / primitives | `@Scope` | Cached, new ref, minimal overhead |
| Array map/filter/sort (existing refs) | `@Scope` | Object identity preserved |
| Creating new objects | `@Computed()` | Cached + same ref via ApplyDiff |
| Sync getter + StoreAsync backend | `@ComputedAsync(default)` | Same ref, StoreAsync diffing |
| Watch changes | `@Watch` | Callback on change (greedy/batched) |
| DI from injector | `@Inject` | Lazy resolution from injector |
| Cleanup on destroy | `@Destroy` | Auto `.Destroy()` (requires `IDestroyable`) |
| Simple property access | None (plain getter) | Reading `this.Data` is reactive |

### @Computed vs @Scope vs @ComputedAsync

| Aspect | `@Computed()` | `@Scope()` | `@ComputedAsync(default)` |
|--------|------------|------------|--------------------------|
| Object identity | Same ref (ApplyDiff) | New ref | Same ref (ApplyDiff) |
| Backend | StoreSync | Single scope | StoreAsync |
| Default param | No | N/A | Required |
| Best for | New objects, expensive ops | Primitives, cheap ops, existing-ref arrays | Sync getter + StoreAsync diffing |

**Key:** `@Computed` preserves object identity across updates. Critical when DOM reuse depends on reference stability (e.g., iterating arrays with `data:`).

### Async Patterns

```typescript
// 1. Direct async in services (new reference on each update)
private dataScope = ObservableScope.Create(async () => fetch('/api/data'));
get data(): Data | null { return ObservableScope.Value(this.dataScope); }

// 2. Component async with calc() (new reference on each update)
@Scope()
get CurrentUser() { return calc(async () => fetchUser(`/api/user/${this.userId}`)); }

// 3. @ComputedAsync — sync getter only, StoreAsync backend (same reference via ApplyDiff)
@ComputedAsync(null)
get userData(): User | null { return getUserSync(this.Data.userId); }
```

**Async patterns 1 & 2:** Async functions auto-detected. Automatically sets `greedy: true` (batched updates). Initial value: `null` or Promise. New reference on each update.
**Pattern 3 (@ComputedAsync):** Getter must be synchronous. Returns default value initially, then computed value with same reference via ApplyDiff.

### State Location

| State Type | Location | API |
|------------|----------|-----|
| Raw data store | Service | `StoreAsync`/`StoreSync` |
| Derived (shared) | Service | `ObservableScope.Create()` |
| Derived (local, cheap) | Component | `@Scope()` |
| Derived (local, new objects) | Component | `@Computed()` |
| Primitives (local) | Component | `@Value()` |
| Complex (local) | Component | `@State()` |
| Async (component) | Component | `@Scope() + calc(async)` |
| Async (service) | Service | `ObservableScope.Create(async)` |
| External resources | Service | `IDestroyable` |

---

## Component Composition

### Parent → Child (Data)

```typescript
// Parent passes data (read-only in child)
childComponent({ data: () => ({ userId: this.userId }) });

// Child receives via this.Data
class Child extends Component<{ userId: string }> {
  Template() { return div({}, () => this.Data.userId); }
}

// @Value() is for component-internal mutable state, not parent data
```

### Child → Parent (Events)

```typescript
interface ChildEvents { save: { data: string }; }

class Child extends Component<{}, {}, ChildEvents> {
  Template() { return button({ on: { click: () => this.Fire("save", { data: "value" }) } }); }
}

childComponent({ on: { save: (payload) => console.log(payload.data) } });
```

Component events don't bubble through DOM — only via j-templates `on:` system.

### Template Callbacks

```typescript
interface RowTemplate<D> { render: (data: D) => vNode; }

class Table<D> extends Component<{ data: D[] }, RowTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item: D) => this.Templates.render(item));
  }
}

table({ data: () => ({ data: users }) }, { render: (user) => div({}, () => user.name) });
```

### Sibling Communication (Shared Service)

Inject same service, use `ObservableScope` for reactive messaging. See `docs/patterns/04-dependency-injection.md`.

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
  constructor();              // Sets parent to Injector.Current()
  Get<T>(type: any): T;      // Searches parent chain. Returns undefined as T if not found.
  Set<T>(type: any, instance: T): T;  // Sets at this scope, returns instance.
}

namespace Injector {
  Current(): Injector | null;
  Scope<R, P>(injector: Injector, action: (...args: P) => R, ...args: P): R;
}
```

### Abstract Service Pattern

```typescript
abstract class IDataService implements IDestroyable {
  abstract getData(): Data[];
  abstract Destroy(): void;
}

class DataService implements IDataService {
  private store = new StoreSync();
  getData(): Data[] { return this.store.Get<Data[]>("data", []); }
  Destroy(): void { /* cleanup */ }
}

// Parent provides, child consumes
class App extends Component {
  @Destroy() @Inject(IDataService) dataService = new DataService();
}
class Child extends Component {
  @Inject(IDataService) dataService!: IDataService;
}
```

**Key:** Injector has parent chain — `Get` traverses up. `@Inject` provides getter + setter. Combine `@Inject` + `@Destroy` for services needing cleanup. `@Destroy` requires `IDestroyable`.

---

## Store (StoreSync & StoreAsync)

### Base Store API

```typescript
class Store {
  constructor(keyFunc?: (value: any) => string | undefined);
  Get<O>(id: string): O | undefined;        // Returns undefined if not found
  Get<O>(id: string, defaultValue: O): O;   // Creates and returns default if not found
}
```

### StoreSync (Synchronous)

```typescript
class StoreSync extends Store {
  Write(data: unknown, key?: string): void;      // key derived from keyFunc if omitted
  Patch(key: string, patch: unknown): void;       // Merge patch into existing value; throws if undefined
  Push(key: string, ...data: unknown[]): void;    // Append items to array at key
  Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): unknown[];
}
```

**No `Destroy()` method** on StoreSync.

### StoreAsync (Asynchronous)

```typescript
class StoreAsync extends Store {
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
- Use separate keys for separate data states (`"messages"` vs `"pending-messages"`)
- Always `await` StoreAsync operations
- `Get()` returns observable proxy — cast with generics: `Get<Type[]>("key", [])`
- `Patch` throws if target value is `undefined`

### Store Operations Summary

| Operation | StoreSync | StoreAsync |
|-----------|-----------|------------|
| Write | sync | async (Promise) |
| Push | sync | async (Promise) |
| Patch | sync | async (Promise) |
| Splice | sync | async (Promise) |
| Get | sync | sync |
| Destroy | N/A | `Destroy(): void` |
| Key sharing | Yes | Yes |

---

## ObservableScope API

```typescript
namespace ObservableScope {
  Create<T>(valueFunction: { (): T | Promise<T> }, greedy?: boolean, force?: boolean): IObservableScope<T>;
  Value<T>(scope: IObservableScope<T>): T;          // Get value + register dependency
  Peek<T>(scope: IObservableScope<T>): T;           // Get value without registering dependency
  Touch<T>(scope: IObservableScope<T>): void;       // Register as dependency without reading value
  Watch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;
  Unwatch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;
  OnDestroyed(scope: IObservableScope<unknown>, callback: EmitterCallback): void;
  Update(scope: IObservableScope<any>): void;       // Mark dirty, triggers recomputation
  Register(emitter: Emitter): void;
  Destroy<T>(scope: IObservableScope<T>): void;
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
  Destroy(): void { this.store.Destroy(); ObservableScope.Destroy(this.derived); }
}

// Sibling communication via shared service
class BusService implements IDestroyable {
  private _message = "";
  private messageScope = ObservableScope.Create(() => this._message, false, true);
  get message() { return ObservableScope.Value(this.messageScope); }
  set message(v) { this._message = v; ObservableScope.Update(this.messageScope); }
  Destroy(): void { ObservableScope.Destroy(this.messageScope); }
}
```

---

## ObservableNode API

```typescript
namespace ObservableNode {
  Create<T>(value: T): T;                                       // Wrap in reactive proxy
  Unwrap<T>(value: T): T;                                      // Get raw value from proxy
  Touch(value: unknown, prop?: string | number): void;          // Manually trigger change
  ApplyDiff(rootNode: any, diffResult: JsonDiffResult): void;   // Apply diff in-place (@Computed uses this)
  CreateFactory(alias?: (value: any) => any | undefined): <T>(value: T) => T;  // Factory with aliasing
}
```

**Array operations on ObservableNode proxies:** `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` — all trigger reactive updates.

---

## calc() — Circuit Breaker for Derived Values

`calc()` prevents unnecessary reactivity propagation. If result is unchanged (`===`), dependents are not notified.

**Only works within a watch context** (falls back to direct call outside).

```typescript
import { calc } from "j-templates";

// Primitive gating — prevents emission when result unchanged
calc(() => this.Data.count > 10);

// Parent scope with child optimization
tbody({ data: () => calc(() => this.Data.items) }, (item) => tr({}, () => td({}, () => item.name)));

// Multiple calc scopes with custom IDs
calc(() => computeA(), "id-a");
calc(() => computeB(), "id-b");
```

### When to Use calc()

| Scenario | Use calc()? | Why |
|----------|-------------|-----|
| Direct `@State` array access | Optional | Value gating when parent changes |
| Static constant array | No | Never changes, adds overhead |
| Primitive derived state | Yes | `===` prevents unnecessary emissions |
| Parent aggregates multiple values | Yes | Child only cares about specific parts |
| Array transformations (filter/map) | No | Always new references, never helps |
| Multiple uses in same template | Yes | Scope reuse avoids duplicate work |

**What calc() does NOT do:** Make arrays reactive (`@State` already does that). Prevent emissions for array transformations (always new refs). Provide object reuse (that's `@Computed`).

---

## Lifecycle

```
1. Component.Attach() called     ─ DOM: Not attached
2. vNode.Init() called            ─ DOM: Not attached
3. Component constructor runs     ─ DOM: Not attached
4. Bound() called                 ─ DOM: Attached ✓ | Children: May not be ready ⚠
5. Template rendered, attached    ─ DOM: Fully rendered ✓
6. ... reactivity updates ...
7. Component.Destroy() called     ─ DOM: About to be removed
8. Destroy() called               ─ Cleanup: Scopes, @Destroy properties
```

- **Bound()** — DOM attached, `@Watch` initialized (fires immediately with initial value). Query children with `requestAnimationFrame()` if needed.
- **Destroy()** — Always call `super.Destroy()` and `super.Bound()` when overriding.
- **Never override constructor.** Use field initializers and `Bound()` for setup.

### Async Initialization Pattern

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

## Animation

```typescript
enum AnimationType { Linear, EaseIn }  // EaseIn = cubic bezier

class Animation implements IDestroyable {
  constructor(type: AnimationType, duration: number, update: (next: number) => void);
  get Running(): boolean;
  get Start(): number;      // null if not running
  get End(): number;        // null if not running
  get Enabled(): boolean;
  Animate(start: number, end: number): Promise<void> | undefined;  // undefined if disabled or diff=0
  Disable(): void;
  Enable(): void;
  Cancel(): void;
  Destroy(): void;   // Calls Disable()
}
```

---

## Type Definitions

```typescript
// vNode types (simplified for reference)
type vNode = vStringNode | vElementNode;

type vStringNode = {
  type: "string";
  node: string;
};

type vElementNode = {
  type: string;
  definition: vNodeDefinition | null;  // null after initialization
  injector: Injector;
  node: Node | null;
  children: (readonly [any, vNode[], IObservableScope<string | vNode | vNode[]> | null])[] | null;
  destroyed: boolean;
  onDestroyed: Emitter | null;
  scopes: IObservableScope<unknown>[];
  component: Component;  // non-nullable on element nodes
};

interface vNodeDefinition<P = HTMLElement, E extends { [event: string]: any } = any, T = never> {
  type: string;
  namespace: string | null;  // not optional, but can be null
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
  children?: vNodeChildrenFunction<T>;
  childrenArray?: vNode[];
  componentFactory?: (vnode: vNode) => Component<any, any, any>;
  node?: Node;
}

type vNodeChildrenFunction<T> =
  | ((data: T) => vNode | vNode[])
  | ((data: T) => string);

type FunctionOr<T> = { (): T | Promise<T> } | T;
type RecursivePartial<T> = { [P in keyof Pick<T, NonFunctionKeys<T>>]?: T[P] extends Function ? never : T[P] extends object ? RecursivePartial<T[P]> : T[P]; };
type vNodeEvents<E extends { [event: string]: any } = any> = { [P in keyof E]?: { (events: E[P]): void } };
type ComponentEvents<E = void> = E extends void ? void : { [P in keyof E]?: { (data: E[P]): void } };
interface IObservableScope<T> { type: "static" | "dynamic"; value: T; /* ...dynamic fields when type="dynamic" */ }
interface IDestroyable { Destroy(): void; }
type ConstructorToken<I> = { new (...args: any[]): I } | (abstract new (...args: any[]): I);
type NonFunctionKeys<T> = { [P in keyof T]: T[P] extends Function ? never : P }[keyof T];
```

// Decorator signatures
function Computed(): PropertyDecorator;           // No default value parameter
function ComputedAsync<V>(defaultValue: V): PropertyDecorator;  // Default value required
function Value(): PropertyDecorator;
function State(): PropertyDecorator;
function Scope(): PropertyDecorator;
function Watch<S extends (instance: T) => any, T>(scope: S): MethodDecorator;
function Inject<I, T extends Record<K, I>>(type: ConstructorToken<I>): PropertyDecorator;
function Destroy(): PropertyDecorator;
```

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

### Form Handling (Two-Way Binding)
```typescript
@Value() value = "";
input({
  props: () => ({ value: this.value }),  // Must be function for reactivity
  on: { input: (e: Event) => { this.value = (e.target as HTMLInputElement).value; } }
});
```

### List Rendering
```typescript
// Framework iterates automatically — don't use .map()
div({ data: () => this.items }, (item) => div({}, () => item.name));

// With optional calc() optimization
tbody({ data: () => calc(() => this.Data.items) }, (item) => tr({}, () => td({}, () => item.name)));
```

### Derived State
```typescript
// Simple getter reading this.Data — reactive without decorator
get itemCount(): number { return this.Data.items.length; }

// Cheap computation — @Scope
@Scope()
get sortedItems() { return this.Data.items.slice().sort((a, b) => b.value - a.value); }

// Creating new objects — @Computed
@Computed()
get report() {
  return { total: this.items.reduce((s, i) => s + i.value, 0), average: /* ... */ };
}
```

### Complete Service Pattern
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

// Root component provides
class App extends Component {
  @Destroy() @Inject(IMyService) service = new MyService();
}
```

### Scrollable Flex Container
```css
.content { flex: 1; min-height: 0; overflow-y: auto; }
```
Flex items default to `min-height: auto`, preventing shrinkage below content size.

---

## Anti-Patterns & Common Mistakes

| Mistake | Fix |
|---------|-----|
| `@State()` for primitives | Use `@Value()` |
| Missing `super.Bound()` / `super.Destroy()` | Always call when overriding |
| `@Computed()` for cheap ops | Use `@Scope()` or plain getter |
| Non-function data bindings | `data: () => this.items` not `data: this.items` |
| Component without `ToFunction` | Always convert: `Component.ToFunction("name", Class)` |
| Decorators in service classes | Use `ObservableScope.Create()` in services |
| Service without `IDestroyable` | Implement `Destroy(): void` |
| React-style raw HTML (`{ __html: }`) | Use `innerHTML` prop: `div({ props: { innerHTML: html } })` |
| Plain strings mixed with vNodes in arrays | Use `text()` or sibling elements |
| `@Scope()` for simple property access | Plain getter reading `this.Data` is reactive |
| Missing generics on `Get()` | `this.store.Get<Type[]>("key", [])` |
| Not awaiting StoreAsync | Always `await this.store.Write(...)` |
| `@Value()`/`@State()` for services | Use `@Inject()` + `@Destroy()` |
| Missing `min-height: 0` in flex | Add to flex children that need scrolling |
| Static props for two-way binding | Use `props: () => ({ value: this.text })` |
| `.map()` in children function | Pass array as `data:`, framework iterates |
| `@Computed()` for array filter/sort of existing refs | Use `@Scope()` — identity already preserved |
| Overriding constructor | Use field initializers and `Bound()` |
| `null` in children arrays | Use ternary with `""` or `.filter(Boolean)` |
| `StoreSync.Patch` on undefined target | Write value before patching |

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
| Input loses focus | Static `props` object | Use `props: () => ({ value })` |

### Internal Mechanics (For Debugging)

- **Surgical Reactivity:** Template functions (`data: () => this.state`) are dependency registration points linking DOM nodes to observableScopes for surgical updates.
- **Object Identity:** `@Computed` uses `ApplyDiff` to merge changes into existing references, preventing DOM subtree recreation.
- **StoreAsync Constraints:** Uses Web Workers for diffing; data must be JSON-serializable (no methods or circular references).
- **`calc()` as Circuit Breaker:** Prevents reactivity propagation when result is unchanged (`===`).
- **Scope Types:** `static` (fixed, zero overhead), `dynamic` (tracks deps, caches, emits on change), `greedy` (batched via microtask queue — used for watch callbacks, async).
- **Lazy Initialization:** Scopes created on first access, not construction.
- **Memory Management:** All scopes tracked via WeakMap. `Destroy()` calls `ObservableScope.DestroyAll()` + `@Destroy` properties auto-cleaned.

---

## Quick Reference

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

### Decorator vs ObservableScope

| Context | Primitive | Object | Derived |
|---------|-----------|--------|---------|
| Component | `@Value()` | `@State()` | `@Scope()` / `@Computed()` |
| Service | N/A | `StoreSync`/`StoreAsync` | `ObservableScope.Create()` |

### Store Operations
```
Write(data, key?)         → Set value (keyFunc used if key omitted)
Push(key, ...items)       → Append items to array
Patch(key, updates)       → Partial update on object
Get<Type>(key, default)   → Read value (observable proxy) - always use generics
Splice(key, start, del?)  → Remove/insert items (returns deleted items for StoreAsync)
```

### Lifecycle Quick Guide
```
1. Attach() → 2. Constructor → 3. Bound() → 4. Render → 5. Destroy()
                    ↑                        ↑
              super.Bound()           super.Destroy()
```

### For detailed patterns and examples, see:
- `docs/patterns/01-components.md`
- `docs/patterns/02-reactivity.md`
- `docs/patterns/03-templates-and-data.md`
- `docs/patterns/04-dependency-injection.md`