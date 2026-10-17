# j-templates Syntax Primer

Oct 17, 2026 · @Jay Landrum

Reference for building apps with j-templates 8.1.0. Every behavioral claim was checked by running the library in jsdom; claims taken from type declarations or source alone are marked as such.

## How to use this document

Read Mental model, then Templates and State decorators before writing a component. Check the Traps checklist before shipping.

- **Version:** j-templates 8.1.0. The 8.0.19 claims were tested in jsdom with TypeScript (`experimentalDecorators`). 8.0.21 changed `peek`, how `@Computed` notifies readers, and emitter re-entry. 8.0.23 moved `Bound()` after the first render and added `Connected()`. 8.0.24 fixed dotted projection reads through keyed entities. 8.0.27 batches `StoreAsync` changes. 8.1.0 added `PushStore` and `DiffTreeWriter`, and moved the diff types and `PROJECTION_PREFIX` to `j-templates/Store/Diff`. Each of those sections was re-verified in jsdom against the version that changed it.
- **Not verified:** a real browser `Worker` (a structured-clone shim stood in), real focus behavior, and the `docs/`, `examples/` and `src/` folders the package does not ship.
- **Convention:** `this.x` in examples is a component field decorated with `@Value` or `@State` unless shown otherwise. Imports are omitted after the first example.

## Mental model

There is no vNode diffing. A *children function* (the function passed as an element's second argument) records every reactive value it reads. When one changes, that function re-runs and the elements it returns are built as new DOM nodes.

- Optimize by reducing how often a function re-runs and how much it returns, not by making re-runs cheap.
- A read inside a children function, `data:`, `props:` or `attrs:` function subscribes only that function.
- A read directly in `Template()` subscribes `Template()` itself, so the whole component rebuilds on change.
- Items rendered from a `data:` array keep their DOM node and per-item scope while the same object reference stays in the array, even when reordered. A new reference gets a new node.
- Rendering is asynchronous by default: DOM updates land after a microtask or timeout, not on the line after a state write (see Scheduling, errors and testing).

**The Destructuring Trap.** React habit says hoist reads to the top of the component. Here that subscribes the whole `Template()`.

```typescript
// Wrong: Template() re-runs on every change to count
Template() {
  const count = this.count;
  return div({}, () => `Count: ${count}`);
}

// Right: only the children function re-runs
Template() {
  return div({}, () => `Count: ${this.count}`);
}
```

The same applies to `this.Data` and to `@Scope`/`@Computed` getters: read them where they are used.

## Setup and entry points

```bash
npm install j-templates
```

- **tsconfig:** `"experimentalDecorators": true` and `"useDefineForClassFields": false`.
- **A build step is required.** The package is ES modules with extension-less relative imports and no `exports` or `type` field. Plain Node fails with `ERR_MODULE_NOT_FOUND`. Use a bundler (Vite, webpack, esbuild) or a TypeScript runner (tsx, Vitest).
- **`window` must exist at import time** unless `SYNC_SCHEDULING=true`: the scheduler reads `window.requestAnimationFrame`, `setTimeout`, `queueMicrotask` and `requestIdleCallback` when the module loads.

**Public exports (verified at runtime):**

| Import path | Exports |
| --- | --- |
| `j-templates` | `Component`, `scope`, `gate`, `peek`, `mapped`; type `vNode` |
| `j-templates/DOM` | element functions (below), `text`, `fragment`, `CreateRootPropertyAssignment`, `CreateEventAssignment`, `PropertyAssignment`, `EventAssignment` |
| `j-templates/Utils` | `Value`, `State`, `Computed`, `ComputedAsync`, `Scope`, `Watch`, `Inject`, `Destroy`, `Bound`, `Animation`, `AnimationType`, `Injector`; type `IDestroyable` |
| `j-templates/Store` | `ReadStore`, `Store`, `StoreSync`, `StoreAsync`, `PushStore`, `ObservableScope`, `ObservableNode` |
| `j-templates/Store/Diff` | `PROJECTION_PREFIX`, `DIFF_TREE_EVENT`, `DIFF_TREE_ERROR`; types `DiffTreeProjectionMap`, `DiffTreeProjectionDefinition`, `DiffTreeProjectionFunc`, `IDiffPushEvent`, `DiffSpliceResult`, `IDiffTree` and the batch types. Types and constants only, so a worker bundle can import it. |

**Deep imports used below:** `j-templates/Store/Diff/diffTree` (`DiffTree`), `j-templates/Store/Diff/diffTreeWorker` (`ConnectWorkerToDiffTree`), `j-templates/Store/Diff/diffTreeWriter` (`DiffTreeWriter`), `j-templates/Node/vNode` (`vNode.Destroy`). `j-templates/Store/Diff/defaultDiffTreeWorker` runs worker code on import and throws outside a worker (`self is not defined`).

**Element functions** (all verified present):

- Layout: `div span section article aside nav main header footer hr blockquote address`
- Headings: `h1`–`h6`
- Text: `p a b strong i em u s strike del ins sub sup mark small label pre code kbd samp _var cite q abbr time dfn rt rp`
- Lists: `ul ol li dl dt dd`
- Tables: `table thead tbody tfoot tr th td col colgroup`
- Forms: `form input textarea button select option optgroup fieldset legend datalist output progress meter`
- Media: `img figure figcaption picture source audio video track embed object param iframe`
- Interactive: `details summary dialog menu`
- Other: `canvas svg map area template slot`

`_var` is `<var>`. `svg()` creates an HTML-namespace element, so it cannot render inline SVG. No SVG element functions are exported (see Components for SVG options).

## Components

A component is a class with a `Template()` method, turned into an element function with `Component.ToFunction`.

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
}

export const counter = Component.ToFunction("my-counter", Counter);
Component.Attach(document.getElementById("app")!, counter({}));
```

**Generics:** `Component<D, T, E>`. `D` = data from the parent (`this.Data`), `T` = template callbacks from the parent (`this.Templates`), `E` = event map for `this.Fire`. All default to empty.

**Members:**

- `Template(): vNode | vNode[]` — override to render. May return an array. Not overriding renders an empty host.
- `Bound()` / `Connected()` / `Destroy()` — optional overrides. If you override `Bound()` or `Destroy()`, call `super.Bound()` / `super.Destroy()`. `super.Bound()` starts `@Watch`; `super.Destroy()` tears down scopes and runs `@Destroy` properties. The base `Connected()` is empty.
- `Fire(event, payload?)` — sends a component event to the parent's `on:` handler. The payload is optional.
- `this.Data`, `this.Templates`, `this.Injector`, `this.VNode` (host vNode; `this.VNode.node` is the host element), `this.IsConnected`, `this.Destroyed`.
- Never override the constructor. Use field initializers and `Bound()`.

**Lifecycle (verified order, 8.0.23+):**

1. Field initializers run.
2. `Template()` runs and its children functions build the DOM. Child components go through their own steps 1–3 here, so a child's `Bound()` runs before its parent's.
3. `Bound()` runs once the initial subtree is in the host: `querySelector` on the host finds rendered elements, including a child component's content. `@Watch` handlers fire inside `super.Bound()` with their initial values, so they can use those elements too. Code placed before `super.Bound()` runs before the first `@Watch` call.
4. `Connected()` runs once the host is first in the document, after `Bound()`. It runs parent first, then children. It fires once per component instance; a component that is removed and rendered again is a new instance and fires again.

By default steps 2–4 happen **after** `Attach` returns; with `SYNC_SCHEDULING=true`, before.

The host is in the document during `Bound()` only for the component passed to `Component.Attach(document.body, …)`. A child's host joins the document when its parent's children are placed, after the child's `Bound()`. So:

- Find and wire up the elements you render in `Bound()`.
- Put work that needs layout (measuring, sizes), focus, or the document in `Connected()`.
- An element that a later change renders isn't there at `Bound()` or `Connected()`. Reach it from the code that renders it, or watch for it.

`Connected()` only fires when j-templates itself puts a node in the document. A tree attached to a detached element never gets `Connected()`, even after you append that element to the document (verified). Attach native listeners to an element you render, not to the host.

**Host element.** The name passed to `ToFunction` is the host's tag. `Template()` output renders inside it:

```html
<my-counter>        <!-- host: style by element selector -->
  <div>…</div>     <!-- template root -->
</my-counter>
```

**Component element config** (what `counter({...})` accepts): `data?: () => D`, `props?: object | () => object` (from type declarations; untested), `on?: { [event]: (payload) => void }`. A second argument passes template callbacks (`T`).

**Mounting and teardown:**

- `Component.Attach(element, vnode)` mounts and returns the root vNode.
- A child component dropped by its parent's re-render is destroyed: its `Destroy()` runs and its host is removed.
- No public unmount exists for a root. `vNode.Destroy(root)` from `j-templates/Node/vNode` runs `Destroy()` hooks but **leaves the host in the DOM**; remove it yourself.

**Web Components.** `Component.Register("my-tag", MyComponent)` defines a custom element with an open shadow root. The template renders inside the shadow root wrapped in a `<my-tag-component>` element.

**SVG.** `Component.ToFunction("circle", Circle, "http://www.w3.org/2000/svg")` creates the **host** in the SVG namespace, but elements built inside `Template()` with DOM functions are still HTML-namespace. For SVG content, either make each SVG element its own namespaced component, or set markup with `props: { innerHTML: "<svg>…</svg>" }` (parsed into the SVG namespace correctly).

## Templates

### Element function signature

```typescript
el(
  config: {                                         // required; pass {} for none
    props?: object | (() => object);                // DOM properties
    attrs?: { [name: string]: string } | (() => {…}); // HTML attributes
    on?:    { [event: string]: (e) => void };       // DOM event handlers
    data?:  () => T | T[];                          // MUST be a function; may be async
  },
  children?: vNode[] | ((item: T) => vNode | vNode[] | string | null)
)
text(() => string)                                  // reactive text node
fragment({ data?: () => … }, (item) => …)          // no DOM node; children function required
```

- A **function** for `props`, `attrs` or `children` creates its own reactive scope. A plain object or array is evaluated once, inside whatever scope is building it.
- `data:` given a non-function value throws `data is not a function` and halts rendering.
- A static children array (`div({}, [span(…), span(…)])`) works, and each child's own functions stay reactive.
- Raw HTML: `props: { innerHTML: "<b>x</b>" }`.

### What a children function may return

| Return value | Result |
| --- | --- |
| a vNode, or an array of vNodes | rendered |
| a string (as the only return value) | text node |
| `null` or `undefined` (as the only return value) | nothing rendered, no error |
| an array containing a plain string or `null` | **throws during DOM update and halts all rendering** |

In arrays, wrap strings in `text(() => "…")` and remove empty entries (`.filter(Boolean)` works).

### `data:` on DOM elements

The framework iterates and calls the children function once per item, passing the item.

| `data` returns | Children rendered |
| --- | --- |
| `[a, b, c]` | one per item |
| `[]` | none |
| a truthy non-array (`{}`, `"x"`, `123`, `true`) | one, called with that value |
| any falsy value (`false`, `null`, `undefined`, `0`, `""`, `NaN`) | none |
| an `async` function's promise | none until it resolves, then as above |

`data:` may return `null` or `undefined` (typed since 8.0.19). The children function's parameter is still typed as the non-null item, matching the runtime, which never calls it for a falsy value.

- A falsy `data:` removes the **children only**; the element stays in the DOM (a styled box stays visible). `fragment` leaves nothing.
- Each item gets its own scope, keyed by object identity. Reordering existing references moves their DOM nodes; a new reference (including a copy) gets a new node.

### `data:` on components

A component receives the raw value as `this.Data`: no iteration, wrapping or falsy collapse. `false`, `null`, `0` and arrays arrive unchanged. The component iterates arrays itself.

```typescript
div({ data: () => this.tasks }, (task) => div({}, () => task.name)); // iterated
taskList({ data: () => ({ tasks: this.tasks }) });                   // passed through
```

### Conditional rendering

```typescript
// 1. Ternary in a nested children function (isolated scope, has an else)
div({}, () => (this.loading ? div({}, () => "Loading") : div({}, () => "Ready")));

// 2. data: boolean (no else; the outer div stays in the DOM, empty)
div({ data: () => this.loading }, () => div({}, () => "Loading"));

// 3. fragment (no wrapper node; nothing left behind when falsy)
fragment({ data: () => this.loading }, () => div({}, () => "Loading"));

// 4. gate(): the enclosing function re-runs only when the boolean flips
div({}, () =>
  gate(() => this.todos.length === 0)
    ? div({}, () => "No items")
    : div({ data: () => this.todos }, (t) => div({}, () => t.name)),
);
```

In pattern 4, adding an item to a non-empty list does not re-run the outer function (verified); the list still updates through its own `data:` scope.

Avoid reading a condition and a list in the same children function. Isolate the condition with any pattern above:

```typescript
// Wrong: changing todos re-runs both the message and the list
div({}, () => [
  this.isEmpty ? div({}, () => "No items") : text(() => ""),
  div({ data: () => this.todos }, (t) => …),
]);

// Right
div({}, () => [
  div({ data: () => this.isEmpty }, () => div({}, () => "No items")),
  div({ data: () => this.todos }, (t) => …),
]);
```

### fragment

- Produces no DOM node; its children are placed in the nearest real ancestor. Nested fragments flatten.
- `data:` behaves as on a DOM element.
- `Component.Attach(el, fragment(…))` throws: wrap it in a real element.

### Form inputs (two-way binding)

Use a `props` **function**. A static `props: { value: this.text }` inside a children function subscribes that function, so every keystroke rebuilds the `<input>` (new node, focus lost).

```typescript
input({
  props: () => ({ value: this.text }),
  on: { input: (e) => { this.text = (e.target as HTMLInputElement).value; } },
});
```

### Scope granularity

```typescript
// Coarse: the outer function reads both values; changing value1 rebuilds both spans
div({}, () => {
  const a = this.value1, b = this.value2;
  return [span({}, () => a), span({}, () => b)];
});

// Fine: each span reads its own value; changing value1 updates only the first span
div({}, () => [span({}, () => this.value1), span({}, () => this.value2)]);
```

## State decorators

Decorators work on component classes only. Services use `ObservableScope`, `ObservableNode` and the stores directly.

| Decorator | Use for | Returns | Recomputes |
| --- | --- | --- | --- |
| `@Value()` | primitives, or values you always replace | the value | on assignment |
| `@State()` | plain objects and arrays mutated in place | a deep reactive proxy | on any tracked write |
| `@Scope()` getter | cheap derivations; filters/sorts of existing objects | whatever the getter returns (new object each run if it builds one) | lazily, on the next read after a change |
| `@Computed()` getter | building new objects consumed in several places | the **same** object every time, updated in place | eagerly, when a dependency changes |
| `@ComputedAsync(default)` getter | as `@Computed`, diffed off-thread | same object every time; `default` until first result | eagerly |
| `@Watch(sel)` method | side effects on change | — | — |
| `@Inject(Type)` field | dependency injection | — | — |
| `@Destroy()` field | calling `.Destroy()` at teardown | — | — |

A plain getter with no decorator is reactive too (its reads register in whatever scope calls it) but is not cached.

**Writes notify even when the value is unchanged.** Assigning a value equal to the current one re-runs every reader. This holds for `@Value` fields, `@State` properties and `ObservableNode` properties (verified). Guard writes that can repeat (`if (s.view !== v) s.view = v;`), or have readers use `gate()`, which ignores equal values.

### @Value

```typescript
@Value() count = 0;
@Value() list: number[] = [];
```

No proxy. Only assignment notifies: `this.list.push(3)` does **not** update the view; `this.list = [...this.list, 3]` does.

### @State

```typescript
@State() tasks: Task[] = [];
this.tasks.push(t);                 // tracked
this.tasks[0].completed = true;     // tracked
this.tasks.splice(i, 1);            // tracked
```

Tracked array methods: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`. Only plain objects and arrays are deep-tracked; mutations inside class instances, `Map` and `Set` are not.

### @Scope

```typescript
@Scope() get activeCount() { return this.tasks.filter((t) => !t.completed).length; }
```

- Created on first read. When a dependency changes it notifies consumers but re-runs the getter only on the next read.
- No equality check: consumers re-run even if the new value equals the old one (a boolean that stays `false` still re-runs its readers). Wrap in `gate()` to suppress that (see Inline scopes).
- Returning an existing object (`return this.tasks`) passes that same reference through. Returning `.filter(...)` returns a new array each run.
- Use one `@Scope` per independent UI region. A single getter returning `{ a: …, b: … }` is a new object on every change, so every region reading it re-runs.

### @Computed

```typescript
@Computed() get summary() {
  return { total: this.tasks.length, done: this.tasks.filter((t) => t.completed).length };
}
```

- Created on first read; afterwards recomputes immediately when a dependency changes, then merges the result into the existing object.
- No store is involved. The getter runs inside an `ObservableScope.Gated` scope that is watched; each result is copied with `ObservableNode.Clone` and merged into an internal `ObservableNode` with `ObservableNode.Apply`. The property reads that node's root through a separate scope (from source).
- Readers of the property itself re-run only when the root is replaced. A reader of a sub-property (`this.summary.done`) re-runs only when that path changes (verified).
- `this.summary === this.summary` holds across content updates, including arrays growing or shrinking (verified), so `gate()` and identity-based item reuse see a stable reference.
- The root is replaced, with a new identity, when the result's type changes or an object result loses a key (verified: `{ a, b }` → `{ a }`). A primitive result therefore behaves like `gate()`: readers re-run only when the value changes (verified).
- The result is a **copy**. `@Computed() get x() { return this.tasks; }` returns an object that is not `this.tasks`. Use `@Scope` when you need the original reference.
- The copy step reads every property of the result, so all of them become dependencies. Returning a `@State` array therefore re-runs the getter when any item property changes (verified).
- No arguments. Prefer `@Scope` or a plain getter for cheap values.

### @ComputedAsync

```typescript
@ComputedAsync(null) get user(): User | null {
  return { id: this.userId, name: lookupName(this.userId) }; // must be synchronous
}
```

- The getter must be synchronous. "Async" refers to the backend: results are diffed in a `StoreAsync` worker.
- Returns `default` first, then the computed object, with the same reference across updates (verified).
- Each instance creates `new Worker(new URL("../Store/Diff/defaultDiffTreeWorker.js", import.meta.url), { type: "module" })` (from source). It needs a real `Worker` and a bundler that handles `new URL(…, import.meta.url)`. In jsdom tests, stub `globalThis.Worker` (see Scheduling, errors and testing).
- For genuinely async data, use `@Scope()` + `scope(async () => …)` or `ObservableScope.Create(async () => …)`.

### @Watch

```typescript
@Watch((self) => self.Data.filter)
syncFilter(value: FilterType) { this.localFilter = value; }
```

- Fires once in `super.Bound()` with the initial value, then on every change. Since `Bound()` runs after the first render, that first call can use rendered elements.
- Several synchronous writes in one tick produce one call with the latest value (`n = 1; n = 2; n = 3` → one call with `3`).
- Without `super.Bound()` it never fires.
- Use it for side effects and for copying parent `Data` into local `@Value` state. Don't use it to drive rendering; reads in templates are already reactive.

### @Inject and @Destroy

```typescript
@Destroy() @Inject(DataService) dataService = new DataService(); // provide (and destroy on teardown)
@Inject(DataService) dataService!: DataService;                  // consume in a descendant
```

- `@Inject(Type)` makes the field a getter (`this.Injector.Get(Type)`) and setter (`this.Injector.Set(Type, value)`). Assigning registers the value on this component's injector; descendants find it by walking up the parent chain.
- `@Destroy()` calls `.Destroy()` on the field's value during teardown. The value should implement `IDestroyable` (`{ Destroy(): void }`).
- Abstract classes work as keys: `@Inject(IDataService)` with `abstract class IDataService`.

## Inline scopes: scope, gate, peek, mapped

`scope`, `gate` and `mapped` create a memoized child scope inside the scope currently being evaluated and return its value. `peek` creates no scope: it calls its function immediately with dependency tracking turned off.

| Function | Parent re-runs when the value changes | Equality check | Use for |
| --- | --- | --- | --- |
| `scope(fn, id?)` | yes | none: parent re-runs on every emit | composing a value, especially async |
| `gate(fn, id?)` | yes | `!==` only | booleans and other primitives that change less often than their inputs |
| `peek(fn)` | no | — | reading without subscribing; works anywhere |
| `mapped(data, fn, onUpdated?, onDestroyed?)` | yes | none | a per-item scope for one value (what `data:` does internally) |

Verified example: with `n` going from 0 to 1, `scope(() => n > 10)` re-runs the parent, `gate(() => n > 10)` and `peek(() => n > 10)` do not.

**Where they can be called.** `scope`, `gate` and `mapped` only while a scope is evaluating: children functions, `data:`/`props:`/`attrs:` functions, decorated getters, and `ObservableScope.Create` value functions. Elsewhere, including `on:` handlers, they throw `scope() must be called within a watch context` (or `gate()`; `mapped()` reports `scope()`). They also throw inside a `peek` callback, because tracking is off there (verified).

**peek() details.** `peek` can be called anywhere, including `on:` handlers and plain code (verified). It is not memoized and takes no id: the callback runs on every call, so a parent that re-runs calls it again (verified). It does not await: an `async` callback returns its Promise.

**gate() with @Scope.** Works for a getter that returns a primitive: `gate(() => this.isEmpty)` suppresses re-runs while the boolean is unchanged. Useless for a getter that builds a new object or array each run, because every result is `!==` the last.

### How memoization matches calls

This applies to `scope`, `gate` and `mapped`; `peek` has no scope to match. On each re-run of the parent, each call is matched to a scope from the previous run with the same key, in call order. The key is `id` if given, otherwise one default key per function. `mapped()` keys by the `data` object instead. Consequences:

1. **Unconditional duplicates are safe.** Two `gate()` calls without ids, always made in the same order, stay independent across re-runs (verified).
2. **Conditional or reordered calls need ids.** If a call without an id is skipped, the next same-function call takes its old scope and returns the wrong value, permanently:

```typescript
// Bug: both gates run in the same children function. After showA becomes false,
// the b gate takes a's old scope and shows "b=A" from then on (verified).
div({}, () => {
  const parts: string[] = [];
  if (this.showA) parts.push("a=" + gate(() => this.a));
  parts.push("b=" + gate(() => this.b));
  return parts.join(" ");
});

// Fix (verified): give each call its own id
if (this.showA) parts.push("a=" + gate(() => this.a, "a"));
parts.push("b=" + gate(() => this.b, "b"));
```

3. **The callback from the first run is kept.** On re-runs the existing scope is reused and the new callback is ignored, so a callback that closes over a local variable keeps the first run's value:

```typescript
div({}, () => {
  const local = this.n;            // re-read on every run
  return `${gate(() => local * 10)}`; // stays at the first value of local
});
```

Read reactive values inside the callback (`gate(() => this.n * 10)`), not through captured locals.

4. **mapped() duplicates are independent.** `mapped(obj, f)` and `mapped(obj, g)` in one run return `f(obj)` and `g(obj)` separately (verified).

## Async scopes

Any scope function can be `async`: `data:`, `props:` and `attrs:` functions, `@Scope` getters (via `scope()`), the inline helpers, and `ObservableScope.Create`.

```typescript
@Scope() get user() {
  return scope(async () => (await fetch(`/api/user/${this.userId}`)).json());
}

div({ data: async () => await loadItems() }, (item) => div({}, () => item.name));
div({ props: async () => ({ innerHTML: await getMarkup() }) });
div({ props: () => ({ textContent: scope(async () => fetchSummary(this.openCount)) }) });
```

Verified behavior:

- **The `async` keyword is required.** A plain function that returns a promise (`() => fetch(url)`) is a synchronous scope whose value is the promise object, never resolved.
- **Pending = `null`.** The value is `null` until the first result: async `data:` renders no children and async `props:` applies nothing.
- **Old value kept while re-running.** After the first result, the previous value stays until the new promise resolves. A result that arrives after a newer run has started is discarded.
- **Only reads before the first `await` are tracked.** Read every reactive value you depend on first.

```typescript
scope(async () => {
  const id = this.userId;          // tracked
  const res = await fetch(`/u/${id}`);
  return this.format(res);         // reads inside format() are NOT tracked
});
```

- **Composition.** `scope(async …)` inside a synchronous `props:` function works: the outer function re-runs when the inner value resolves and when its tracked inputs change.
- TypeScript types the helpers as `() => T | Promise<T>`, so `scope(async () => "x")` is typed `string`.

There is no built-in loading placeholder: render one yourself while the value is `null`.

## Composition and dependency injection

### Parent to child: data

```typescript
child({ data: () => ({ userId: this.userId }) });

class Child extends Component<{ userId: string }> {
  Template() { return div({}, () => this.Data.userId); }
}
```

`this.Data` is read-only input. For local editable state, copy it into a `@Value` with `@Watch((self) => self.Data.userId)`.

### Child to parent: events

```typescript
interface ChildEvents { save: { text: string }; done: void; }

class Child extends Component<{}, {}, ChildEvents> {
  Template() {
    return button({ on: { click: () => this.Fire("save", { text: "x" }) } }, () => "Save");
  }
}

child({ on: { save: (p) => console.log(p.text), done: () => {} } });
```

Component events go only to the parent's `on:` handler. They are not DOM events: DOM listeners on ancestors never see them.

### Template callbacks

A parent can pass render functions as the second argument; the child calls them via `this.Templates`.

```typescript
class List<D> extends Component<{ items: D[] }, { render: (item: D) => vNode }> {
  Template() {
    return div({ data: () => this.Data.items }, (item: D) => this.Templates.render(item));
  }
}
const list = Component.ToFunction("item-list", List);

list({ data: () => ({ items: users }) }, { render: (u) => div({}, () => u.name) });
```

Use a dedicated child component instead when each item needs its own state, events, lifecycle or injected services.

### Shared services between siblings

Provide one service instance from a common ancestor with `@Inject`, and expose reactive state from it with `ObservableScope` (see the `CounterService` example under ObservableScope).

### Injector

`Injector` **is** exported from `j-templates/Utils`. Inside components, prefer `@Inject` and `this.Injector`.

```typescript
class Injector {
  constructor();                              // parent = Injector.Current()
  Get<T>(type: any): T;                       // searches up the parent chain; undefined if absent
  Set<T>(type: any, instance: T): T;          // stores at this level; returns instance
  static Current(): Injector;
  static Scope<R>(injector: Injector, fn: (...args) => R, ...args): R;
}
```

`Injector.Scope` runs `fn` with `injector` as current, so injectors created inside it get it as their parent. It also **catches any exception from `fn`**, logs `Error evaluating injector scope` with `console.error`, and returns `undefined`. The framework evaluates `Template()` and children functions through it (see Scheduling, errors and testing).

## Store

A store holds reactive data under string keys and diffs every write into existing objects in place. Use `StoreSync` unless diffing large data blocks the main thread. Use `PushStore` when a worker produces the data itself, such as the result of a computation it runs.

|  | `StoreSync` | `StoreAsync` | `PushStore` |
| --- | --- | --- | --- |
| Constructor | `new StoreSync(keyFunc?, projections?)` | `new StoreAsync(worker, keyFunc?)` | `new PushStore(source, keyFunc?, cloneData?)` |
| Diffing | main thread, synchronous | in the `Worker` you supply | in the `DiffTreeWriter` that pushes to it |
| Writes | `void`; readable immediately | `Promise`; batched per tick, readable only after `await` | none; read-only. Changes arrive when the writer calls `Commit()` |
| `Destroy()` | none | required; terminates the worker | required; stops listening, leaves the worker running |
| Backs | nothing (`@Computed` uses `ObservableNode` directly) | `@ComputedAsync` | nothing |

### API

```typescript
Get<T>(key: string): T | undefined;          // reactive proxy; undefined if absent
Get<T>(key: string, defaultValue: T): T;     // creates the key with the default if absent
Has(key: string): boolean;
Write(data: unknown, key?: string);          // replace/diff the value at key
Patch(key: string, patch: unknown);          // deep merge; throws "Key not found in store"
Push(key: string, ...items: unknown[]);      // append to the array at key
Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]); // returns removed items
```

`StoreAsync` has the same methods; the four writers return promises. It also has `Flush()` (see below). `PushStore` has only `Get` and `Has`, plus `Error` (see PushStore and DiffTreeWriter).

### keyFunc and flattening

`keyFunc(value)` returns an id for any object (or `undefined`). On `Write`/`Push`, every nested object with an id is also stored under that id, so it can be patched directly while `Get` still returns the original shape.

```typescript
const store = new StoreSync((v: any) => v?.id);
store.Write([{ id: "a", done: false }, { id: "b", done: false }], "todos");
store.Patch("a", { done: true });              // targets the nested item by id
store.Get<Todo[]>("todos", [])[0].done;        // true
```

- The explicit `key` argument names the root, overriding `keyFunc` for it.
- If an id appears twice in one tree, the last object wins and both positions show it.
- An object without an id is reachable only through its explicit key. Get with an entity id returns that entity directly, the same object that appears in its list (verified).
- `Patch` merges deeply: `Patch("u", { profile: { age: 2 } })` keeps `profile.name`.

### StoreAsync and its worker

Supply a running `Worker` whose entry file connects a `DiffTree`. Any `keyFunc` or projections used for diffing must live in that file; the constructor's `keyFunc` only resolves ids on the main thread.

```typescript
// diff-worker.ts (bundled as its own worker entry)
import { DiffTree } from "j-templates/Store/Diff/diffTree";
import { ConnectWorkerToDiffTree } from "j-templates/Store/Diff/diffTreeWorker";
ConnectWorkerToDiffTree(new DiffTree((v: any) => v?.id), self as any as Worker);

// main thread
const worker = new Worker(new URL("./diff-worker.ts", import.meta.url), { type: "module" });
const store = new StoreAsync(worker, (v: any) => v?.id);
await store.Write(todos, "todos");
store.Get("todos");   // only now defined
store.Destroy();      // when done
```

Data crosses the worker boundary by structured clone. Class instances arrive as plain objects without their methods; functions cannot be sent. Store plain data.

**Batching (8.0.27).** Every `Write`, `Patch`, `Push` and `Splice` made in the same tick goes to the worker as one message and is applied in call order. The worker runs projections once per batch, after the last change, not after each one. Verified: a `Write`, a `Push` and a `Patch` in one tick sent one message and ran a projection once.

- You don't have to await a change before making the next one. `Patch`, `Push` and `Splice` accept a key whose `Write` is still pending, and `Patch` merges in the worker, on top of everything before it.
- The pending-key check covers only the key passed to `Write`. Entities that `keyFunc` will flatten out of that write don't exist yet: `Patch("a", …)` right after an un-awaited `Write([{ id: "a" }], "todos")` rejects with `Key not found in store` (verified). Await the write first.
- `await store.Flush()` waits for every change made before the call. Changes made after it go in a later batch.
- **A failed change stops the store.** After any change fails in the worker (for example `Splice` on a value that isn't an array), every later `Write`, `Patch`, `Push`, `Splice` and `Flush` rejects with that same error (verified). Validate before writing; a store in this state has to be replaced.

### Projections

A projection is a derived value the store computes and stores under `$projection_<name>`. Pass them as `StoreSync`'s second argument (for `StoreAsync`, to the worker's `DiffTree`).

```typescript
import { PROJECTION_PREFIX } from "j-templates/Store/Diff"; // "$projection_"

const store = new StoreSync((v: any) => v?.id, {
  activeCount: { reads: ["todos"], projection: (keys, todos) => todos.filter((t) => !t.done).length },
  doubled: { reads: [`${PROJECTION_PREFIX}activeCount`], projection: (keys, n) => n * 2 },
});
store.Write(todos, "todos");
store.Get<number>(`${PROJECTION_PREFIX}activeCount`);
```

- `projection(keys, ...values)`: `keys` lists the resolved read paths; values follow in `reads` order.
- `reads` entries: a tree path (`"todos"`), an entity id from `keyFunc`, or another projection (chaining).
- The last read may be a root wildcard such as `"task_*"`: each matching root's key is added to `keys` and its value appended (verified: `[["task_1","task_2"], v1, v2]`).
- A projection has no value until every read resolves. It re-runs when a read's value changes.
- A cycle or a read of an undefined projection throws at construction.
- A dotted read can pass through a keyed entity (`"doc.owner.name"`, where `owner` has an id). It reads the entity's own root, so a `Patch` to the entity reruns the projection with the new value (verified; before 8.0.24 such a read returned the stale embedded copy).
- `StoreSync` and the `StoreAsync` worker run projections for you, and a `DiffTreeWriter` runs them in `Commit()`. `DiffTree.DiffPath`, `PatchPath`, `PushPath` and `SplicePath` don't (8.0.27): code that drives a `DiffTree` directly, such as a test, must call `tree.RunProjections()` after its writes (verified).

### PushStore and DiffTreeWriter

`StoreAsync` only changes when the main thread writes. When a worker produces the data itself, the worker owns the tree instead: it writes into a `DiffTreeWriter` and calls `Commit()`, which runs projections and posts every change since the last commit as one message. A `PushStore` on the main thread applies each message as it arrives (8.1.0).

```typescript
// engine-worker.ts (bundled as its own worker entry)
import { DiffTreeWriter } from "j-templates/Store/Diff/diffTreeWriter";
const tree = new DiffTreeWriter(self, (v: any) => v?.id, projections);
self.onmessage = async (e) => {
  const results = await compute(e.data);   // the worker's own work
  tree.DiffPath("results", results);
  tree.DiffPath("meta", { finishedAt: Date.now() });
  tree.Commit();                          // one message: both writes and the projections
};

// main thread
const worker = new Worker(new URL("./engine-worker.ts", import.meta.url), { type: "module" });
const store = new PushStore(worker, (v: any) => v?.id);   // before the first Commit()
store.Get("results");   // reactive; undefined until the first commit
store.Destroy();        // stops listening; terminate the worker yourself
```

- The writer is a `DiffTree`: write with `DiffPath`, `PatchPath`, `PushPath` and `SplicePath`. Nothing reaches the store until `Commit()`, and a `Commit()` with no changes posts nothing (verified).
- Projections run once per `Commit()`, after the batch's writes, and their results arrive in the same message, so readers never see a projection out of step with the writes it came from (verified). Calling `RunProjections()` on a writer throws (from source).
- Use the same `keyFunc` on both sides. Keyed entities resolve through their own roots, as in any store (verified).
- `source` is any `EventTarget` that delivers the writer's messages as `"message"` events: a `Worker`, a `MessagePort` (started for you), or a plain `EventTarget` on the same thread. The store ignores messages whose `type` isn't `DIFF_TREE_EVENT` or `DIFF_TREE_ERROR` (verified). It listens with `addEventListener` and never sets `onmessage` (from source). The worker can carry its own requests and replies on the same channel.
- **Create the store before the first `Commit()`.** Messages are diffs against the writer's tree, so a store created later misses the earlier changes and holds partial roots (from source). There is no catch-up message.
- **A failed change doesn't stop either side.** After a write throws, every later write before `Commit()` throws the same error. `Commit()` still sends the writes made before the failure, skips projections, then posts `DIFF_TREE_ERROR`. The store applies the changes and sets `Error` (verified). The next commit brings projections up to date.
- `store.Error` is reactive: the last commit's error, or `null`. It's cleared when a later commit's changes arrive (verified).
- `cloneData` (default `false`): a `Worker` or `MessagePort` already delivers a structured-clone copy, so no copy is made. A same-thread `EventTarget` delivers the writer's own objects; post copies, or pass `true`. The flag only covers new roots and splices; changes to an existing root are always copied (from source).

## ObservableScope and ObservableNode

Use these directly in services and plain modules, where decorators are unavailable.

### ObservableScope

```typescript
ObservableScope.Create(fn)       // derived scope; tracks reads in fn; fn may be async
ObservableScope.Gated(fn)        // like Create, but emits batched on the next microtask (per type docs)
ObservableScope.Basic(fn)        // no tracking, no cache: emits whenever Update() is called
ObservableScope.Value(s)         // read + subscribe the current scope
ObservableScope.Peek(s)          // read without subscribing
ObservableScope.Touch(s)         // subscribe without reading
ObservableScope.Watch(s, cb)     // cb(scope) on every emit; Unwatch(s, cb) to stop
ObservableScope.OnUpdated(s, (lastValue, scope) => …)
ObservableScope.OnDestroyed(s, cb)
ObservableScope.Update(s)        // mark changed and emit
ObservableScope.Destroy(s)  /  DestroyAll([s1, s2])
ObservableScope.Register(emitter)
```

**Static scopes.** If `Create`'s function reads no reactive value, it returns a static scope that ignores `Update()` (verified: zero emits). For a manually updated value, use `Basic`:

```typescript
class CounterService implements IDestroyable {
  private _count = 0;
  private countScope = ObservableScope.Basic(() => this._count);
  get count() { return ObservableScope.Value(this.countScope); }   // reactive when read in a template
  increment() { this._count++; ObservableScope.Update(this.countScope); }
  Destroy() { ObservableScope.Destroy(this.countScope); }
}
```

A service deriving from a store:

```typescript
class TodoService implements IDestroyable {
  private store = new StoreSync((v: any) => v?.id);
  private active = ObservableScope.Create(() =>
    this.store.Get<Todo[]>("todos", []).filter((t) => !t.done));
  get Active() { return ObservableScope.Value(this.active); }
  Destroy() { ObservableScope.Destroy(this.active); }
}
```

### ObservableNode

```typescript
ObservableNode.Create(value)          // deep reactive proxy (what @State uses)
ObservableNode.Unwrap(proxy)          // raw underlying value
ObservableNode.Apply(node, value)     // merge a full value in place; node identity kept
ObservableNode.Snapshot(node)         // cached plain copy
ObservableNode.Clone(value)           // replaces proxies with plain data, mutating plain containers in place; returns value
ObservableNode.Update(node, prop?)    // force a change notification
ObservableNode.CreateFactory(alias?)  // proxy factory with aliasing (used by stores)
```

- `Snapshot` returns the same object on repeated calls until a write. After a write, unchanged nested parts are shared (`===`) with the previous snapshot. Snapshots are **not frozen**; treat them as read-only.
- `JSON.stringify(node)` and `node.toJSON()` use the cached snapshot.
- `ApplyDiff`, `ApplySplice`, `Assign`, `Touch` and `Read` also exist; they are internal to the stores.

**Snapshot reads do not subscribe.** `JSON.stringify(node)`, `node.toJSON()` and `ObservableNode.Snapshot(node)` register no dependencies, so a scope that reads only through them never updates (verified). Read properties directly, or use `ObservableNode.Clone(node)`, which tracks every nested field and leaves the source untouched:

```typescript
const saver = ObservableScope.Gated(() => JSON.stringify(ObservableNode.Clone(state)));
ObservableScope.Watch(saver, (s) => localStorage.setItem("state", ObservableScope.Value(s)));
ObservableScope.Value(saver); // first read starts tracking
```

## Scheduling, errors and testing

### Scheduling

By default, rendering is queued and runs in time slices of about 16 ms (microtask first, then `setTimeout` for leftover work).

- `Component.Attach` returns before the DOM is built.
- A state write is not visible in the DOM on the next line. Await a timeout before reading the DOM.

Setting the environment variable `SYNC_SCHEDULING=true` (read from `process.env` once, at import) makes all of this synchronous: the DOM is complete when `Attach` returns and writes apply immediately. It is **off by default**, including in test runners, unless you set it. With it on, batching behavior (such as `@Watch` coalescing) cannot be observed.

### Errors

There are no error boundaries. What happens depends on where the exception is thrown (all verified):

| Exception thrown in | Effect |
| --- | --- |
| `Template()` or a children function | caught and logged (`Error evaluating injector scope`); that element renders empty; rendering continues. The scope keeps its dependencies, so it recovers when they change. |
| a `props:`, `attrs:` or `data:` function | **uncaught; halts all further rendering on the page**, including components mounted earlier. Nothing recovered it in testing. |
| DOM update, from a children array containing a plain string or `null` | same as above: all rendering halts |

Wrap any logic that can throw inside `props:`, `attrs:` and `data:` functions in `try`/`catch`, and never put strings or `null` into a returned array.

### Testing

Verification used tsx with jsdom; Vitest with jsdom should behave the same. Requirements:

1. Create `window`, `document` and the DOM classes as globals **before** importing j-templates.
2. Set `SYNC_SCHEDULING=true` for synchronous assertions, or await a timeout (100–150 ms was reliable in testing) after each action.
3. For `@ComputedAsync` or `StoreAsync`, stub `Worker` with an in-process shim:

```typescript
import { DiffTree } from "j-templates/Store/Diff/diffTree";
import { ConnectWorkerToDiffTree } from "j-templates/Store/Diff/diffTreeWorker";

function fakeWorker(tree = new DiffTree()) {
  const inner: any = { onmessage: null,
    postMessage: (d: any) => queueMicrotask(() => outer.onmessage?.({ data: structuredClone(d) })) };
  const outer: any = { onmessage: null, onerror: null, terminate() {},
    postMessage: (d: any) => queueMicrotask(() => inner.onmessage?.({ data: structuredClone(d) })) };
  ConnectWorkerToDiffTree(tree, inner);
  return outer;
}
(globalThis as any).Worker = class { constructor() { return fakeWorker(); } }; // for @ComputedAsync
const store = new StoreAsync(fakeWorker(new DiffTree((v: any) => v?.id)), (v: any) => v?.id);
```

4. For `PushStore`, use a plain `EventTarget` as the channel. Deliver copies a tick later, as a worker would, and await a timeout before reading:

```typescript
import { DiffTreeWriter } from "j-templates/Store/Diff/diffTreeWriter";

const target = new EventTarget();
const port = { postMessage: (d: unknown) => setTimeout(() =>
  target.dispatchEvent(new MessageEvent("message", { data: structuredClone(d) }))) };
const writer = new DiffTreeWriter(port);
const store = new PushStore(target);

writer.DiffPath("a", { value: 1 });
writer.Commit();
await new Promise((r) => setTimeout(r));
store.Get<any>("a").value;   // 1
```

jsdom has no `innerText`; use `textContent` in tests.

## Worked example: Smart Tasks

This exact code passed 18 interaction checks (add, toggle, delete, filter, Enter key, stats) and type-checks under `strict`. It uses `@State` mutation, `@Value`, a plain reactive getter, `@Scope`, `@Computed`, parent-to-child data, child-to-parent events, `data:` iteration, conditional rendering and two-way binding. Shown as one file; split per component as you prefer.

```typescript
import { Component } from "j-templates";
import { Value, State, Scope, Computed } from "j-templates/Utils";
import { div, h1, span, input, button } from "j-templates/DOM";

export interface Task { id: string; text: string; completed: boolean; }
export type FilterType = "all" | "active" | "completed";

// ---- TaskItem: renders one task, fires events upward
interface TaskItemEvents { toggle: { id: string }; delete: { id: string }; }
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
      }, () => "×"),
    ]);
  }
}
const taskItem = Component.ToFunction("task-item", TaskItem);

// ---- TaskInput: two-way binding via a props function
interface TaskInputEvents { add: { text: string }; }
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

// ---- StatsBar: @Scope for cheap values, @Computed for a composite object
interface StatsBarData { tasks: Task[]; }
class StatsBar extends Component<StatsBarData> {
  @Scope() get total(): number { return this.Data.tasks.length; }
  @Scope() get activeCount(): number { return this.Data.tasks.filter((t) => !t.completed).length; }
  @Scope() get completedCount(): number { return this.Data.tasks.filter((t) => t.completed).length; }

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

// ---- FilterBar: reads parent data, fires filterChange
class FilterBar extends Component<{ activeFilter: FilterType }, void, { filterChange: { filter: FilterType } }> {
  Template() {
    return div({ props: { className: "filter-bar" } }, () =>
      (["all", "active", "completed"] as FilterType[]).map((f) =>
        button({
          props: () => ({ className: this.Data.activeFilter === f ? `f-${f} on` : `f-${f}` }),
          on: { click: () => this.Fire("filterChange", { filter: f }) },
        }, () => f)));
  }
}
const filterBar = Component.ToFunction("filter-bar", FilterBar);

// ---- App: owns state, wires children
let nextId = 1;
class App extends Component {
  @State() tasks: Task[] = [];
  @Value() filter: FilterType = "all";

  // Plain getter: reactive because it reads @State/@Value; not cached
  get filteredTasks(): Task[] {
    switch (this.filter) {
      case "active": return this.tasks.filter((t) => !t.completed);
      case "completed": return this.tasks.filter((t) => t.completed);
      default: return this.tasks;
    }
  }

  private handleAdd(p: { text: string }): void {
    this.tasks.push({ id: String(nextId++), text: p.text, completed: false });
  }
  private handleToggle(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.completed = !task.completed;
  }
  private handleDelete(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) this.tasks.splice(idx, 1);
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      h1({}, () => "Smart Tasks"),
      statsBar({ data: () => ({ tasks: this.tasks }) }),
      taskInput({ on: { add: (p) => this.handleAdd(p) } }),
      filterBar({
        data: () => ({ activeFilter: this.filter }),
        on: { filterChange: (p) => { this.filter = p.filter; } },
      }),
      // Isolated scope for the empty-state message
      div({}, () => {
        if (this.tasks.length === 0) return div({}, () => "No tasks yet");
        if (this.filteredTasks.length === 0) return div({}, () => "No tasks match this filter.");
        return null;
      }),
      // Iterated list: toggling one task does not rebuild the other rows (verified)
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

export const app = Component.ToFunction("smart-tasks", App);
Component.Attach(document.getElementById("app")!, app({}));
```

## Traps checklist

1. **No vNode diffing.** A re-running children function rebuilds what it returns as new DOM nodes.
2. **Destructuring Trap.** Reading state, `this.Data` or a getter at the top of `Template()` rebuilds the whole component on every change.
3. **`data:` must be a function.** A plain value throws and halts rendering.
4. **`data:` collapses every falsy value** (`0`, `""`, `NaN` included) to no children, and a falsy `data:` keeps the element itself in the DOM.
5. **Arrays returned from children functions** must contain only vNodes. A string or `null` in the array halts all rendering.
6. **Exceptions in `props:`, `attrs:` or `data:` functions halt all rendering on the page.** Exceptions in `Template()` and children functions are only logged.
7. **Static `props` objects** inside a children function rebuild the element on every change it reads (inputs lose focus). Use `props: () => (…)`.
8. **`@Value` does not see in-place mutation.** Reassign, or use `@State`.
9. **`@State` deep-tracks plain objects and arrays only**, not class instances, `Map` or `Set`.
10. **`@Scope` has no equality check**; consumers re-run on every change of its inputs. `gate()` it if it returns a primitive.
11. **`@Computed` returns a copy**, not the object the getter returned. Its identity changes only when the result's type changes or an object result loses a key.
12. **`Bound()` runs after the first render**, but a child's host isn't in the document yet. Do layout and focus work in `Connected()`. Forgetting `super.Bound()` silences `@Watch`.
13. **`@Watch` fires immediately** with the initial value, and coalesces synchronous changes into one call.
14. **`scope()`, `gate()` and `mapped()` outside a scope throw**, including in `on:` handlers and inside `peek()` callbacks. `peek()` works anywhere.
15. **Conditional `scope()`/`gate()` calls need ids**, or a later call takes a skipped call's scope. Callbacks are fixed at first run: don't close over locals.
16. **Async scopes need the `async` keyword**, track only reads before the first `await`, and are `null` until resolved.
17. **Rendering is asynchronous** unless `SYNC_SCHEDULING=true`: the DOM is not updated on the line after a write, and not built when `Attach` returns.
18. **Native DOM listeners belong on elements you render**, not the host.
19. **`svg()` is HTML-namespace.** Use namespaced components or `innerHTML` for SVG.
20. **`ObservableScope.Create` with no reactive reads is static** and ignores `Update()`. Use `Basic`.
21. **`StoreAsync` writes must be awaited** before reading; data crosses by structured clone (class methods are lost). Changes in one tick are batched, and one failed change makes every later change reject.
22. **The package needs a bundler or TypeScript runner**; plain Node cannot import it.

23) **Equal-value writes still notify.** Assigning the current value again re-runs every reader. Guard repeated writes or read through `gate()`.
24) **`JSON.stringify(node)` and `ObservableNode.Snapshot(node)` don't subscribe.** Read properties directly, or `ObservableNode.Clone(node)` to track everything.
25) **Don't update a scope from its own emit.** Calling `ObservableScope.Update(s)` from a `Watch(s, …)` callback, or any write that re-emits the emitter currently notifying, throws `Emitter.Emit: re-entry during emit is not supported` (verified). Defer the write (`queueMicrotask`) or restructure.
26) **A `PushStore` sees only what's committed after it exists.** Create it before the writer's first `Commit()`, and call `Commit()` after every batch of writes.

## Debugging

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Nothing renders anywhere after some point | exception in `props:`/`attrs:`/`data:`, or a string/`null` in a returned array | find the error in the console; guard the function; use `text()` |
| One element renders empty | exception in its children function or `Template()` (logged as `Error evaluating injector scope`) | fix the throwing code |
| View doesn't update after mutation | in-place mutation of a `@Value` array/object | reassign, or use `@State` |
| `data is not a function` | `data:` given a value | `data: () => value` |
| Whole component re-renders on small changes | Destructuring Trap | move reads into children functions |
| Input loses focus while typing | static `props` reading state | `props: () => ({ value })` |
| `@Watch` never fires | `Bound()` overridden without `super.Bound()` | call `super.Bound()` |
| Wrong value from a `gate()`/`scope()` after a condition flips | id-less calls made conditionally | add distinct ids |
| Inline helper shows a stale value | callback closes over a local from the first run | read reactive values inside the callback |
| `gate()` doesn't stop re-runs | gated value is a new object/array each time | gate a primitive, or use `@Computed` |
| Async value never resolves (shows a Promise) | callback lacks `async` | `async () => …` |
| Async value doesn't refresh | reactive read after `await` | read before the first `await` |
| `querySelector` in `Bound()` finds nothing | the element is rendered later by a change, not by the first render | reach it where it's rendered, or watch for it |
| Measured size is 0, or `focus()` does nothing, in `Bound()` | the host isn't in the document yet | move the work to `Connected()` |
| `Connected()` never fires | the tree was attached to a detached element and appended later | attach to an element that's already in the document |
| Manual service scope never updates | `ObservableScope.Create` with no reactive reads | `ObservableScope.Basic` |
| Test sees old DOM after a write | asynchronous rendering | `SYNC_SCHEDULING=true` or await a timeout |
| `ReferenceError: self is not defined` | importing `defaultDiffTreeWorker` on the main thread | write your own worker entry file |
| A page or region rebuilds although nothing visibly changed | a write assigned the same value again (common in routers and sync code) | write only changed values, or read through gate() |
| A watcher or scope over JSON.stringify/Snapshot never fires | snapshot reads register no dependencies | read properties directly, or JSON.stringify(ObservableNode.Clone(node)) |
| `Emitter.Emit: re-entry during emit is not supported` | a `Watch`/`OnUpdated` callback updates the scope or value that is notifying it | defer the write, or move it out of the callback |
| `scope() must be called within a watch context` inside `peek()` | tracking is off inside `peek` | call `scope()`/`gate()` outside the `peek` callback |
| `Key not found in store` from `StoreAsync.Patch` right after a `Write` | the key is an entity id flattened out of a write that hasn't been applied yet | await the `Write` first |
| Every `StoreAsync` change rejects with the same old error | an earlier change failed in the worker | fix that change; replace the store |
| A test's projection never updates | the test drives a `DiffTree` directly | call `tree.RunProjections()` after each write |
| `PushStore` never gets the writer's data | the worker wrote but didn't call `Commit()` | call `Commit()` after each batch |
| `PushStore` holds partial or missing roots that the writer has | the store was created after the writer's first `Commit()` | create the store with the worker, before any commit |
| Every `DiffTreeWriter` write throws the same old error | an earlier write in the batch failed | call `Commit()`: it sends the applied writes and the error, and the next batch starts clean |
| `RunProjections` throws on a `DiffTreeWriter` | projections run in `Commit()` | call `Commit()` instead |
| `PROJECTION_PREFIX` is `undefined`, projection keys read `"undefined<id>"` | imported from `j-templates/Store/Diff/diffTree`, its path before 8.1.0 | import it from `j-templates/Store/Diff` |

## Corrections from the v5 primer

For maintainers comparing against the previous `SYNTAX_PRIMER.md`. Builders can skip this section.

| Previous claim | Observed (8.0.18 and 8.0.19 unless a version is named) |
| --- | --- |
| `Injector` is not exported from any public entry point | exported from `j-templates/Utils` |
| `@Computed` returning `this.tasks` won't re-run on item property changes | it re-runs |
| a second un-ID'd `scope()`/`gate()` call silently resolves to the first | unconditional duplicates are independent; conditional ones mis-pair |
| exceptions in children functions/getters propagate uncaught | children-function and `Template()` exceptions are caught and logged; `props:`/`attrs:`/`data:` exceptions halt all rendering |
| children functions can't return `null`/`undefined` | allowed as the sole return value; forbidden inside arrays |
| `Bound()` runs with the DOM attached, after the template renders | before 8.0.23: ran before `Template()`, host detached and empty. Since 8.0.23: runs after the first render; the host is in the document only for the attached root, and `Connected()` marks entry into the document |
| `gate()` and `@Scope` are incompatible | fine for primitive-returning getters |
| `data: this.value` (non-function) in the granular-scopes example | throws `data is not a function` |
| `StoreAsync` data must be JSON-serialisable (no `Date`, `Map`, `Set`) | transport is structured clone: `Date`, `Map`, `Set` survive; class methods and functions do not |
| `.filter(Boolean)` is an anti-pattern for conditional rendering | works; strings and `null` in arrays are the real hazard |
| `SYNC_SCHEDULING=true` is the default for test runs | off unless set |
| "No compile step" | decorators and module resolution need TypeScript plus a bundler or runner |
| documents v8.0.16; see `docs/`, `examples/`, `src/` | package is 8.0.19 and ships none of those folders |
| Smart Tasks imports `./filter-bar` | not shown; supplied above |
| @Computed is backed by StoreSync and ApplyDiff | a gated scope + ObservableNode.Clone + ObservableNode.Apply; no store |
