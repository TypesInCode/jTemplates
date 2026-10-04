# j-templates Syntax Primer

Oct 3, 2026 · @Jay Landrum

Reference for building apps with j-templates 8.0.19. Every behavioral claim was checked by running the library in jsdom; claims taken from type declarations or source alone are marked as such.

## How to use this document

Read Mental model, then Templates and State decorators before writing a component. Check the Traps checklist before shipping.

- **Version:** j-templates 8.0.19 (its runtime code is identical to 8.0.18; only two type declarations changed). Tested in jsdom with TypeScript (`experimentalDecorators`).
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
| `j-templates/Store` | `Store`, `StoreSync`, `StoreAsync`, `ObservableScope`, `ObservableNode` |

**Deep imports used below:** `j-templates/Store/Diff/diffTree` (`DiffTree`, `PROJECTION_PREFIX`), `j-templates/Store/Diff/diffTreeWorker` (`ConnectWorkerToDiffTree`), `j-templates/Node/vNode` (`vNode.Destroy`). `j-templates/Store/Diff/defaultDiffTreeWorker` runs worker code on import and throws outside a worker (`self is not defined`).

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
- `Bound()` / `Destroy()` — optional overrides. If you override either, call `super.Bound()` / `super.Destroy()`. `super.Bound()` starts `@Watch`; `super.Destroy()` tears down scopes and runs `@Destroy` properties.
- `Fire(event, payload?)` — sends a component event to the parent's `on:` handler. The payload is optional.
- `this.Data`, `this.Templates`, `this.Injector`, `this.VNode` (host vNode; `this.VNode.node` is the host element), `this.Destroyed`.
- Never override the constructor. Use field initializers and `Bound()`.

**Lifecycle (verified order):**

1. Field initializers run.
2. `Bound()` runs. The host element exists but is **not in the document and has no children**. `@Watch` handlers fire here with their initial values.
3. `Template()` runs.
4. Children functions run and build the DOM. By default this happens **after** `Attach` returns; with `SYNC_SCHEDULING=true`, before.
5. The host is in the document.

To touch rendered DOM from `Bound()`, defer with `requestAnimationFrame` or `setTimeout` (verified: host connected and children present by then). Attach native listeners to an element you render, not to the host.

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
- No store is involved. The getter runs inside an `ObservableScope.Gated` scope; each result is copied with `ObservableNode.Clone` and merged into an internal `ObservableNode` with `ObservableNode.Apply` (from source).
- `this.summary === this.summary` holds across updates, so `gate()` and identity-based item reuse see a stable reference.
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

- Fires once in `super.Bound()` with the initial value, then on every change.
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

These create a memoized child scope inside the scope currently being evaluated and return its value.

| Function | Parent re-runs when the value changes | Equality check | Use for |
| --- | --- | --- | --- |
| `scope(fn, id?)` | yes | none: parent re-runs on every emit | composing a value, especially async |
| `gate(fn, id?)` | yes | `!==` only | booleans and other primitives that change less often than their inputs |
| `peek(fn, id?)` | no | — | reading without subscribing |
| `mapped(data, fn, onUpdated?, onDestroyed?)` | yes | none | a per-item scope for one value (what `data:` does internally) |

Verified example: with `n` going from 0 to 1, `scope(() => n > 10)` re-runs the parent, `gate(() => n > 10)` and `peek(() => n > 10)` do not.

**Where they can be called.** Only while a scope is evaluating: children functions, `data:`/`props:`/`attrs:` functions, decorated getters, and `ObservableScope.Create` value functions. Elsewhere, including `on:` handlers, they throw `scope() must be called within a watch context` (or `gate()` / `peek()`; `mapped()` reports `scope()`).

**gate() with @Scope.** Works for a getter that returns a primitive: `gate(() => this.isEmpty)` suppresses re-runs while the boolean is unchanged. Useless for a getter that builds a new object or array each run, because every result is `!==` the last.

### How memoization matches calls

On each re-run of the parent, each call is matched to a scope from the previous run with the same key, in call order. The key is `id` if given, otherwise one default key per function. `mapped()` keys by the `data` object instead. Consequences:

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

A store holds reactive data under string keys and diffs every write into existing objects in place. Use `StoreSync` unless diffing large data blocks the main thread.

|  | `StoreSync` | `StoreAsync` |
| --- | --- | --- |
| Constructor | `new StoreSync(keyFunc?, projections?)` | `new StoreAsync(worker, keyFunc?)` |
| Diffing | main thread, synchronous | in the `Worker` you supply |
| Writes | `void`; readable immediately | `Promise`; readable only after `await` |
| `Destroy()` | none | required; terminates the worker |
| Backs | nothing (`@Computed` uses `ObservableNode` directly) | `@ComputedAsync` |

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

`StoreAsync` has the same methods; the four writers return promises.

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

### Projections

A projection is a derived value the store computes and stores under `$projection_<name>`. Pass them as `StoreSync`'s second argument (for `StoreAsync`, to the worker's `DiffTree`).

```typescript
import { PROJECTION_PREFIX } from "j-templates/Store/Diff/diffTree"; // "$projection_"

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
11. **`@Computed` returns a copy**, not the object the getter returned, and its identity never changes.
12. **`Bound()` runs before `Template()`**, with the host detached and empty. Defer DOM access with `requestAnimationFrame`. Forgetting `super.Bound()` silences `@Watch`.
13. **`@Watch` fires immediately** with the initial value, and coalesces synchronous changes into one call.
14. **Inline helpers outside a scope throw**, including in `on:` handlers.
15. **Conditional `scope()`/`gate()`/`peek()` calls need ids**, or a later call takes a skipped call's scope. Callbacks are fixed at first run: don't close over locals.
16. **Async scopes need the `async` keyword**, track only reads before the first `await`, and are `null` until resolved.
17. **Rendering is asynchronous** unless `SYNC_SCHEDULING=true`: the DOM is not updated on the line after a write, and not built when `Attach` returns.
18. **Native DOM listeners belong on elements you render**, not the host.
19. **`svg()` is HTML-namespace.** Use namespaced components or `innerHTML` for SVG.
20. **`ObservableScope.Create` with no reactive reads is static** and ignores `Update()`. Use `Basic`.
21. **`StoreAsync` writes must be awaited**; data crosses by structured clone (class methods are lost).
22. **The package needs a bundler or TypeScript runner**; plain Node cannot import it.

23) **Equal-value writes still notify.** Assigning the current value again re-runs every reader. Guard repeated writes or read through `gate()`.
24) **`JSON.stringify(node)` and `ObservableNode.Snapshot(node)` don't subscribe.** Read properties directly, or `ObservableNode.Clone(node)` to track everything.

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
| `querySelector` in `Bound()` finds nothing | children not built yet | `requestAnimationFrame(() => …)` |
| Manual service scope never updates | `ObservableScope.Create` with no reactive reads | `ObservableScope.Basic` |
| Test sees old DOM after a write | asynchronous rendering | `SYNC_SCHEDULING=true` or await a timeout |
| `ReferenceError: self is not defined` | importing `defaultDiffTreeWorker` on the main thread | write your own worker entry file |
| A page or region rebuilds although nothing visibly changed | a write assigned the same value again (common in routers and sync code) | write only changed values, or read through gate() |
| A watcher or scope over JSON.stringify/Snapshot never fires | snapshot reads register no dependencies | read properties directly, or JSON.stringify(ObservableNode.Clone(node)) |

## Corrections from the v5 primer

For maintainers comparing against the previous `SYNTAX_PRIMER.md`. Builders can skip this section.

| Previous claim | Observed in 8.0.18 and 8.0.19 |
| --- | --- |
| `Injector` is not exported from any public entry point | exported from `j-templates/Utils` |
| `@Computed` returning `this.tasks` won't re-run on item property changes | it re-runs |
| a second un-ID'd `scope()`/`gate()` call silently resolves to the first | unconditional duplicates are independent; conditional ones mis-pair |
| exceptions in children functions/getters propagate uncaught | children-function and `Template()` exceptions are caught and logged; `props:`/`attrs:`/`data:` exceptions halt all rendering |
| children functions can't return `null`/`undefined` | allowed as the sole return value; forbidden inside arrays |
| `Bound()` runs with the DOM attached, after the template renders | runs before `Template()`, host detached and empty |
| `gate()` and `@Scope` are incompatible | fine for primitive-returning getters |
| `data: this.value` (non-function) in the granular-scopes example | throws `data is not a function` |
| `StoreAsync` data must be JSON-serialisable (no `Date`, `Map`, `Set`) | transport is structured clone: `Date`, `Map`, `Set` survive; class methods and functions do not |
| `.filter(Boolean)` is an anti-pattern for conditional rendering | works; strings and `null` in arrays are the real hazard |
| `SYNC_SCHEDULING=true` is the default for test runs | off unless set |
| "No compile step" | decorators and module resolution need TypeScript plus a bundler or runner |
| documents v8.0.16; see `docs/`, `examples/`, `src/` | package is 8.0.19 and ships none of those folders |
| Smart Tasks imports `./filter-bar` | not shown; supplied above |
| @Computed is backed by StoreSync and ApplyDiff | a gated scope + ObservableNode.Clone + ObservableNode.Apply; no store |
