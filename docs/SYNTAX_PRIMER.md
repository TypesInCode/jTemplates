# j-templates Syntax Primer — v4

Complete reference for the **j-templates** framework syntax. This documents **j-templates v7.0.98** (see `package.json`). For pattern-oriented guides, see `docs/patterns/`; for step-by-step tutorials, see `docs/tutorials/`.

> **Core concepts:** Components define UI via `Template()`. State decorators (`@Value`, `@State`, `@Computed`) enable reactivity. DOM functions (`div()`, `button()`) create virtual nodes. No compile step, minimal dependencies.

---

## How to Use This Document (for LLMs)

- **Read the Mental Model and Cheat Sheet first.** They encode the single most important idea (no vNode diffing) and a compact summary you can get right from.
- **The Traps section is mandatory reading.** It consolidates the subtle behaviors that cause the most bugs.
- **The Anti-Patterns and Debugging tables are the highest-value reference.** Consult them before writing any component.
- **The complete worked example (Smart Tasks)** exercises the whole stack together — read it once to anchor every concept.
- Internal implementation types are intentionally omitted; you build with DOM functions and decorators, never with raw `vNode` objects.

---

## Mental Model

> **The framework does not diff vNode trees.** When a reactive scope emits, the children function that read it re-runs and produces a brand-new vNode tree. The DOM is then patched from the old tree to the new tree. There is no vNode-to-vNode reconciliation (unlike React's diffing).

This one fact drives every design decision in this framework:

- **Optimization = minimize how often scopes emit**, not how cheap the re-run is.
- A scope read at the top of `Template()` rebuilds the **entire** component tree.
- A scope read inside a children function rebuilds **only that subtree**.
- A scope read inside a `data:` binding rebuilds **only that iteration's vNode**.
- Per-item scopes are **reused by object identity** (not by key) when the same data reference reappears.

**The core loop:** `@Value` → `Template()` → `Component.ToFunction` → `Component.Attach`. Everything else is a refinement.

### ⚠️ The Destructuring Trap

If you've written React, you have a strong instinct to destructure state at the top of a component function — `const { count } = this.state` — because in React the whole component re-renders anyway, so hoisting reads costs nothing.

**In j-templates this instinct is actively harmful.** There is no whole-component re-render on state change — only the specific children function that reads a value re-runs. Hoisting a read to the top of `Template()` forces the *entire* component to behave like React: a full rebuild on every change, defeating the framework's fine-grained reactivity.

```typescript
// ❌ React instinct — do NOT do this in j-templates
Template() {
  const { count } = this.state;        // hoisted read = full-component rebuild
  return div({}, () => `Count: ${count}`);
}

// ✅ j-templates idiom — read inside the function that uses it
Template() {
  return div({}, () => `Count: ${this.count}`);
}
```

**If you find yourself writing `const x = this.something;` before a `return div(...)` in `Template()` — stop. That line is the bug.** This applies equally to `@Scope`/`@Computed` getters and to `this.Data` in components. This rule is referenced throughout the doc as **the Destructuring Trap**.

---

## Cheat Sheet

**Imports**
```typescript
import { Component, scope, gate, peek, mapped } from "j-templates";
import { div, button, input, span, h1, text, fragment, _var } from "j-templates/DOM";
import { Value, State, Computed, ComputedAsync, Scope, Watch, Inject, Destroy, Bound, Animation, AnimationType, IDestroyable } from "j-templates/Utils";
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
import { CreateRootPropertyAssignment, CreateEventAssignment } from "j-templates/DOM";
```

**The core loop**
```typescript
const MyComp = Component.ToFunction("my-comp", MyComponent);   // class → function
Component.Attach(document.body, MyComp({}));                    // mount
Component.Register("my-comp", MyComponent);                     // Web Component (open shadow DOM)
```

**Decorators — one line each**
| Decorator | Use for | Backend | Identity |
|-----------|---------|---------|----------|
| `@Value()` | primitives (`number`/`string`/`boolean`/`null`/`undefined`) | basic scope | — |
| `@State()` | objects & arrays (deep proxy) | ObservableNode proxy | — |
| `@Scope()` | cheap getters, filter/sort of existing refs | single scope | **new ref** |
| `@Computed()` | new composite objects | StoreSync | **same ref** (ApplyDiff) |
| `@ComputedAsync(default)` | sync getter + StoreAsync backend | StoreAsync | **same ref** |
| `@Watch(fn)` | run on property change (fires immediately on `Bound()`) | greedy scope | — |
| `@Inject(Type)` | DI from component injector | — | — |
| `@Destroy()` | auto `.Destroy()` on teardown (needs `IDestroyable`) | — | — |

**The 3 conditional patterns**
```typescript
// 1. Nested children function — isolated scope, use when an "else" branch is needed.
// Note: the "else" branch must return a vNode (text(() => "")), never null/undefined.
div({}, () => this.isLoading ? div({}, () => "Loading") : text(() => ""));

// 2. data: boolean — falsy renders nothing, truthy renders child (no "else")
div({ data: () => this.isLoading }, () => div({}, () => "Loading"));

// 3. gate() — only re-evaluates when boolean flips; shares scope with siblings
gate(() => this.isLoading) ? div({}, () => "Loading") : div({}, () => "Content");

// 4. fragment() — conditional rendering with NO wrapper DOM node
fragment({ data: () => this.isLoading }, () => div({}, () => "Loading"));
```

> **⚠️ `data:` boolean controls *children*, not element existence.** When the value is falsy, the element itself is still created — it just has no children. A styled container (padding, background, border) will still occupy space as an empty box. To remove an element entirely, use pattern 1 (nested children function) or pattern 3 (`gate()`).

**The inline scope functions**
| Function | Registers dependency | Gates on `===` | Use when |
|----------|---------------------|----------------|----------|
| `scope(fn)` | Yes | No | Full reactivity |
| `gate(fn)` | Yes | Yes | Prevent unnecessary downstream updates |
| `peek(fn)` | No | N/A | One-time reads, display-only values |
| `mapped(data, fn)` | Yes (per item) | No | Per-item scopes (advanced; used internally by `data:`) |

**The 3 golden rules**
1. Pass arrays as `data:` — the framework iterates. Don't call `.map()` inside children.
2. Wrap children in functions for separate reactive scopes.
3. Avoid the Destructuring Trap — read scopes at the point of use (inside children functions / `data:` bindings), never at the top of `Template()`.

---

## Quick Start — Minimal Component

```typescript
import { Component } from "j-templates";
import { div, button, text } from "j-templates/DOM";
import { Value } from "j-templates/Utils";

class Counter extends Component {
  @Value() count = 0;

  Template() {
    return div({}, () => [
      text(() => `Count: ${this.count}`),
      button({ on: { click: () => this.count++ } }, () => "Increment"),
    ]);
  }

  Bound() { super.Bound(); }
  Destroy() { super.Destroy(); }
}

const CounterFn = Component.ToFunction("my-counter", Counter);
Component.Attach(document.body, CounterFn({}));
```

---

## Complete Worked Example — Smart Tasks

> This is a trimmed version of the real example at `examples/smart-tasks/src/`. It exercises the full stack: `@State`, `@Value`, `@Scope`, `@Computed`, plain reactive getters, parent→child data, child→parent events, `data:` iteration, conditional rendering, and two-way binding. Read it once to anchor every concept below.

**`types.ts`**
```typescript
export interface Task { id: string; text: string; completed: boolean; }
export type FilterType = "all" | "active" | "completed";
```

**`app.ts`** — the root component
```typescript
import { Component } from "j-templates";
import { Value, State } from "j-templates/Utils";
import { div, h1, span, text } from "j-templates/DOM";
import { taskInput } from "./task-input";
import { taskItem } from "./task-item";
import { filterBar } from "./filter-bar";
import { statsBar } from "./stats-bar";
import { Task, FilterType } from "./types";

let nextId = 1;

class App extends Component {
  @State() tasks: Task[] = [];          // complex state → deep proxy
  @Value() filter: FilterType = "all";  // primitive state → lightweight

  // Plain getter — reactive because it reads @State/@Value values.
  // No decorator needed for simple derived reads.
  get filteredTasks(): Task[] {
    switch (this.filter) {
      case "active": return this.tasks.filter((t) => !t.completed);
      case "completed": return this.tasks.filter((t) => t.completed);
      default: return this.tasks;
    }
  }

  private handleAdd(payload: { text: string }): void {
    this.tasks.push({ id: String(nextId++), text: payload.text, completed: false });
  }
  private handleToggle(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.completed = !task.completed;   // @State proxy → direct mutation works
  }
  private handleDelete(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) this.tasks.splice(idx, 1);
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      h1({}, () => "Smart Tasks"),

      // Parent → child data (read-only in child)
      statsBar({ data: () => ({ tasks: this.tasks }) }),

      // Child → parent event
      taskInput({ on: { add: (p) => this.handleAdd(p) } }),

      filterBar({
        data: () => ({ activeFilter: this.filter }),
        on: { filterChange: (p) => { this.filter = p.filter; } },
      }),

      // Conditional rendering — isolated scope. Only this div re-evaluates
      // when tasks/filteredTasks/filter change. Siblings are unaffected.
      div({}, () => {
        if (this.tasks.length === 0) return div({}, () => "No tasks yet");
        if (this.filteredTasks.length === 0) return div({}, () => "No tasks match this filter.");
        return text(() => "");
      }),

      // data: binding — framework iterates. Each item gets its own scope,
      // so toggling one task does not re-render the others.
      div({ props: { className: "task-list" }, data: () => this.filteredTasks },
        (task: Task) =>
          taskItem({
            data: () => task,
            on: {
              toggle: () => this.handleToggle(task.id),
              delete: () => this.handleDelete(task.id),
            },
          }),
      ),
    ]);
  }
}

const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));
```

**`task-item.ts`** — child component with events
```typescript
import { Component } from "j-templates";
import { div, span } from "j-templates/DOM";
import { Task } from "./types";

export interface TaskItemEvents { toggle: { id: string }; delete: { id: string }; }

class TaskItem extends Component<Task, void, TaskItemEvents> {
  Template() {
    return div({
      props: () => ({ className: this.Data.completed ? "task-item completed" : "task-item" }),
    }, () => [
      div({
        props: () => ({ className: this.Data.completed ? "task-check checked" : "task-check" }),
        on: { click: () => this.Fire("toggle", { id: this.Data.id }) },
      }),
      span({ props: { className: "task-text" } }, () => this.Data.text),
      div({
        props: { className: "task-delete" },
        on: { click: () => this.Fire("delete", { id: this.Data.id }) },
      }, () => "\u00d7"),
    ]);
  }
}
const taskItem = Component.ToFunction("task-item", TaskItem);
export { taskItem };
```

**`task-input.ts`** — two-way binding via reactive props
```typescript
import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, input, button } from "j-templates/DOM";

export interface TaskInputEvents { add: { text: string }; }

class TaskInput extends Component<void, void, TaskInputEvents> {
  @Value() text: string = "";

  private handleAdd(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.Fire("add", { text: trimmed });
    this.text = "";
  }

  Template() {
    return div({ props: { className: "task-input" } }, () => [
      input({
        props: () => ({ value: this.text, placeholder: "What needs doing?", type: "text" as const }),
        on: {
          input: (e: Event) => { this.text = (e.target as HTMLInputElement).value; },
          keydown: (e: KeyboardEvent) => { if (e.key === "Enter") this.handleAdd(); },
        },
      }),
      button({ props: () => ({ disabled: this.text.trim() === "" }), on: { click: () => this.handleAdd() } }, () => "Add"),
    ]);
  }
}
const taskInput = Component.ToFunction("task-input", TaskInput);
export { taskInput };
```

**`stats-bar.ts`** — `@Scope` vs `@Computed`
```typescript
import { Component } from "j-templates";
import { Scope, Computed } from "j-templates/Utils";
import { div, span } from "j-templates/DOM";
import { Task } from "./types";

interface StatsBarData { tasks: Task[]; }

class StatsBar extends Component<StatsBarData> {
  // @Scope — cheap derived values, new reference each update.
  @Scope() get total(): number { return this.Data.tasks.length; }
  @Scope() get activeCount(): number { return this.Data.tasks.filter((t) => !t.completed).length; }
  @Scope() get completedCount(): number { return this.Data.tasks.filter((t) => t.completed).length; }

  // @Computed — composite object, SAME reference preserved via ApplyDiff.
  @Computed()
  get summary(): { active: number; completed: number; total: number; pct: string } {
    const t = this.total;
    const c = this.completedCount;
    return { total: t, active: this.activeCount, completed: c, pct: t === 0 ? "0%" : `${Math.round((c / t) * 100)}%` };
  }

  Template() {
    return div({ props: { className: "stats-bar" } }, () => [
      span({}, () => `${this.activeCount} active`),
      span({}, () => `${this.completedCount} completed`),
      span({}, () => `${this.summary.pct} done`),
    ]);
  }
}
const statsBar = Component.ToFunction("stats-bar", StatsBar);
export { statsBar };
```

**What to notice:**
- `@State` arrays support **direct mutation** (`push`, `splice`, `task.completed = ...`) because they're proxies. Plain arrays would need reassignment.
- The plain getter `filteredTasks` needs **no decorator** — it's reactive because it reads `@State`/`@Value` values.
- `@Scope` for cheap per-region derived values; `@Computed` for a composite object consumed by multiple spans.
- `data:` is passed **raw** to components (`this.Data`), but **iterated** for DOM elements.
- Events flow child→parent via `Fire()` + `on:`; data flows parent→child via `data:`.

---

## Imports & Setup

```bash
npm install j-templates
```

**tsconfig.json** requires `"experimentalDecorators": true, "useDefineForClassFields": false`.

**File naming:** Components: kebab-case (`todo-list.ts`). Services: kebab-case + `-service` suffix. Exports: lowercase matching filename.

**Public entry points:**

| Import path | Exports |
|-------------|---------|
| `j-templates` | `Component`, `scope`, `gate`, `peek`, `mapped` |
| `j-templates/DOM` | all DOM functions (`div`, `span`, `text`, `_var`, …), `CreateRootPropertyAssignment`, `CreateEventAssignment` |
| `j-templates/Utils` | `Value`, `State`, `Computed`, `ComputedAsync`, `Scope`, `Watch`, `Inject`, `Destroy`, `Bound`, `Animation`, `AnimationType`, `IDestroyable` |
| `j-templates/Store` | `StoreSync`, `StoreAsync`, `ObservableScope`, `ObservableNode` |

> ⚠️ **`Injector` is NOT exported from any public entry point.** It exists internally but is never re-exported. Use `@Inject` and `this.Injector` on components instead of importing `Injector` directly.

### DOM Functions

Layout: `div`, `span`, `section`, `article`, `aside`, `nav`, `main`, `header`, `footer`, `hr`, `blockquote`, `address`

Headings: `h1`–`h6`

Text: `p`, `a`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `ins`, `sub`, `sup`, `mark`, `small`, `label`, `pre`, `code`, `kbd`, `samp`, `_var`, `cite`, `q`, `abbr`, `time`, `dfn`, `rt`, `rp`

Lists: `ul`, `ol`, `li`, `dl`, `dt`, `dd`

Tables: `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `col`, `colgroup`

Forms: `form`, `input`, `textarea`, `button`, `select`, `option`, `optgroup`, `fieldset`, `legend`, `datalist`, `output`, `progress`, `meter`

Media: `img`, `figure`, `figcaption`, `picture`, `source`, `audio`, `video`, `track`, `embed`, `object`, `param`, `iframe`

Interactive: `details`, `summary`, `dialog`, `menu`

Scripting: `canvas`, `svg`, `map`, `area`

Meta: `template`, `slot`

Text node: `text`

Fragment: `fragment` (no DOM node — children reconcile into the real ancestor)

No SVG element functions are exported. Use `Component.ToFunction` with a namespace for custom SVG components. Note that the `svg` element function itself creates an **HTML-namespace** `<svg>` element (no SVG namespace), so it is not suitable for inline SVG rendering — use a namespaced `Component.ToFunction` instead.

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

> **Components don't own the host.** There is no framework support for interacting with the host element. To attach native DOM listeners (focus, scroll, resize, etc.), attach them to a root element you define in `Template()` — not to `this.VNode.node`.

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

    // 3. gate() — only re-evaluates when boolean flips; use when the condition
    //    shares a children function with other reactive siblings
    gate(() => this.isLoading) ? div({}, () => "Loading") : div({}, () => "Content"),

    // Child component
    childComponent({ data: () => ({ id: 1 }) }),

    // Reactive text node
    text(() => `Count: ${this.count}`),

    // Bare string as the sole children-function return value — valid per
    // vNodeChildrenFunction<T>, and equivalent to using text() as the only child.
    div({}, () => `Count: ${this.count}`),

    // Raw HTML (use innerHTML prop, NOT { __html: })
    div({ props: { innerHTML: "<strong>Bold</strong>" } }),

    // Mixed text + elements (use text(), not plain strings in arrays)
    text(() => "Click "), button({}, () => "here"), text(() => " to continue")
  ]);
}
```

### data: Binding Behavior

> **🔑 Key Insight:** `data:` binding behavior differs fundamentally between DOM elements and components. **DOM elements:** framework iterates/wraps/short-circuits. **Components:** raw passthrough as `this.Data`.

#### DOM Elements

| Return Value | Behavior |
|--------------|----------|
| `[]` | No children rendered |
| `[a, b, c]` | Iterates, renders child for each item |
| `{ id: 1 }` | Wraps as `[{ id: 1 }]`, renders once |
| `"text"` / `123` | Wraps as `[value]`, renders once |
| `true` | Wraps as `[true]`, renders child once |
| `false` / `null` / `undefined` | Returns `[]`, no children rendered |

> ⚠️ **Falsy edge case:** the falsy-collapse rule applies broadly — **`0`, `""`, and `NaN` also collapse to `[]`**, not just `false`/`null`/`undefined`. Only *truthy* non-array values are wrapped as `[value]`.

**Also accepts** `Promise<T>` and `Promise<T[]>` for async data. While a Promise is pending, the scope evaluates to `null` (falsy), so the element renders nothing until resolved — there is no built-in placeholder; implement one yourself if needed.

The `false`/`true` behavior makes `data:` a clean conditional rendering mechanism. **The child function is invoked with the truthy value as its data argument** — e.g. `data: () => this.isLoading` calls the child with `true` when loading. It renders its child once when true and nothing when false, with its own isolated reactive scope.

**Reordering:** when the array itself changes order (e.g. `.sort()`, `.reverse()`) without changing which object references it contains, each item's existing DOM node and per-item scope move to the new position rather than being destroyed and recreated. Only genuinely new or removed references trigger create/destroy.

#### Components

Components receive the raw return value as `this.Data` — no iteration, no wrapping, no `false`/`null` short-circuit.

| Return Value | `this.Data` in component |
|--------------|--------------------------|
| `[a, b, c]` | `[a, b, c]` — component must iterate itself |
| `{ id: 1 }` | `{ id: 1 }` — passed as-is |
| `"text"` | `"text"` — passed as-is |
| `false` / `null` / `undefined` | The actual value — component decides how to handle |
| `Promise<T>` | Resolved by the scope — `this.Data` is the resolved value, or `null` while pending |

```typescript
// DOM element: framework iterates and renders a child per item
div({ data: () => this.tasks }, (task) => div({}, () => task.name));

// Component: data passes through as this.Data — no framework iteration
taskList({ data: () => ({ tasks: this.tasks }) });
// Inside TaskList: this.Data.tasks — component manages its own iteration
```

**Why the difference:** DOM elements are leaf nodes — the framework owns their rendering. Components have their own `Template()` method and full control over how data is consumed, so the framework treats `data:` as a reactive property passthrough, not an iteration instruction.

### Fragment Elements

`fragment()` creates a **container with no DOM node**. Its children are reconciled directly into the nearest real ancestor element. Use it when you need a reactive scope or a `data:` iteration but don't want an extra wrapper element in the DOM.

```typescript
import { fragment } from "j-templates/DOM";

// Conditional rendering with no wrapper node — the ternary is its own scope
fragment({ data: () => this.show }, (show) =>
  show === "admin" ? div({}, () => "ADMIN") : div({}, () => "LOGIN"),
);

// Iteration with no wrapper node
fragment({ data: () => this.items }, (item) => div({}, () => item.name));

// Nested fragments flatten into the real ancestor
fragment({}, () => [
  div({}, () => "OUTER"),
  fragment({}, () => (this.showExtra ? div({}, () => "EXTRA") : div({}, () => "BASE"))),
]);
```

Key behaviors:
- **No DOM node.** `fragment()` produces no element; its children are inserted directly into the parent. A falsy `data:` value renders *nothing* — there is no empty wrapper box left behind (unlike a `div` with a `data:` boolean, which keeps the element in the DOM).
- **`data:` behaves like any DOM element** — iterates arrays, wraps truthy scalars, collapses falsy values to nothing.
- **Nesting is fine** — fragments inside fragments flatten into the real ancestor.
- **Cannot be attached directly.** A fragment has no node to attach; wrap it in a real element (e.g. `div`) before attaching to the DOM.

### Key Template Rules

1. **Pass arrays as `data:`** — framework iterates automatically. Don't call `.map()` inside children.
2. **Wrap children in functions** for separate reactive scopes. Without function wrapper, all children share parent scope.
3. **Two-way binding requires reactive props**: `props: () => ({ value: this.text })` (not static `props: { value: this.text }` which causes focus loss).
4. **Conditional rendering** — choose a pattern based on isolation needs. The most common mistake is reading a condition and a sibling `data:` list in the same children function — when either changes, both re-render.

```typescript
// Anti-pattern: condition and list share a children function scope.
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

5. **`text()` for reactive text nodes when mixing with other vNodes** — a children function may return a bare string directly when it is the *sole* child (e.g. `div({}, () => \`Count: ${this.count}\`)`), which is equivalent to using `text()` as the only child. The constraint is specifically about *arrays*: never mix a plain string into an array alongside other vNodes — use `text()` for each string segment in that case.
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

7. **Avoid the Destructuring Trap — read `@Scope` getters at the point of use.** See Mental Model. Reading a `@Scope` at the top of `Template()` registers it as a dependency of the entire Template. Reading it inside a children function or `data:` binding keeps the subscription scoped to that subtree.
8. **Same applies to `this.Data` in components.** Reading `this.Data` at the top of `Template()` subscribes the entire component to the parent's data scope. Any parent data change rebuilds the entire Template. Read `this.Data` inside children functions, `props:` functions, or `data:` bindings to scope reactivity to specific DOM subtrees.

```typescript
// Anti-pattern — this.Data read at top of Template()
Template() {
  const task = this.Data;              // Subscribes entire Template
  return div({}, () => [
    span({}, () => task.name),         // Any parent data change rebuilds ALL
    span({}, () => task.status),
  ]);
}

// Correct — this.Data read inside children function
Template() {
  return div({}, () => [
    span({}, () => this.Data.name),    // Only this subtree re-renders
    span({}, () => this.Data.status),  // Only this subtree re-renders
  ]);
}

// Also correct — in props: reactive function
Template() {
  return div({ props: () => ({ className: this.Data.active ? "active" : "" }) }, () =>
    "Content"
  );
}
```

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

---

## How Updates Propagate

> **🔑 Key Insight:** The framework does **not** diff vNode trees. When a scope emits, the children function re-runs and produces new vNodes. DOM is patched from old to new. Optimization comes from minimizing *how often* scopes emit, not making the re-run cheap.

When a reactive scope emits, only the children functions that read it re-run, producing new vNodes for that subtree — everything else is untouched. DOM nodes are reused when the new vNode is the same object reference as the old one (this is why `@Computed`'s identity preservation matters — see below); a new reference always creates a new DOM node. Text content is updated in place rather than replaced.

This means:
- A scope read at the top of `Template()` rebuilds the entire component vNode tree.
- A scope read inside a children function rebuilds only that subtree.
- A scope read inside a `data:` binding rebuilds only that iteration's vNode.
- Per-item scopes are reused when the same data object reference reappears (identity-based, not key-based); reordering an array of existing references moves nodes rather than recreating them.

The optimization goal is minimizing **how often** children functions re-run through fine-grained scopes, not making the re-run itself cheap.

---

## State Decorators

All decorators are for **Component classes only**. Services must use `ObservableScope`/`Store` APIs directly.

### @Value — Primitive State

```typescript
@Value() count: number = 0;
@Value() isLoading: boolean = false;
```

Lightweight, no proxy. For `number`, `string`, `boolean`, `null`, `undefined`. Backed by a `basic` scope (`ObservableScope.Basic`).

**When NOT to use:** for objects or arrays — use `@State()` instead (deep reactivity).

### @State — Complex State

```typescript
@State() user: { name: string } = { name: "" };
@State() items: Item[] = [];
```

Deep reactivity via proxy (`ObservableNode.Create`). For objects with nested properties and arrays. **Array mutations (`push`, `splice`, item property writes) are tracked** — see the Smart Tasks example.

**When NOT to use:** for primitives — `@State()` creates a proxy, leaf scopes, and caches for no benefit; use `@Value()`.

### @Scope — Cached Getter (New Reference)

```typescript
@Scope()
get fullName() { return `${this.firstName} ${this.lastName}`; }
```

Cached, re-executes getter on dependency change. For cheap computations, primitives, simple array operations that maintain object identity (filter, sort). Backed by a non-greedy single scope (`ObservableScope.Create`).

**Emission behavior:** `@Scope` creates a non-greedy scope. When a dependency changes, the scope **emits** (notifies consumers) but does **not** re-evaluate the getter immediately — the getter re-runs lazily on the **next read** of the scope. There is no `===` gating: downstream consumers re-execute regardless of whether the getter returns the same value. The getter returns whatever it computes — `return this.items` preserves reference, `return this.items.filter(...)` produces a new reference. Downstream `data:` bindings use identity-based scope reuse: when the same data object reference appears in the array, its per-item scope is reused and only re-renders if that scope's dependencies changed.

> **Emit ≠ recompute.** An `@Scope` emit only notifies consumers; the value is recomputed on the next read. This differs from `@Computed`, whose `StoreSync` backend recomputes eagerly on emit (pulling from the source) so it can `ApplyDiff` in place. Both are created lazily on first read.

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

**When NOT to use:** for composite objects consumed by multiple regions (new ref invalidates all consumers) — use `@Computed()`; and never wrap a `@Scope` in `gate()` (always-new-ref defeats `===`).

### @Computed — Cached Getter (Same Reference)

```typescript
@Computed()
get summary() {
  return { total: this.items.reduce((s, i) => s + i.value, 0), count: this.items.length };
}
```

Cached, preserves object identity via `ApplyDiff`. No default value parameter. For creating new objects in getter (filtering/sorting/aggregating data into new structures). Backed by `StoreSync`.

`@Computed` uses `ApplyDiff` to merge changes into the existing object reference. Downstream consumers using `===` comparison (like `gate()` or `data:` bindings) only see a change when actual structure differs, not when the getter re-runs. Use `@Computed` when returning composite objects consumed by multiple UI regions. Prefer per-region `@Scope` when you need granular updates.

> **`@Computed` returns a copy, not the source reference.** The getter's result is copied into a new reactive object whose identity is preserved across updates. It is a distinct object from whatever the getter read. Consequently, changes to the *source* object do not fire on the copy — the copy only re-evaluates when its own source dependencies change. If you need downstream consumers to observe mutations to an existing reactive object directly, use `@Scope` (which passes the existing reference through) instead.

> **Recompute timing.** `@Computed`'s `StoreSync` backend is created lazily on first read; after that it recomputes eagerly on emit (pulling from the source). This contrasts with `@Scope`, which re-evaluates lazily on the next read.

**Dependency tracking note:** `@Computed` registers dependencies based on what properties the getter accesses through the proxy. If the getter returns `this.tasks` without iterating or reading individual item properties, per-item mutations (e.g., `task.completed = true`) won't trigger re-evaluation. The getter must touch every reactive property it intends to track — `.filter()`, `.map()`, `.reduce()`, and manual property reads all register deps. Returning the array reference alone only tracks array-level mutations (push, splice, reassignment).

**When NOT to use:** for cheap ops or array filter/sort of existing refs — use `@Scope()` or a plain getter (identity already preserved, less overhead).

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

Fires immediately with initial value when `Bound()` runs, then on each change. Subscription auto-cleaned on `Destroy()`. Uses a greedy (batched) scope (`ObservableScope.Gated`) — multiple synchronous changes to the watched value within the same tick are debounced into a single callback invocation, firing once with the latest value.

**When NOT to use:** for values you only read in `Template()` — reading a scope there is already reactive; `@Watch` is for side effects (syncing state, logging, triggering external calls).

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

## Scope Selection Decision Tree

Need derived data?
  -> Is it a simple read from `this.Data` without computation?
     - Yes -> No decorator needed — plain getter. Reading `this.Data` is already reactive.
        - Read it inside children function, `props:` function, or `data:` binding for scoped subscriptions
  -> Consumed by one UI region?
     - Yes -> `@Scope()` per region, read inside children function
     - No, multiple regions need different slices?
       - Cheap, same reference (filter/sort of existing array) -> `@Scope()` per region
       - Creating new composite object?
         - Need reference stability across updates -> `@Computed()`
         - Each region independent -> `@Scope()` per region

Where to read a scope in Template()?
  - Avoid the Destructuring Trap (see Mental Model): don't hoist reads to the top of `Template()`.
  - Inside children function -> subscribes only that subtree (preferred)
  - Inside `data:` binding -> subscribes only that iteration (preferred)

Need conditional rendering?
  - No "else" branch needed -> `data:` boolean (`data: () => this.condition`)
  - "Else" branch needed, condition isolated from siblings -> nested children function with ternary
  - "Else" branch needed, condition shares scope with frequently-changing siblings -> `gate()` ternary

---

## Inline Computed Scopes: scope(), gate(), peek(), mapped()

Four functions for creating memoized computed scopes inline within a watch context (template functions, `@Scope` getters, etc.). All accept `() => T | Promise<T>` — async callbacks are resolved and the resolved value is emitted.

**Watch context** includes children functions, `data:`/`props:`/`attrs:` functions, `@Scope`/`@Computed`/`@ComputedAsync` getters, and `@Watch` callbacks. It does **not** include `on:` event handlers, which run outside reactive evaluation. Calling `scope()`/`gate()`/`peek()`/`mapped()` outside a watch context throws (e.g. `scope() must be called within a watch context`).

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
gate(() => this.visibleTodos.length === 0)
  ? div({}, () => "No items")
  : div({ data: () => this.visibleTodos }, (item) => ...),

// Multiple gate scopes with custom IDs
gate(() => computeA(), "id-a");
gate(() => computeB(), "id-b");

> **⚠️ ID collision is per-scope.** The custom ID only disambiguates multiple `scope()`/`gate()`/`peek()` calls **within the same ObservableScope definition** (one watch context). If you call the same helper twice in one watch context without IDs, the second call silently resolves to the first scope. IDs are not global — two calls in different components/scopes never collide.
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

#### Empty state vs. list — the canonical `gate()` pattern

The most common real-world use of `gate()` is choosing between an empty-state
message and a `data:` list, where the two must be mutually exclusive (never both
in the DOM):

```typescript
div({}, () =>
  gate(() => this.visibleTodos.length === 0)
    ? div({}, () => "No items")
    : div({ data: () => this.visibleTodos }, (item) => div({}, () => item.name)),
)
```

**Why `gate()` and not a nested children function?** The wrapper children
function reads `this.visibleTodos.length`. Without `gate()`, *every* change to
`visibleTodos` (e.g. toggling one item while the list stays non-empty) re-runs
the wrapper and rebuilds the whole subtree. `gate()` only emits when the boolean
flips, so the ternary is not re-evaluated on those upstream emissions. The list
still updates correctly because its `data: () => this.visibleTodos` binding has
its own reactive scope that subscribes to `visibleTodos` directly — independent
of the wrapper.

**Why not `data:` boolean?** `data:` boolean only controls the element's
*children*; the element itself stays in the DOM. A styled empty-state container
would remain visible as an empty box. `gate()` (or a nested children function)
actually removes the element.

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

### mapped() — Per-Item Scopes (Advanced)

`mapped(data, callback, onUpdated?, onDestroyed?)` creates a per-item scope for a single data value. This is the mechanism `data:` uses internally — array iteration is effectively `array.map(item => mapped(item, callback))`, one `mapped()` call per item, keyed by object identity. Only needed for advanced manual per-item scoping.

```typescript
import { mapped } from "j-templates";

mapped(data, (d) => /* ... */, (lastValue, scope) => /* onUpdated */, (lastValue) => /* onDestroyed */);
```

Signature:

```typescript
function mapped<D, T>(
  data: D,
  callback: (data: D) => T | Promise<T>,
  onUpdated?: (lastValue: T, scope: IObservableScope<T>) => void,
  onDestroyed?: (lastValue: T) => void
): T
```

- `data` is a **single** value — there is no array-iterating form. Iterate arrays with `data:` on a DOM element instead.
- `onUpdated` fires when the per-item scope's value changes.
- `onDestroyed` fires when the per-item scope is torn down.
- Like the other inline scopes, `mapped()` must be called within a watch context.

#### Comparison

| Function | Registers dependency | Gates on `===` | Use when |
|----------|---------------------|----------------|----------|
| `scope()` | Yes | No | Full reactivity needed |
| `gate()` | Yes | Yes | Prevent unnecessary downstream updates |
| `peek()` | No | N/A | One-time reads, display-only values |
| `mapped()` | Yes (per item) | No | Per-item scopes (advanced) |

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

> ⚠️ The `Injector` class is **not exported** from the package's public entry points. The API below documents its behavior for understanding `@Inject` and `this.Injector`; do not import `Injector` directly.

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

**StoreAsync** offloads all diff computation to a dedicated Web Worker via a serialised message queue, computing minimal diffs off the main thread so large dataset operations don't block rendering or input. Use StoreAsync when diffing genuinely large or deeply nested datasets — message feeds, large tables, real-time data. `@ComputedAsync` uses `StoreAsync` internally.

**If you are unsure which to use, start with StoreSync.** StoreAsync introduces meaningful constraints (see below) that are only worth accepting when the dataset size justifies off-thread diffing.

| Aspect | StoreSync | StoreAsync |
|--------|-----------|------------|
| Diff execution | Main thread, synchronous | Web Worker, asynchronous |
| Write consistency | Immediate — readable same tick | Eventual — must `await` before reading |
| `keyFunc` constraint | None — can close over outer scope | **Must be self-contained** — serialised and executed in worker |
| Data constraint | Any JS value | **JSON-serialisable only** — no class instances, methods, `Date`, `Map`, `Set`, circular refs |
| `Destroy()` required | No | Yes — terminates worker and queue |
| Best for | Most app state | Large / real-time datasets |
| Decorator backend | `@Computed` | `@ComputedAsync` |

### StoreAsync Constraints

StoreAsync's worker is bootstrapped by serialising `keyFunc` and the diff engine and executing them in a worker context. This has two hard constraints:

**1. `keyFunc` must be self-contained — no closed-over variables.**

The function is serialised and evaluated in the worker context. Any variable from the outer scope will be undefined inside the worker.

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
  Create<T>(valueFunction: { (): T | Promise<T> }): IObservableScope<T>;   // Non-greedy scope
  Gated<T>(valueFunction: { (): T | Promise<T> }): IObservableScope<T>;    // Greedy scope (batches via microtask)
  Basic<T>(valueFunction: { (): T }): IBasicObservableScope<T>;            // Direct-value scope; no dep tracking, no cache — Update() to emit
  Value<T>(scope: IObservableScope<T>): T;          // Get value + register dependency
  Peek<T>(scope: IObservableScope<T>): T;           // Get value without registering dependency
  Touch<T>(scope: IObservableScope<T>): void;       // Register as dependency without reading value
  Watch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;
  Unwatch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>): void;
  OnUpdated<T>(scope: IObservableScope<T>, callback: (lastValue: T, scope: IObservableScope<T>) => void): void;
  OnDestroyed(scope: IObservableScope<unknown>, callback: EmitterCallback): void;
  Update(scope: IObservableScope<any>): void;       // Mark dirty, triggers recomputation
  Register(emitter: Emitter): void;
  Destroy<T>(scope: IObservableScope<T>): void;
  DestroyAll(scopes: IObservableScope<unknown>[]): void;
}
```

**Async limitation:** Dependencies are only captured synchronously. Read all reactive values before the first `await`. Reactive reads after `await` are not tracked.

**Static scope edge case:** `Create` returns a *static* scope when its valueFunction reads no
reactive dependencies (no `@Value`/`@State`/other scope reads). Static scopes do **not** emit when
passed to `Update` — reactivity silently breaks with no error. If you need a manually-updatable
scope whose value doesn't derive from reactive state, use `Basic` instead, which always emits on
`Update`.

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
// NOTE: _count is a plain field (not reactive), so Create() would yield a static scope that
// ignores Update(). Use Basic() for manually-updatable scopes.
class CounterService implements IDestroyable {
  private _count = 0;
  private countScope = ObservableScope.Basic(() => this._count);
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
  Clone<T>(value: T): T;                                        // Strip proxies into plain data (mutates plain objects in place)
  Update(value: unknown, prop?: string | number): void;         // Manually trigger change on a node/property
  Apply(rootNode: any, value: any): void;                       // Merge a full value in-place, preserving identity (public)
  ApplyDiff(rootNode: any, diffResult: JsonDiffResult): void;   // Apply diff in-place (internal — used by Store/@Computed)
  CreateFactory(alias?: (value: any) => any | undefined): <T>(value: T) => T;  // Factory with aliasing
}
```

**`Apply` vs `ApplyDiff`:** `Apply(rootNode, value)` merges a full replacement value into an observable node in-place, preserving the node's reference (so `===` checks and DOM reuse stay stable). Use this when you want to update an observable node in place — assigning a property directly on an observable node does **not** generate a diff. `ApplyDiff` is internal-only (used by `StoreSync`/`StoreAsync`/`@Computed`) — ignore it.

**Array operations on ObservableNode proxies:** `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` — all trigger reactive updates.

---

## Testing

The standard setup is **Vitest + JSDOM**, which provides browser-like globals (`document`, DOM node classes, etc.) so components can be attached and inspected without a real browser.

Set **`SYNC_SCHEDULING=true`** to make reactive updates apply synchronously — a state mutation is reflected in the DOM immediately, with no `flush()`/`await` step needed before asserting. This is the default for standard test runs. Omit it only when a test specifically needs to verify real async or batching timing (e.g. confirming `@Watch` debounces multiple synchronous writes into one call, or that an async scope resolves correctly across a microtask boundary) — with `SYNC_SCHEDULING` on, that behavior collapses and can't be observed.

---

## Traps & Gotchas

These are the subtle behaviors that cause the most bugs. Read this before writing components.

1. **No vNode diffing.** The framework never reconciles vNode trees. A scope emission re-runs the children function and rebuilds its subtree. Optimize by minimizing emission frequency, not re-run cost.
2. **Async dependencies are captured synchronously only.** Read all reactive values before the first `await`. Reads after `await` are not tracked.
3. **`data:` collapses ALL falsy non-array values to `[]`** — `false`, `null`, `undefined`, **and `0`, `""`, `NaN`**. Only truthy non-array values wrap as `[value]`.
4. **`data:` boolean renders the element, not nothing.** A falsy `data:` value removes the element's *children*, but the element itself stays in the DOM. A styled container (padding/background/border) will still show as an empty box. To remove an element entirely, use a nested children function or `gate()`.
5. **`@ComputedAsync` is a *sync* getter.** The "Async" refers to the `StoreAsync` backend, not the getter signature. For real async, use `@Scope() + scope(async)` or `ObservableScope.Create(async)`.
6. **`gate()` is incompatible with `@Scope`.** `@Scope` returns a new reference every update, so `gate()`'s `===` always sees a change. Use `@Computed()` for reference stability.
7. **Per-item scope reuse is identity-based, not key-based.** The same data object reference reuses its scope; a new reference creates a new scope. Reordering an array of existing references moves the DOM node and scope to the new position rather than recreating them.
8. **`@Watch` fires immediately on `Bound()`** with the initial value — not just on changes. Missing `super.Bound()` means `@Watch` never fires. Multiple synchronous changes in the same tick are debounced into a single callback.
9. **`@State` arrays support direct mutation** (`push`, `splice`, item property writes) because they're proxies. Plain arrays require reassignment.
10. **`@Computed` only tracks what the getter touches.** Returning `this.tasks` without reading item properties won't re-trigger on per-item mutations. Touch every property you track.
11. **`scope()`/`gate()`/`peek()`/`mapped()` throw outside a watch context.** They must be called inside a children function, `data:`/`props:`/`attrs:` function, `@Scope`/`@Computed`/`@ComputedAsync` getter, or `@Watch` callback — not inside `on:` event handlers.
12. **`Injector` is not publicly exported.** Use `@Inject` and `this.Injector` on components.
13. **StoreAsync data must be JSON-serialisable** and `keyFunc` must be self-contained (no closed-over variables). Always `await` StoreAsync writes before reading.
14. **Two-way binding needs reactive props** (`props: () => ({ value })`). A static `props: { value }` object causes input focus loss.
15. **The Destructuring Trap.** Reading a scope or `this.Data` at the top of `Template()` subscribes the whole component — the React instinct to hoist state reads is backwards here. Read scopes inside children functions or `data:` bindings for fine-grained updates. See Mental Model.
16. **`scope()`/`gate()`/`peek()` ID collisions are per-scope.** Multiple calls to the same helper in one watch context without IDs silently resolve to the first scope. Provide distinct IDs when calling the same helper more than once in a single ObservableScope definition.
17. **`IsAsync` only detects the `async` keyword.** A function that *returns* a Promise but is not declared `async` (e.g. `() => fetch(...)`) is treated as synchronous — the scope stores the Promise as its value instead of resolving it. Always write `async () => ...` for async scopes.
18. **`fragment()` has no DOM node.** It cannot be attached directly (wrap it in a real element) and a falsy `data:` value renders *nothing* — no empty wrapper box. Its children reconcile into the nearest real ancestor.
19. **`@State`/`ObservableNode` only deep-tracks plain objects and arrays.** Class instances, `Date`, `Map`, `Set`, and other non-plain objects are treated as opaque primitives — nested mutations won't be tracked. Use plain objects/arrays for reactive state.
20. **`ObservableScope.Create` with no reactive deps yields a static scope.** If the valueFunction reads no `@Value`/`@State`/other scope, `Create` returns a static scope that silently ignores `ObservableScope.Update` — reactivity breaks with no error. Use `ObservableScope.Basic` for manually-updatable scopes whose value doesn't derive from reactive state.
21. **No error boundaries.** An exception thrown in a children function, `props:`/`attrs:` function, or getter propagates uncaught — there's no per-subtree isolation. Guard risky logic with your own `try`/`catch`.
22. **Children functions can't return `null`/`undefined`.** For conditional presence, use the element's own `data:` (falsy → no children) or `fragment({ data: () => condition }, ...)` for no wrapper. A ternary's "else" branch must return a vNode (`text(() => "")`), not `null`.

---

## Anti-Patterns

| Mistake | Fix |
|---------|-----|
| `@State()` for primitives | Use `@Value()` |
| `@Computed()` for cheap ops | Use `@Scope()` or plain getter |
| `@Computed()` for array filter/sort of existing refs | Use `@Scope()` — identity already preserved |
| `@Computed()` getter returning `this.tasks` without reading item props | Use plain getter or iterate items in the getter — per-item mutations won't re-trigger else |
| Single `@Scope` for multiple independent UI regions | One `@Scope` per region |
| `gate()` wrapping `@Scope` getter | Use `@Computed` or remove `gate()` |
| `data:` binding inside helper function called from `Template()` | Inline in `Template()` with `@Scope` data source |
| Destructuring/hoisting a scope read at top of `Template()` | Read inside children function or `data:` binding — see Mental Model |
| `this.Data` read at top of `Template()` | Read inside children function, `props:` function, or `data:` binding |
| Render callback for items needing state/events | Use dedicated component |
| Child `@Value` not synced with parent `Data` | Use `@Watch((self) => self.Data.prop)` |
| `.filter(Boolean)` for conditional rendering | Use ternary with `text(() => "")` fallback |
| Condition and sibling `data:` list in same children function | Wrap condition in nested children function, use `data:` boolean, or use `gate()` |
| `data:` boolean for a styled container that should disappear | Use nested children function or `gate()` — `data:` boolean keeps the element in the DOM (empty) |
| Assuming framework diffs vNode trees | It doesn't — optimize by minimizing scope emission frequency |
| `@State()` on class instances / `Date` / `Map` / `Set` | Use plain objects/arrays — non-plain objects are treated as primitives (no deep reactivity) |
| Promise-returning arrow without `async` keyword in an async scope | Use `async () => ...` — `IsAsync` only detects `async` functions |
| Children function returning `null`/`undefined` | Return `text(() => "")`, or move the condition into `data:`/`fragment()` |

---

## Debugging Reactivity

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Initial render works, updates don't | Direct array mutation | Replace array, don't mutate (or use `@State` proxy) |
| Template never re-renders | `data:` not a function | Use `data: () => this.state` |
| Getter value stale | Not using `this.Data` | Read from `this.Data` in getter |
| `@Watch` never fires | Missing `super.Bound()` | Call in `Bound()` method |
| Memory leak | Missing cleanup | `@Destroy()` + `super.Destroy()` |
| Input loses focus | Static `props` object | Use `props: () => ({ value })` |
| Entire Template re-runs on small change | Destructuring Trap — scope read at top of `Template()` | Read scope inside children function or `data:` binding |
| Entire section re-renders on small change | Single `@Scope` feeds multiple regions | Split into per-region `@Scope` getters |
| `gate()` doesn't prevent re-renders | Wrapping `@Scope` getter (always new ref) | Read `@Scope` directly or use `@Computed` |
| `data:` binding re-renders every time | Element created in helper, not `Template()` | Inline element in `Template()` |
| Child form controls don't reflect parent changes | No sync from `this.Data` to `@Value` | Add `@Watch((self) => self.Data.prop)` |
| Conditional re-renders when sibling list updates | Condition and list share same children function scope | Isolate condition into nested children function, `data:` boolean, or `gate()` |
| Expensive Template re-runs on every change | Large vNode subtree subscribed to frequently-changing scope | Split into smaller scopes to reduce rebuild surface |
| Async scope resolves to a Promise instead of a value | Callback not declared `async` | Use `async () => ...` so `IsAsync` detects it |
| Uncaught exception crashes a render | No error boundaries exist | Add `try`/`catch` inside the risky function |

---

## Glossary

| Term | Definition |
|------|------------|
| **vNode** | Virtual node — the internal representation of a DOM element or text node |
| **Scope** | A reactive unit that tracks dependencies, caches a value, and emits on change |
| **Static scope** | A scope with a fixed value — no dependency tracking, zero overhead |
| **Basic scope** | A lightweight scope used by `@Value` — stores a value directly, with no dependency tracking or caching; `ObservableScope.Update` must be called to emit |
| **Dynamic scope** | A scope with a getter function — tracks dependencies, re-evaluates on change |
| **Greedy scope** | A dynamic scope that batches updates via microtask queue (used for `@Watch`, async) |
| **Children function** | The function passed as the second argument to a DOM function (e.g., `div({}, () => ...)`) |
| **Watch context** | Code executed during evaluation of an `ObservableScope` — children functions, `data:`/`props:`/`attrs:` functions, `@Scope`/`@Computed`/`@ComputedAsync` getters, `@Watch` callbacks. Excludes `on:` handlers. |
| **The Destructuring Trap** | The React-primed instinct to hoist a state/scope read to the top of a component function; in j-templates this subscribes the whole `Template()` instead of a subtree. |
| **ApplyDiff** | Deep merge that preserves object identity — used internally by `@Computed` to update existing references in-place |
| **ObservableNode** | A reactive proxy wrapper around objects/arrays that tracks property-level mutations |
| **Injector** | Scoped dependency injection container with parent-chain resolution (not publicly exported) |
| **keyFunc** | A function passed to Store that extracts an ID from objects for automatic flattening |

---

## References

- **Source of truth:** `src/` (this primer documents `j-templates` v7.0.98).
- **Pattern guides:** `docs/patterns/01-components.md`, `docs/patterns/02-reactivity.md`, `docs/patterns/03-templates-and-data.md`, `docs/patterns/04-dependency-injection.md`.
- **Tutorials:** `docs/tutorials/` (01-getting-started through 08-building-complete-app).
- **Worked example:** `examples/smart-tasks/src/` (the Smart Tasks app used above).
- **Capstone project:** `examples/tutorial_project/tutorial-8/src/`.
