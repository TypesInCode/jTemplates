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
import { Component, scope, gate, peek } from "j-templates";
import { div, button, input, span, h1, text, _var } from "j-templates/DOM";
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy, Bound, Animation, AnimationType, IDestroyable, Injector } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
import { CreateRootPropertyAssignment, CreateEventAssignment } from "j-templates/DOM";
```

**DOM Functions:** `div`, `span`, `section`, `article`, `aside`, `nav`, `main`, `header`, `footer`, `hr`, `blockquote`, `address`, `h1`-`h6`, `p`, `a`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`, `sub`, `sup`, `mark`, `small`, `label`, `pre`, `code`, `kbd`, `samp`, `_var`, `cite`, `q`, `abbr`, `time`, `dfn`, `rt`, `rp`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `col`, `colgroup`, `form`, `input`, `textarea`, `button`, `select`, `option`, `optgroup`, `fieldset`, `legend`, `datalist`, `output`, `progress`, `meter`, `img`, `figure`, `figcaption`, `picture`, `source`, `audio`, `video`, `track`, `embed`, `object`, `param`, `iframe`, `details`, `summary`, `dialog`, `menu`, `canvas`, `svg`, `map`, `area`, `template`, `slot`, `text`.

No SVG-specific elements exported; use `Component.ToFunction` with namespace for custom SVG components.

---

## Component

### Class, Generics & Lifecycle

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

### Lifecycle

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

    // Conditional rendering — three patterns depending on isolation needs:

    // 1. Nested children function — isolated scope, use when an "else" branch is needed
    div({}, () =>
      this.isLoading ? div({}, () => "Loading") : text(() => "")
    ),

    // 2. data: boolean — falsy renders nothing, truthy renders child, no "else" needed
    div({ data: () => this.isLoading }, () => div({}, () => "Loading")),

    // 3. gate() — only re-evaluates when boolean flips; use when source changes frequently
    //    and the condition shares a children function with other reactive siblings
    gate(() => this.isLoading) ? div({}, () => "Loading") : div({}, () => "Content"),

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
| `true` | Wraps as `[true]`, renders child once |
| `false` / `null` / `undefined` | Returns `[]`, no children rendered |

**Also accepts** `Promise<T>` and `Promise<T[]>` for async data.

The `false`/`true` behavior makes `data:` a clean conditional rendering mechanism: `data: () => this.isLoading` renders its child once when true and nothing when false, with its own isolated reactive scope.

### Key Template Rules

1. **Pass arrays as `data:`** — framework iterates automatically. Don't call `.map()` inside children.
2. **Wrap children in functions** for separate reactive scopes. Without function wrapper, all children share parent scope.
3. **Two-way binding requires reactive props**: `props: () => ({ value: this.text })` (not static `props: { value: this.text }` which causes focus loss).
4. **Conditional rendering** — choose a pattern based on isolation needs. The most common mistake is reading a condition and a sibling `data:` list in the same children function — when either changes, both re-render.

```typescript
// Anti-pattern: condition and list share a children function scope.
// Any change to isEmpty OR visibleTodos re-runs the entire block.
div({}, () => [
  this.isEmpty ? div({}, () => "No items") : text(() => ""),
  div({ data: () => this.visibleTodos }, (item) => ...)
])

// Correct: each has its own isolated scope.
div({}, () => [
  div({}, () => this.isEmpty ? div({}, () => "No items") : text(() => "")),
  div({ data: () => this.visibleTodos }, (item) => ...)
])

// Also correct: data: boolean — no else branch needed, isolated scope.
div({}, () => [
  div({ data: () => this.isEmpty }, () => div({}, () => "No items")),
  div({ data: () => this.visibleTodos }, (item) => ...)
])

// Also correct: gate() — condition shares scope with siblings but only
// re-evaluates when the boolean flips, not on every upstream emission.
div({}, () => [
  gate(() => this.visibleTodos.length === 0)
    ? div({}, () => "No items")
    : text(() => ""),
  div({ data: () => this.visibleTodos }, (item) => ...)
])
```

5. **`text()` for reactive text nodes** — no plain strings mixed with vNodes in arrays.
6. **Keep `data:` bindings inline in `Template()`** — helper functions called from `Template()` create new vNodes each render, destroying and recreating children scopes. Keep element definitions with `data:` bindings inline so the vNode and its scope persist across renders.

```typescript
// Anti-pattern — helper function creates new vNodes each Template() call
private renderItem = (item: Item) =>
  div({ data: () => item }, (data) => span({}, () => data.name));
Template() {
  return div({}, () => [
    this.renderItem(a),  // New vNode, destroyed and recreated each render
    this.renderItem(b),
  ]);
}

// Correct — inline with @Scope data source
@Scope() get groupA() { return items.filter(...); }
Template() {
  return div({}, () => [
    div({ data: () => this.groupA }, (item) => renderItem(item)),
    div({ data: () => this.groupB }, (item) => renderItem(item)),
  ]);
}
```

7. **Read `@Scope` getters at the point of use** — reading a `@Scope` at the top of `Template()` registers it as a dependency of the entire Template. Reading it inside a children function or `data:` binding keeps the subscription scoped to that subtree.

```typescript
// Anti-pattern — scope read at top of Template
Template() {
  const derived = this.computedValue;  // Subscribes entire Template
  return div({}, () => [
    div({}, () => `${derived}`),       // Any change re-runs ALL
    div({}, () => "other static content"),
  ]);
}

// Correct — scope read inside children function
Template() {
  return div({}, () => [
    div({}, () => {                     // Subscription scoped to this subtree
      const derived = this.computedValue;
      return `${derived}`;
    }),
    div({}, () => "other static content"),  // Unaffected by derived changes
  ]);
}
```

### Granular Reactive Scopes

```typescript
// No function wrappers
div({}, [span({ data: this.value1 }, (v) => v), span({ data: this.value2 }, (v) => v)]);
// Changing value1 re-renders all elements

// With children function wrapper
div({}, () => [span({ data: this.value1 }, (v) => v), span({ data: this.value2 }, (v) => v)]);
// Changing value1 re-renders both spans, div is unaffected

// With data function wrappers
div({}, () => [span({ data: () => this.value1 }, (v) => v), span({ data: () => this.value2 }, (v) => v)]);
// Changing value1 only updates the first span, other elements are unaffected
```

### How Updates Propagate

When a reactive scope emits, the framework:

1. Re-runs the children function that read the scope, producing a new vNode tree.
2. Patches the DOM from the old vNode tree to the new vNode tree.

The framework does **not** diff two vNode trees against each other. There is no vNode reconciliation. The "surgical" aspect comes from scoping — only the children functions that subscribed to the changed scope re-run. Everything else is untouched.

This means:
- A scope read at the top of `Template()` rebuilds the entire component vNode tree.
- A scope read inside a children function rebuilds only that subtree.
- A scope read inside a `data:` binding rebuilds only that iteration's vNode.
- Per-item scopes are reused when the same data object reference reappears (identity-based, not key-based).

The optimization goal is minimizing **how often** children functions re-run through fine-grained scopes, not making the re-run itself cheap.

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
@State() items: Item[] = [];
```

Deep reactivity via proxy. For objects with nested properties and arrays.

### @Scope — Cached Getter (New Reference)

```typescript
@Scope()
get fullName() { return `${this.firstName} ${this.lastName}`; }
```

Cached, re-executes getter on dependency change. For cheap computations, primitives, simple array operations that maintain object identity (filter, sort).

**Emission behavior:** `@Scope` creates a non-greedy scope that emits immediately when dependencies change, without `===` gating. Downstream consumers re-execute regardless of whether the getter returned the same value. The getter returns whatever it computes — `return this.items` preserves reference, `return this.items.filter(...)` produces a new reference. Downstream `data:` bindings use identity-based scope reuse: when the same data object reference appears in the array, its per-item scope is reused and only re-renders if that scope's dependencies changed.

**Granularity matters:** Each `@Scope` getter creates a single cached value. When its dependencies change, ALL downstream consumers re-execute. If the getter creates a new object (filter, composite, etc.), all downstream `data:` bindings see a new reference and update. Use separate `@Scope` getters per independent UI region:

```typescript
// Anti-pattern — single scope for multiple regions
@Scope()
get grouped() {
  return {
    categoryA: items.filter(i => i.category === "A"),
    categoryB: items.filter(i => i.category === "B"),
    categoryC: items.filter(i => i.category === "C"),
  };
}
// Changing one group's data creates a new { categoryA, categoryB, categoryC } object,
// causing all three groups to re-render.

// Correct — one scope per independent region
@Scope() get groupA() { return items.filter(i => i.category === "A"); }
@Scope() get groupB() { return items.filter(i => i.category === "B"); }
@Scope() get groupC() { return items.filter(i => i.category === "C"); }
// Each region reads its own scope. Only affected regions re-render.
```

### @Computed — Cached Getter (Same Reference)

```typescript
@Computed()
get summary() {
  return { total: this.items.reduce((s, i) => s + i.value, 0), count: this.items.length };
}
```

Cached, preserves object identity via `ApplyDiff`. No default value parameter. For creating new objects in getter (filtering/sorting/aggregating data into new structures).

`@Computed` uses `ApplyDiff` to merge changes into the existing object reference. Downstream consumers using `===` comparison (like `gate()` or `data:` bindings) only see a change when actual structure differs, not when the getter re-runs. Use `@Computed` when returning composite objects consumed by multiple UI regions. Prefer per-region `@Scope` when you need granular updates.

### @ComputedAsync — Sync Getter with StoreAsync Backend

```typescript
@ComputedAsync(null)
get userData(): User | null {
  return getUserSync(this.Data.userId); // Must be synchronous — "Async" refers to the StoreAsync backend
}
```

Requires default value parameter. Same reference preservation as `@Computed`. The getter **must be synchronous** — the "Async" in the name refers to the internal `StoreAsync` diffing mechanism, not the getter signature. For async data fetching, use `@Scope() + scope(async)` or `ObservableScope.Create(async)`.

### @Watch — Property Change Handler

```typescript
@Watch((self) => self.count)
handleCountChanged(newValue: number) { console.log("Count:", newValue); }

@Watch((self) => self.Data.value)
onDataChange(newValue: DataType) { /* ... */ }

// Syncing child @Value state with parent Data
@Watch((self) => self.Data.filter)
syncFromParent(newFilter: FilterType): void {
  this.localFilter = newFilter;
}
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
| `arrays (Item[])` | `@State` | Array mutations tracked |
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
| Composite object for multiple consumers | Yes — same ref, sub-property mutations tracked | No — new ref invalidates all consumers | Yes |

**Key:** `@Computed` preserves object identity across updates. Critical when DOM reuse depends on reference stability (e.g., iterating arrays with `data:`).

### Async Patterns

```typescript
// 1. Direct async in services (new reference on each update)
private dataScope = ObservableScope.Create(async () => fetch('/api/data'));
get data(): Data | null { return ObservableScope.Value(this.dataScope); }

// 2. Component async with scope() (new reference on each update)
@Scope()
get CurrentUser() { return scope(async () => fetchUser(`/api/user/${this.userId}`)); }

// 3. @ComputedAsync — sync getter only, StoreAsync backend (same reference via ApplyDiff)
@ComputedAsync(null)
get userData(): User | null { return getUserSync(this.Data.userId); }
```

**Async patterns 1 & 2:** Async functions auto-detected. Automatically sets `greedy: true` (batched updates). Initial value: `null` or Promise. New reference on each update.

**Async limitation:** Dependencies are only captured synchronously. Read all reactive values before the first `await`. Reactive reads after `await` are not tracked.

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
| Async (component) | Component | `@Scope() + scope(async)` |
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
interface ItemTemplate<D> { render: (data: D) => vNode; }

class Container<D> extends Component<{ items: D[] }, ItemTemplate<D>> {
  Template() {
    return div({ data: () => this.Data.items }, (item: D) => this.Templates.render(item));
  }
}

container({ data: () => ({ items: users }) }, { render: (user) => div({}, () => user.name) });
```

Template callbacks are suitable for simple rendering logic with no internal state. When the rendered item needs its own state, lifecycle, or events, use a dedicated component instead:

```typescript
// Callback — no state, no events, no lifecycle
container({ data: () => items }, (item) => div({}, () => item.name));

// Component — full reactivity, events, lifecycle
container({ data: () => items }, (item) =>
  itemCard({ data: () => ({ item }), on: { deleted: (p) => handleDelete(p) } })
);
```

Prefer dedicated components when the item needs internal state (`@Value`, `@State`), fires events, requires `Bound()`/`Destroy()` lifecycle, or injects services.

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

### Choosing Between StoreSync and StoreAsync

Both stores share the same API and flattening model, but differ fundamentally in where and how diffing occurs.

**StoreSync** computes diffs synchronously on the main thread. Writes are immediate and consistent — a value written is readable in the same tick. It has no worker overhead, no serialisation constraints, and no `Destroy()` requirement. Use StoreSync for the vast majority of application state: user data, UI state, app config, form data, and any dataset where diff computation is not a bottleneck. `@Computed` uses `StoreSync` internally.

**StoreAsync** offloads all diff computation to a dedicated Web Worker via a serialised message queue. The worker maintains its own shadow copy of the store state and computes minimal diffs off the main thread, returning only the changed paths. This prevents large dataset operations from blocking rendering or input. Use StoreAsync when diffing genuinely large or deeply nested datasets — message feeds, large tables, real-time data — where synchronous diffing would cause frame drops. `@ComputedAsync` uses `StoreAsync` internally.

**If you are unsure which to use, start with StoreSync.** StoreAsync introduces meaningful constraints (see below) that are only worth accepting when the dataset size justifies off-thread diffing.

| Aspect | StoreSync | StoreAsync |
|--------|-----------|------------|
| Diff execution | Main thread, synchronous | Web Worker, asynchronous |
| Write consistency | Immediate — readable same tick | Eventual — must `await` before reading |
| `keyFunc` constraint | None — can close over outer scope | **Must be self-contained** — serialised via `.toString()` and `eval`'d in worker |
| Data constraint | Any JS value | **JSON-serialisable only** — no class instances, methods, `Date`, `Map`, `Set`, circular refs |
| `Destroy()` required | No | Yes — terminates worker and queue |
| Best for | Most app state | Large / real-time datasets |
| Decorator backend | `@Computed` | `@ComputedAsync` |

### StoreAsync Constraints

StoreAsync's worker is bootstrapped by serialising `keyFunc` and the diff engine as strings and executing them inside a Blob URL. This has two hard constraints:

**1. `keyFunc` must be self-contained — no closed-over variables.**

The function is serialised via `.toString()` and `eval`'d in the worker context. Any variable from the outer scope will be undefined inside the worker.

```typescript
// ❌ Breaks at runtime — prefix is not accessible in the worker
const prefix = "user";
const store = new StoreAsync((val) => val?.id ? `${prefix}_${val.id}` : undefined);

// ✅ Self-contained — no outer scope references
const store = new StoreAsync((val) => val?.id ? `user_${val.id}` : undefined);
```

**2. All data must be JSON-serialisable.**

The worker communicates via `postMessage`, which uses the structured clone algorithm. Class instances with methods, `Date` objects, `Map`, `Set`, `undefined` values, and circular references will be lost or throw.

```typescript
// ❌ Methods and class instances are stripped by structured clone
class Todo { constructor(public id: string, public text: string) {} getText() { return this.text; } }
await store.Write(new Todo("1", "Buy milk"), "todo"); // getText() lost in transit

// ✅ Plain objects only
await store.Write({ id: "1", text: "Buy milk" }, "todo");
```

### Base Store API

```typescript
class Store {
  constructor(keyFunc?: (value: any) => string | undefined);
  Get<O>(id: string): O | undefined;        // Returns undefined if not found
  Get<O>(id: string, defaultValue: O): O;   // Creates and returns default if not found
}
```

### StoreSync API

```typescript
class StoreSync extends Store {
  Write(data: unknown, key?: string): void;
  Patch(key: string, patch: unknown): void;       // Deep merge; throws if key not found
  Push(key: string, ...data: unknown[]): void;
  Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): unknown[];
  // No Destroy() method
}
```

### StoreAsync API

```typescript
class StoreAsync extends Store {
  async Write(data: unknown, key?: string): Promise<void>;
  async Patch(key: string, patch: unknown): Promise<void>;  // Deep merge; throws if key not found
  async Push(key: string, ...data: unknown[]): Promise<void>;
  async Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): Promise<unknown[]>;
  Destroy(): void;  // Always call when service is destroyed — terminates worker
}
```

### keyFunc and Automatic Flattening

`keyFunc` teaches the store how to extract an ID from any object. On `Write` and `Push`, the store eagerly recurses the entire object tree, calling `keyFunc` on each node. Any node that returns a valid ID is registered as an independently addressable entry in the flat internal map. The original shape is preserved because stored objects are `ObservableNode` proxies — nested objects are virtual getters into the flat map rather than copies, which is what allows `Get` to return the original structure while `Patch` operates on individual entries.

This means:
- `Get("todos")` returns the full original shape as an `ObservableNode` proxy tree
- `Patch(id, patch)` can target any registered entry by ID regardless of nesting depth — no need to know where in the hierarchy it lives
- A `Patch` on a nested child is immediately reflected in the parent structure on next `Get`, because the parent `ObservableNode` proxy reads from the same flat map entry
- If the same ID appears multiple times in a tree, the last encountered object wins
- `Patch` performs a deep merge into the located entry

```typescript
// keyFunc extracts the ID from any stored object
const store = new StoreSync((value: any) => value?.id);

// Write a list — each TodoItem is also registered individually by its id
store.Write(todos, "todos");

// Patch a nested TodoItem directly by ID — no need to rewrite the whole list
store.Patch(todo.id, { completed: true });

// Get returns an ObservableNode proxy tree — reflects the patched item immediately
const updated = store.Get<TodoItem[]>("todos", []);
```

If an object has no `id` property (or `keyFunc` returns `undefined`), it is stored only under its explicit key and cannot be targeted by `Patch` without that key.

**Additional key points:**
- Explicit key passed to `Write`/`Push` overrides `keyFunc` for the root object
- Use separate keys for separate data states (`"messages"` vs `"pending-messages"`)
- Always `await` StoreAsync operations before reading back
- Cast `Get()` return value with generics: `Get<Type[]>("key", [])`

### Store Operations Summary

| Operation | StoreSync | StoreAsync |
|-----------|-----------|------------|
| Write | sync | async (Promise) |
| Push | sync | async (Promise) |
| Patch | sync | async (Promise) |
| Splice | sync | async (Promise) |
| Get | sync | sync |
| Destroy | N/A | `Destroy(): void` — required |
| keyFunc constraint | None | Self-contained, no closed-over vars |
| Data constraint | Any JS value | JSON-serialisable only |

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

**Async limitation:** Dependencies are only captured synchronously. Read all reactive values before the first `await`. Reactive reads after `await` are not tracked.

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

// Reactive counter via shared service
class CounterService implements IDestroyable {
  private _count = 0;
  private countScope = ObservableScope.Create(() => this._count, false, true);
  get count() { return ObservableScope.Value(this.countScope); }
  increment() { this._count++; ObservableScope.Update(this.countScope); }
  Destroy(): void { ObservableScope.Destroy(this.countScope); }
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

## Inline Computed Scopes: scope(), gate(), peek()

Three functions for creating memoized computed scopes inline within a watch context (template functions, `@Scope` getters, etc.). All three accept `() => T | Promise<T>` — async callbacks are resolved and the resolved value is emitted.

**Only works within a watch context** — throws if called outside.

### scope() — Full Reactivity

Creates an inline computed scope registered as a dependency of the parent. Emits on every recomputation — no `===` gating.

```typescript
import { scope } from "j-templates";

// Inline computed value
div({ data: () => scope(() => this.Data.items) }, (item) => div({}, () => item.name));

// Async data fetching in a getter
@Scope()
get userData(): User {
  return scope(async () => fetchUser(`/api/user/${this.userId}`));
}
```

### gate() — Emission Gatekeeper

Like `scope()`, but only emits when the value actually changes (`===` comparison). Prevents unnecessary downstream re-evaluations.

```typescript
import { gate } from "j-templates";

// Primitive gating — prevents emission when result unchanged
gate(() => this.Data.count > 10);

// Array reference gating
div({ data: () => gate(() => this.Data.items) }, (item) => div({}, () => item.name));

// Conditional rendering — only re-evaluates when boolean flips, not on every upstream emission.
// Use when the condition shares a children function with other reactive siblings.
gate(() => this.visibleTodos.length === 0)
  ? div({}, () => "No items")
  : div({ data: () => this.visibleTodos }, (item) => ...),

// Multiple gate scopes with custom IDs
gate(() => computeA(), "id-a");
gate(() => computeB(), "id-b");
```

#### When to Use gate()

| Scenario | Use gate()? | Why |
|----------|-------------|-----|
| Condition shares scope with reactive siblings | Yes | Prevents sibling re-render when boolean doesn't flip |
| Conditional rendering (boolean flip) | Yes | Re-evaluates ternary only when value changes true↔false |
| Direct `@State` array access | Optional | Value gating when parent changes |
| Static constant array | No | Never changes, adds overhead |
| Primitive derived state | Yes | `===` prevents unnecessary emissions |
| Parent aggregates multiple values | Yes | Child only cares about specific parts |
| Array transformations (filter/map) | No | Always new references, never helps |
| Multiple uses in same template | Yes | Scope reuse avoids duplicate work |
| Wrapping `@Scope` getter | No | `@Scope` always returns new ref; `===` always differs |

**What gate() does NOT do:** Make arrays reactive (`@State` already does that). Prevent emissions for array transformations (always new refs). Provide object reuse (that's `@Computed`).

`gate()` and `@Scope` are incompatible: `@Scope` returns a new reference on every update, so `gate()`'s `===` comparison always sees a change. If you need both caching and reference stability, use `@Computed()` instead.

### peek() — Read Without Subscribing

Creates a memoized computed scope that does **not** register as a dependency. Use this to read reactive data without the parent scope subscribing to changes.

```typescript
import { peek } from "j-templates";

// Read reactive data without subscribing
const timestamp = peek(() => Date.now());

// Read with custom ID for multiple uses
const id = peek(() => this.Data.id, "id");
const name = peek(() => this.Data.name, "name");
```

`peek()` differs from `gate()` in that the created scope does not register as a dependency. Changes to data accessed within the callback will not trigger recomputation of the parent scope. The scope is still memoized by ID to avoid redundant computation within the same evaluation.

#### Comparison

| Function | Registers dependency | Gates on `===` | Use when |
|----------|---------------------|----------------|----------|
| `scope()` | Yes | No | Full reactivity needed |
| `gate()` | Yes | Yes | Prevent unnecessary downstream updates |
| `peek()` | No | N/A | One-time reads, display-only values |

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

```typescript
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

## Anti-Patterns

| Mistake | Fix |
|---------|-----|
| `@State()` for primitives | Use `@Value()` |
| `@Computed()` for cheap ops | Use `@Scope()` or plain getter |
| `@Computed()` for array filter/sort of existing refs | Use `@Scope()` — identity already preserved |
| Single `@Scope` for multiple independent UI regions | One `@Scope` per region |
| `gate()` wrapping `@Scope` getter | Use `@Computed` or remove `gate()` |
| `data:` binding inside helper function called from `Template()` | Inline in `Template()` with `@Scope` data source |
| `@Scope` read at top of `Template()` | Read inside children function or `data:` binding |
| Render callback for items needing state/events | Use dedicated component |
| Child `@Value` not synced with parent `Data` | Use `@Watch((self) => self.Data.prop)` |
| `.filter(Boolean)` for conditional rendering | Use ternary with `text(() => "")` fallback |
| Condition and sibling `data:` list in same children function | Wrap condition in nested children function, use `data:` boolean, or use `gate()` |
| Assuming framework diffs vNode trees | It doesn't — optimize by minimizing scope emission frequency |

---

## Debugging Reactivity

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Initial render works, updates don't | Direct array mutation | Replace array, don't mutate |
| Template never re-renders | `data:` not a function | Use `data: () => this.state` |
| Getter value stale | Not using `this.Data` | Read from `this.Data` in getter |
| `@Watch` never fires | Missing `super.Bound()` | Call in `Bound()` method |
| Memory leak | Missing cleanup | `@Destroy()` + `super.Destroy()` |
| Input loses focus | Static `props` object | Use `props: () => ({ value })` |
| Entire Template re-runs on small change | `@Scope` read at top of `Template()` | Read scope inside children function or `data:` binding |
| Entire section re-renders on small change | Single `@Scope` feeds multiple regions | Split into per-region `@Scope` getters |
| `gate()` doesn't prevent re-renders | Wrapping `@Scope` getter (always new ref) | Read `@Scope` directly or use `@Computed` |
| `data:` binding re-renders every time | Element created in helper, not `Template()` | Inline element in `Template()` |
| Child form controls don't reflect parent changes | No sync from `this.Data` to `@Value` | Add `@Watch((self) => self.Data.prop)` |
| Conditional re-renders when sibling list updates | Condition and list share same children function scope | Isolate condition into nested children function, `data:` boolean, or `gate()` |
| Expensive Template re-runs on every change | Large vNode subtree subscribed to frequently-changing scope | Split into smaller scopes to reduce rebuild surface |

### Internal Mechanics

- **No vNode Diffing:** The framework does not diff vNode trees. When a scope emits, the children function re-runs, producing new vNodes. The DOM is patched from old to new. Per-item scopes are reused when the same data object reference reappears (identity-based, not key-based).
- **Object Identity:** `@Computed` uses `ApplyDiff` to merge changes into existing references, preventing DOM subtree recreation.
- **StoreAsync Constraints:** Uses Web Workers for diffing; data must be JSON-serializable (no methods or circular references).
- **`gate()` as Circuit Breaker:** Prevents reactivity propagation when result is unchanged (`===`). Ineffective with `@Scope` (always new ref).
- **Scope Types:** `static` (fixed, zero overhead), `dynamic` (tracks deps, caches, emits on change), `greedy` (batched via microtask queue — used for watch callbacks, async).
- **Lazy Initialization:** Scopes created on first access, not construction.
- **Memory Management:** All scopes tracked via WeakMap. `Destroy()` calls `ObservableScope.DestroyAll()` + `@Destroy` properties auto-cleaned.

---

## Scope Selection Decision Tree

Need derived data?
  -> Consumed by one UI region?
     - Yes -> `@Scope()` per region, read inside children function
     - No, multiple regions need different slices?
       - Cheap, same reference (filter/sort of existing array) -> `@Scope()` per region
       - Creating new composite object?
         - Need reference stability across updates -> `@Computed()`
         - Each region independent -> `@Scope()` per region

Where to read a scope in Template()?
  - Top of `Template()` -> subscribes entire Template (avoid unless unavoidable)
  - Inside children function -> subscribes only that subtree (preferred)
  - Inside `data:` binding -> subscribes only that iteration (preferred)

Need conditional rendering?
  - No "else" branch needed -> `data:` boolean (`data: () => this.condition`)
  - "Else" branch needed, condition isolated from siblings -> nested children function with ternary
  - "Else" branch needed, condition shares scope with frequently-changing siblings -> `gate()` ternary

---

## For detailed patterns and examples, see:
- `docs/patterns/01-components.md`
- `docs/patterns/02-reactivity.md`
- `docs/patterns/03-templates-and-data.md`
- `docs/patterns/04-dependency-injection.md`
