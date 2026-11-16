# j-templates Syntax Primer

Nov 15, 2026 · @Jay Landrum

Reference for building apps with j-templates 10.0.2. Every behavioral claim was checked by running the library in jsdom; claims taken from type declarations or source alone are marked as such.

## How to use this document

Read Mental model, then Templates and State decorators before writing a component. Check the Traps checklist before shipping.

- **Version:** j-templates 10.0.2. The 8.0.19 claims were tested in jsdom with TypeScript (`experimentalDecorators`). 8.0.21 changed `peek`, how `@Computed` notifies readers, and emitter re-entry. 8.0.23 moved `Bound()` after the first render and added `Connected()`. 8.0.24 fixed dotted projection reads through keyed entities. 8.0.27 batches `StoreAsync` changes. 8.1.0 moved the diff types and `PROJECTION_PREFIX` to `j-templates/Store/Diff`. 8.2.0 rewrote the DiffTree: routes, keyed projections, and projections called with their read values only. 9.0.0 reworked its diffs (`write`, `delete` and `splice` records; each keyed value at one home), and `Patch`, `Push` and `Splice` take a path inside a root. 10.0.0 added `ObservableDiffTree`, `HostPublisher`, `DiffTreeHub` and `DiffTreeEndpoint`, with one config object per tree and store; they replace `PushStore`, `DiffTreeWriter`, `WorkerQueue`, `ConnectWorkerToDiffTree` and `@ComputedAsync`. 10.0.1 added demand roots (`StoreAsync`'s `demand` and `Hold`) and root watches (`StoreSync`'s `watch`). 10.0.2 added promoted projection keys (a projection's `keyFunc`). Unreleased (this branch): `ObservableNode.Snapshot` is reactive, `ObservableNode.JSON` reads a snapshot without subscribing, and stores have `GetSnapshot(key)`; verified in Vitest. The claims for 8.2 on were checked against the test suite, and those marked verified by running them in Vitest with jsdom. Each earlier section was re-verified in jsdom against the version that changed it.
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
| `j-templates/Utils` | `Value`, `State`, `Computed`, `Scope`, `Watch`, `Inject`, `Destroy`, `Bound`, `Animation`, `AnimationType`, `Injector`, `SubscriptionManager`; types `IDestroyable`, `KeyFilter`, `ISubscriptionMatch` |
| `j-templates/Store` | `ReadStore`, `Store`, `StoreSync`, `StoreAsync`, `ObservableScope`, `ObservableNode`, `Opaque`; types `IStoreOptions`, `IStoreAsyncOptions`, `IStoreSyncOptions` |
| `j-templates/Store/Diff` | `PROJECTION_PREFIX`, `MESSAGE_PREFIX`, `FollowRoutes`, `DiffTreeEndpoint`; types: the route and projection definitions (`IRouteDefinitions`, `IRouteDefinition`, `IProjectionDefinitions`, `IProjectionDefinition`, `IReadsProjectionDefinition`, `IKeyedProjectionDefinition`, `IKeyFunc`), the tree's `IObservableDiffTreeConfig`, the batch types (`IDiffMethod`, `IDiffMethodBatch`), `DeliveryForm`, `ISubscribeOptions`, `IDiffPost`, `ISnapshotUpdate`, the channel's `IChannel`, `IHostRequest`, `IHostMessage`, `IConnectMessage`, `ISourcesMessage`, `IWorkerLease`, `ILocalLease`, and the endpoint's `IDiffTreeEndpoint` and its option types. Nothing that reads `window`, so a worker bundle can import it. |

**Deep imports used below:** `j-templates/Store/Diff/diffTree` (`DiffTree`), `j-templates/Store/Diff/observableDiffTree` (`ObservableDiffTree`), `j-templates/Store/Diff/hostPublisher` (`HostPublisher`), `j-templates/Store/Diff/channelClient` (`Subscribe`, `Once`, `ChannelClient`), `j-templates/Store/Diff/diffTreeHub` (`DiffTreeHub`), `j-templates/Store/Diff/diffTreeEndpoint` (`DiffTreeEndpoint`), `j-templates/Store/Diff/onConnect` (`OnConnect`), `j-templates/Utils/emitter` (`EmitterEvent`, for a store's `watchCallback`), `j-templates/Node/vNode` (`vNode.Destroy`). `j-templates/Store/Diff/defaultDiffTreeWorker` runs worker code on import and throws outside a worker (`self is not defined`).

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

A store holds reactive data under string keys and diffs every write into existing objects in place. Use `StoreSync` unless diffing large data blocks the main thread. Use `StoreAsync` when the tree lives in a worker, whether the main thread writes it, the worker produces the data itself, or both.

|  | `StoreSync` | `StoreAsync` |
| --- | --- | --- |
| Constructor | `new StoreSync(tree?, options?)`: `tree` is `hub.OpenLocal(name)`, an `ObservableDiffTree` (for routes), or left out for an empty tree of its own | `new StoreAsync(channel, options?)`; the channel may be `hub.Open(name)` |
| Options | `{ keyFunc?, roots?, opaque?, watch?, watchCallback? }`. `keyFunc` only for a tree with none to give: a lease's is the endpoint's and a given tree's its own, and giving one there too throws | `{ keyFunc?, roots?, opaque?, demand?, demandDebounce? }`. `keyFunc` only over a plain channel; a lease's is the endpoint's, and giving one too throws |
| Diffing | main thread, synchronous | in the worker's `ObservableDiffTree`, served by `HostPublisher` |
| Writes | `void`; readable immediately | `Promise`; batched per tick, readable once it resolves. Optional: without writes it's a read-only view of the tree |
| Changes from elsewhere | commits made on `store.Tree` | every commit the worker's tree makes, whatever caused it |
| `Destroy()` | stops applying commits; over a lease, releases it | required; unsubscribes and stops listening. Over a lease, releases it; over a channel, leaves the worker running |

### API

```typescript
Get<T>(key: string): T | undefined;          // reactive proxy; undefined if absent
Get<T>(key: string, defaultValue: T): T;     // creates the key with the default if absent
GetSnapshot<T>(key: string, defaultValue?: T): T | undefined; // the root as plain data, reactive (below)
Has(key: string): boolean;
Write(data: unknown, key?: string);          // replace/diff the value at key
Patch(path: string, patch: unknown);         // deep merge; throws "Key not found in store"
Push(path: string, ...items: unknown[]);     // append to the array at path
Splice(path: string, start: number, deleteCount?: number, ...items: unknown[]); // returns nothing; deleteCount omitted: to the end
```

`Patch`, `Push` and `Splice` take a root key or a dotted path inside a root the store holds: `store.Splice("doc.list", 0, 1)`, `store.Patch("doc.nested", { b: 2 })` (verified). A path in a root the store doesn't hold throws `Key not found in store`.

`GetSnapshot(key)` reads a root as plain data, for a reader that walks a large value or hands it to code that expects plain objects. It's `ObservableNode.Snapshot(store.Get(key))`, with a value root or an opaque root's raw value returned as it is (verified):

- **It reads the root as `Get` does**, so a demand root is subscribed while a scope reads it and released after (verified), and a watched root sees the reader.
- **A scope that reads it re-runs once for each post that changes anything in the root**, a keyed child's root included, and not for posts to other roots (verified). Readers through `Get`'s proxies still wake only for what they read.
- **The snapshot is cached and shared**: the same object until a post changes the root, then a new one that keeps every unchanged part (`===`) (verified). It isn't frozen: never mutate it, and don't return it from a `@Computed`, which merges into a plain result in place.
- To read it without subscribing, call it inside `peek()`, or use `ObservableNode.JSON(store.Get(key))`.

`StoreAsync` has the same methods; the four writers return promises. It also has `Flush()` and `Hold(key)` (see below).

### keyFunc and flattening

`keyFunc(value)` returns an id for any object (or `undefined`). On `Write`/`Push`, every nested object with an id is also stored under that id, so it can be patched directly while `Get` still returns the original shape.

```typescript
const store = new StoreSync(undefined, { keyFunc: (v: any) => v?.id });
store.Write([{ id: "a", done: false }, { id: "b", done: false }], "todos");
store.Patch("a", { done: true });              // targets the nested item by id
store.Get<Todo[]>("todos", [])[0].done;        // true
```

- The explicit `key` argument names the root, overriding `keyFunc` for it.
- If an id appears twice in one tree, the last object wins and both positions show it.
- An object without an id is reachable only through its explicit key. Get with an entity id returns that entity directly, the same object that appears in its list (verified).
- `Patch` merges deeply: `Patch("u", { profile: { age: 2 } })` keeps `profile.name`.

### StoreAsync and its worker

Supply a channel to a worker whose entry file hosts an `ObservableDiffTree`: a `Worker`, or a `MessagePort` to one. Any `keyFunc` or projections used for diffing must live in that file; the constructor's `keyFunc` only resolves ids on the main thread.

```typescript
// diff-worker.ts (bundled as its own worker entry)
import { ObservableDiffTree } from "j-templates/Store/Diff/observableDiffTree";
import { HostPublisher } from "j-templates/Store/Diff/hostPublisher";
HostPublisher(new ObservableDiffTree({ keyFunc: (v: any) => v?.id }), self as any);

// main thread
const worker = new Worker(new URL("./diff-worker.ts", import.meta.url), { type: "module" });
const store = new StoreAsync(worker, { keyFunc: (v: any) => v?.id });
await store.Write(todos, "todos");
store.Get("todos");   // defined once the write resolves
store.Destroy();      // when done
worker.terminate();   // the worker is yours to end
```

Data crosses the worker boundary by structured clone. Class instances arrive as plain objects without their methods; functions cannot be sent. Store plain data.

**The store subscribes to the tree.** On construction it sends `jt-subscribe` and applies every commit the tree posts, in arrival order: its own batches, other writers', and the worker's own work. A store created after the tree has committed starts from the committed state. `options.roots` limits the roots it receives (exact keys and `task_*` patterns); a root it writes but doesn't receive is never read back. The channel can carry the app's own messages too: `HostPublisher` and the store use `addEventListener` and handle only `jt-` messages.

**Batching (8.0.27).** Every `Write`, `Patch`, `Push` and `Splice` made in the same tick goes to the worker as one `jt-batch` and is applied in call order. The worker runs projections once per batch, after the last change, and commits. At most one batch waits behind the one in flight.

- A change's promise resolves on its batch's `jt-ack`, which the host sends after the commit's posts, so the change has been applied when it resolves. A commit the worker makes while the batch is in flight is applied too, but doesn't resolve it.
- You don't have to await a change before making the next one. `Patch`, `Push` and `Splice` accept a key whose `Write` is still pending, and `Patch` merges in the worker, on top of everything before it.
- The pending-key check covers only the key passed to `Write`. Entities that `keyFunc` will flatten out of that write don't exist yet: `Patch("a", …)` right after an un-awaited `Write([{ id: "a" }], "todos")` rejects with `Key not found in store` (verified). Await the write first.
- `await store.Flush()` waits for every batch sent before the call to be acknowledged, and resolves at once when none is in flight. It rejects with the first error among those batches. Changes made after it go in a later batch.
- **A failed batch rejects only itself.** When a change fails in the worker (for example `Splice` on a value that isn't an array), the calls after it and the batch's projections are skipped, what the batch applied before it is committed, and every change in that batch rejects with the error. Later batches carry on, and the next one's projections catch up. A projection that throws fails its batch the same way.

### Demand roots (10.0.1)

A `StoreAsync` receives its `roots` for as long as it lives. A root matching a `demand` pattern is received only while something reads it: reading it is the request.

```typescript
const results = new StoreAsync(hub.Open("engine"), {
  roots: ["counts", "revision"],   // always received
  demand: ["type:*"],              // received while read; exact keys and patterns ending in *
  demandDebounce: 1000,            // ms a root no one reads stays subscribed; the default
});

// In a children function, a @Computed getter or any reactive scope:
results.Get<TypeResult>(`type:${name}`);   // subscribes type:<name>; undefined until its first post

// Code that reads outside a scope holds the root instead:
const release = results.Hold("type:a");
// ... read results.Get("type:a") once it has arrived ...
release();
```

- **The first reactive read subscribes the root, alone,** at the next microtask: a root read and dropped before then is never subscribed. Its first post brings the tree's committed state of it; until then it reads as its default, the same as a root that doesn't exist. After that its commits arrive like any other root's; the tree posts nothing for a demand root no one reads.
- **The last reader going starts the release.** `demandDebounce` ms after the last scope that read it is destroyed, or stops reading it, the root is unsubscribed and deleted from the store. A reader that comes back first keeps it without subscribing again; one that comes after waits for a new first post.
- **Only reactive reads count.** `Get` or `GetSnapshot` in a scope counts. `Peek`, `peek()`, an `on:` handler or any other read outside a scope neither subscribes a root nor keeps it. `Hold(key)` does, until every hold's release function has been called. Holding a `roots` root does nothing; holding a key neither option names throws.
- `demand` needs `roots`: without it the constructor throws `StoreAsync: demand roots need roots…`, since a store that receives every root has none left to demand. A key both name is a `roots` root.
- A restarted tree (`hub.Restart`) gets every held demand root subscribed again, with its new state.
- **A reader of many demand roots re-runs once per root** as their first posts arrive, each its own message.
- With promoted projection keys (Projections, below), the demand patterns name the promoted roots: `demand: ["$projection_people_*"]`.

**Watching a root's readers.** Demand roots are built on a store watch any store can use: `StoreSync` takes `watch` (key patterns) and `watchCallback(rootKey, event)`, told when a watched root gains its first reactive reader (`EmitterEvent.SUBSCRIBED`, `0`) and when it loses its last (`EmitterEvent.UNSUBSCRIBED`, `1`; import `EmitterEvent` from `j-templates/Utils/emitter`). A read outside a scope reports nothing (verified). The callback runs inside the scope update that caused it: record the change and act on it later, without reading or writing the store. `watch` without a `watchCallback` throws. `StoreAsync` uses the watch for `demand`, so it takes neither option.

### Projections

A projection is a derived value the store computes and stores under `$projection_<name>`. Give them to the tree's root route, and the tree to `StoreSync` (for `StoreAsync`, to the worker's tree). The store takes the tree's keyFunc.

```typescript
import { PROJECTION_PREFIX } from "j-templates/Store/Diff"; // "$projection_"

import { ObservableDiffTree } from "j-templates/Store/Diff/observableDiffTree";

const store = new StoreSync(new ObservableDiffTree({ keyFunc: (v: any) => v?.id, routes: { "/": { projections: {
  activeCount: { reads: ["todos"], projection: (todos) => todos.filter((t) => !t.done).length },
  doubled: { reads: [`${PROJECTION_PREFIX}activeCount`], projection: (n) => n * 2 },
} } } }));
store.Write(todos, "todos");
store.Get<number>(`${PROJECTION_PREFIX}activeCount`);
```

- `projection(...values)`: one value per read, in `reads` order (verified). Before 8.2 a `keys` array came first; it's gone.
- `reads` entries: a path in the projection's route (`"todos"`, `"doc.owner.name"`), a path from the root with a leading `/` (`"/factor"`), an entity id from `keyFunc`, or another projection (`$projection_<name>`, chaining).
- A read that doesn't resolve passes `undefined`, and the projection still runs (verified: reads `["x", "y"]` with only `x` written pass `(1, undefined)`). A read of a projection that doesn't exist does the same. A projection re-runs when a read's value changes, and is skipped otherwise.
- A cycle throws on the first `RunProjections()` (`DiffTree projection cycle detected: /$projection_a -> /$projection_b -> /$projection_a`), not at construction (verified).
- A dotted read can pass through a keyed entity (`"doc.owner.name"`, where `owner` has an id). It reads the entity's own root, so a `Patch` to the entity reruns the projection with the new value (verified; before 8.0.24 such a read returned the stale embedded copy).
- **Wildcards match route segments only.** One route segment of a read may end in `*`: `"/row/*/name"` passes an object keyed by the matched segment, `{ "1": "a", "2": "b" }` (verified). A root-key pattern such as `"task_*"` throws at construction: `Invalid wildcard read task_*: only one route segment may end in *.` To derive from many entities, keep them in routes, or in one record root read by a keyed projection.
- `StoreSync` and the `StoreAsync` worker run projections for each batch. An `ObservableDiffTree`'s `Commit()` doesn't run them, nor do `DiffTree.WritePath`, `PatchPath`, `PushPath` and `SplicePath`: code that drives a `DiffTree` directly, such as a test, must call `tree.RunProjections()` after its writes (verified).

**Keyed projections** map one record by key. The output is a record with the same keys:

```typescript
labels: { read: "people", projection: (person, key) => person.hidden ? undefined : `${key}:${person.name}` },
// people { a: { name: "A" }, b: { name: "B", hidden: true } }  ->  $projection_labels { a: "a:A" }
```

- An entry the projection returns `undefined` for is left out. An entry whose value is the same object as on the last run keeps its output without a call: patching one of two entries calls the projection once (verified).
- `read` is one record, relative to the route or from the root with `/`, with no wildcard; a missing record reads as empty. Left out, it's the route's own state, without its projections' outputs.

**Promoted keys (10.0.2).** A projection's `keyFunc` gives each keyed value of its output a root of its own, so a subscriber can follow one entity instead of the whole output:

```typescript
people: {
  reads: ["raw"],
  projection: (raw) => raw.map((p) => ({ ...p, kind: "person" })),
  keyFunc: (v) => (v?.kind === "person" ? v.id : undefined),
},
// roots: $projection_people, and $projection_people_p1, $projection_people_p2
```

- Each outermost value the `keyFunc` keys is held at `<output>_<key>` as the same object the output holds, so the tree keeps one copy (verified: `ReadPath("$projection_people_p1") === ReadPath("$projection_people")[0]`). A store receives it like any root: name it in `roots`, or in `demand` to receive it only while read.
- A value that leaves the output has its root deleted, and a store then reads it as `undefined` (verified). An unchanged part of the output (the same object as last run) isn't walked, and keeps its roots.
- The key becomes part of a root key, which is a path's first segment: it must not contain `.` or `/` (escape them; nothing checks), and `<output>_<key>` must not match another projection's output name. A key appears once per output: two changed values with one key throw `Duplicate keys found in projection output`.
- Works on reads projections and keyed projections, in any route.

**Routes.** A route is a slice of the tree's state with projections of its own, addressed by a path such as `/row/1/`. The tree takes its route definitions by pattern; `"/"` is the root route:

```typescript
const tree = new ObservableDiffTree({ routes: {
  "/": { projections: { names: { reads: ["/row/*/name"], projection: (names) => names } } },
  "/row/{id}": {
    projections: { upper: { reads: ["name"], projection: (name) => name.toUpperCase() } },
    // keyFunc?: the route's own; routes?: child routes, e.g. "/note/{noteId}"
  },
} });
tree.WritePath("/row/1/name", "a");        // creates the /row/1/ instance
tree.RunProjections();
tree.ReadPath("/row/1/$projection_upper");  // "A"
tree.ReadPath("$projection_names");         // { "1": "a" }
tree.DeleteRoute("/row/1/");                // its state, child routes and outputs; wildcard reads drop it
```

- A route path is the route, then a dot path into its state after the last `/`: `/row/1/meta.name`. A write needs the dot path; `/row/1/` alone throws. An instance is created by the first write that matches its pattern.
- **Route state never reaches a store.** `Commit()` diffs the root route's keys only (verified: a commit after the writes above holds `$projection_names`, nothing under `/row/`). Expose what subscribers need through a root route projection.
- A route without a `keyFunc` uses its nearest parent's; the tree's is the root's.

### Opaque roots

A root that only grows with the data, such as a drawing of every row, is expensive to diff field by field and to read through proxies. List its key in the store's `opaque` option to hold it whole:

```typescript
const layoutConfig = { opaque: ["$projection_layout"] };   // the tree writes it whole, the store holds it whole
const store = new StoreSync(new ObservableDiffTree({ keyFunc, routes, ...layoutConfig }), layoutConfig);
const layout = store.Get<Layout>("$projection_layout"); // the raw value: no proxies inside it
```

- The key can be a written root or a projection's `$projection_<key>`. The tree writes it whole whenever it changes (`DiffTree.MarkOpaque`): a `StoreSync` marks the empty tree it creates (`new StoreSync(undefined, { opaque })`), and a tree it's given has the keys in its config. A store never marks a tree: a `StoreAsync` needs its worker's tree to have the keys in its config too. A store on a hub's tree needs the tree to write the key whole too: give both the same keys from a file both import (`new ObservableDiffTree({ endpoint, routes, ...searchConfig })`, `new StoreAsync(hub.Open("search"), searchConfig)`).
- `Get` returns the same reference until the root changes, and only that change updates its readers. A write that changes nothing updates no one.
- The value is the store's own: treat it as read-only. A change made inside it notifies no one, and under `StoreSync` it is also the `DiffTree`'s committed snapshot.
- Write the raw value. Don't pass an `Opaque` to `Write`, `Patch`, `Push` or `Splice`, at any depth: the store boxes the root itself, and a box written to a store isn't opened (under `StoreAsync` it arrives as a plain `{ value }`).
- An opaque root can't be read through a key: a `keyFunc` alias that resolves to one throws.

### ObservableDiffTree

An `ObservableDiffTree` is a `DiffTree` that delivers every `Commit()` to its subscribers: the tree's whole API (`WritePath`, `PatchPath`, `PushPath`, `SplicePath`, `ApplyDiff`, `DeleteRoot`, `DeleteRoute`, `RunProjections`, `MarkOpaque`, `ReadPath`, `Snapshot`, `Committed`, `CommittedKeys`), with `Commit()` delivering what it diffs. `StoreSync` subscribes to one it creates, exposed as `store.Tree`.

```typescript
import { ObservableDiffTree } from "j-templates/Store/Diff/observableDiffTree";
const tree = new ObservableDiffTree({ keyFunc, routes });   // and `endpoint`, `opaque`: IObservableDiffTreeConfig
const stop = tree.Subscribe({ roots: ["loading", "$projection_*"] }, post => { /* post.diff, post.seq */ });
tree.Subscribe({ roots: ["index", "task_*"], form: "snapshot" }, update => { /* update.roots, update.deleted */ });

tree.WritePath("loading", true);
tree.Commit();              // delivered now, before the work below
tree.WritePath("results", computeResults());
tree.RunProjections();      // Commit() doesn't run them
tree.Commit();

const { index, revision } = await tree.Once(["index", "revision"]); // the first commit holding both
```

- A subscription first gets the committed state of the roots it names, inside `Subscribe` and in the same shape as every later delivery, so one handler applies them all; nothing is sent when no root matches. Then every commit that touches them follows. Uncommitted writes arrive with the next commit. To subscribe again, clear what the earlier subscription delivered first.
- `roots` takes exact keys and patterns ending in `*`; omitted, every root. With a `keyFunc`, name the entity roots too (`task_*`): editing an entity commits only the entity's root, not the roots that refer to it.
- `"diff"` (the default) delivers diff records, which a store applies. `"snapshot"` delivers each changed root whole, the tree's committed value itself: read-only.
- Delivery is synchronous. A subscriber may write to another tree, but writing to or committing the tree delivering to it throws. A subscriber's error doesn't stop the others; `Commit()` throws it after.
- `SubscriberCount(key)` counts the subscriptions naming a key exactly, and `OnReleased(pattern, callback)` reports when a key loses its last one. Deleting the key is the caller's (`DeleteRoot` and `Commit`, from a timer: the callback can run inside a delivery).

### A worker's own commits

A worker that produces data itself (a computation's result, data it fetched) writes to its hosted tree and commits. The commit reaches every subscriber, the main thread's `StoreAsync` included, with no round trip. A store that never writes is a read-only view of the tree.

```typescript
// engine-worker.ts (bundled as its own worker entry)
const tree = new ObservableDiffTree({ keyFunc: (v: any) => v?.id, routes });
HostPublisher(tree, self as any);
self.addEventListener("message", async (e) => {
  if (e.data?.type !== "run") return;      // the app's own message, beside the jt- ones
  tree.WritePath("status", "running");
  tree.Commit();                           // posted now; projections not rerun
  tree.WritePath("results", await compute(e.data));
  tree.WritePath("status", "done");
  tree.RunProjections();
  tree.Commit();
});

// main thread
const store = new StoreAsync(worker, { keyFunc: (v: any) => v?.id });   // created whenever: it starts from the committed state
store.Get("results");   // reactive; undefined until a commit holds it
```

- Nothing reaches subscribers until `Commit()`, and a commit with no changes posts nothing. Errors in the worker's own writes throw to the worker's code; nothing is posted for them.
- `HostPublisher(tree, self)` serves the worker's own channel; `host.Serve(port)` serves a `MessagePort` it's given, so another worker can subscribe.
- Another worker subscribes over a port with `Subscribe(port, { roots, form: "snapshot" }, update => …)` and writes the roots it receives under a route of its own tree, which is never posted on. `Once(port, keys, { signal })` waits for the first commit that holds every key. Values arrive as structured-cloned copies.

### DiffTreeHub: trees by endpoint

On the main thread, a `DiffTreeHub` owns the app's trees. One key is one tree in the app's dependency graph, running in a worker or on the main thread. The hub creates each tree from a factory when it's first needed, hands out leases on it, connects each tree to the ones it follows, re-creates one on request, and ends each one when its last lease ends. It never carries data.

An **endpoint** describes a key once, as plain data: its name, what it follows and its keyFunc. The main thread registers it, the tree is built from it, and the trees that follow it read their paths from it. It imports nothing that reads `window`, so workers import the same definitions. The tree's own configuration (routes, projections, `opaque`) is one object given to its constructor, in a file only its worker imports; config its stores share with it, `opaque` say, goes in a file both import.

```typescript
// endpoints.ts: imported by the main thread and the workers
import { DiffTreeEndpoint } from "j-templates/Store/Diff/diffTreeEndpoint";
export const engineEndpoint = DiffTreeEndpoint.Define("engine", undefined, { keyFunc });
export const engineConfig = { opaque: ["view"] };   // shared by the engine's tree and its stores
export const traceEndpoint = DiffTreeEndpoint.Define("trace", remote => ({
  engine: remote(engineEndpoint, ["index", "task_*"]),   // { index: "/engine/index", "task_*": "/engine/task_*" }
}));
export const filterEndpoint = DiffTreeEndpoint.Define("filter", remote => ({
  trace: remote(traceEndpoint, ["$projection_count"]),
}));

// trace-tree.ts: builds the tree; the endpoint gives its keyFunc and a follow route per source
export const newTraceTree = () => new ObservableDiffTree({
  endpoint: traceEndpoint,
  routes: { "/": { projections: { count: { reads: [traceEndpoint.config.engine.index], projection: countOf } } } },
});

// trace-worker.ts: serves the tree and follows its sources into it
DiffTreeEndpoint.Host(traceEndpoint, newTraceTree(), self as any);

// main thread
import { DiffTreeHub } from "j-templates/Store/Diff/diffTreeHub";
const hub = new DiffTreeHub();
hub.Register(engineEndpoint, () => {
  const worker = new Worker(new URL("./engine-worker.ts", import.meta.url), { type: "module" });
  worker.postMessage({ type: "load", project });   // starting intent: runs on every start
  return worker;
});
hub.Register(traceEndpoint, () => new Worker(new URL("./trace-worker.ts", import.meta.url), { type: "module" }), {
  releaseDebounce: 5000,
});
hub.Register(filterEndpoint, newFilterTree);       // returns the tree: it runs on this thread

const engine = new StoreAsync(hub.Open("engine"), engineConfig);  // a worker's tree, over a port; held for the app's lifetime
const trace = new StoreAsync(hub.Open("trace"));    // starts trace; its lease on its source keeps engine open
const filter = new StoreSync(hub.OpenLocal("filter"));  // a tree on this thread, directly
// teardown: each store releases its lease
trace.Destroy();                                    // trace ends 5 s later unless reopened
hub.Restart("engine");                              // a new engine; every store on it starts over with it
hub.Destroy();                                      // every tree ended
```

- `Register(endpoint, factory)` creates nothing; the first lease does. The endpoint's sources come from its definition, and each must be registered before it. While a tree runs, the hub holds a lease on each source and gives the tree a port to it, again whenever either restarts.
- The factory returns a worker, or an `ObservableDiffTree` to run on this thread, which the hub hosts with the same `DiffTreeEndpoint.Host` on a channel of its own. The first start fixes the key's kind. A factory that returns neither, or the other kind on a restart, throws.
- `Open` returns an `IWorkerLease`, for `StoreAsync`; `OpenLocal` returns an `ILocalLease`, for `StoreSync`. A store given the other kind's lease doesn't compile, and opening a key as the other kind throws. Any number of stores may be opened on one tree. A store owns its lease, takes its keyFunc from the endpoint, and releases the lease on `Destroy()`.
- A `StoreSync` on a hub's tree shares it: a change from any store on it, and from the trees it follows, reaches every one of them before it returns.
- `DiffTreeEndpoint.Host(endpoint, tree, scope, { onFollow })` throws for a tree built from another endpoint, or from none when `endpoint` follows sources: build it with `new ObservableDiffTree({ endpoint })`. It applies each source's post at `/<source>/` and then, by default, runs the projections and commits. An `onFollow(tree, source)` replaces that, for a tree that acts at the end of the turn. An `onConnect(tree, source, port)` runs with each new port to a source, for a tree that also reads from the source outside the follow (a one-off `Once`); it may return a cleanup, which runs before the next port's call.
- **The tree is the source of truth.** `Restart` is the app choosing to start a tree over; the hub doesn't restart on `error`. Every store on the tree starts over with the new one, as when it first subscribed: its state is applied in place, so readers keep their objects, and the roots it lacks are deleted. Nothing a store wrote is written back, and changes the old tree hadn't acknowledged reject. State that must outlive a restart goes in a tree of its own, which the restarted tree follows.
- A tree is released when its last lease ends: at once, or after `releaseDebounce` ms, unless a lease is opened meanwhile. Releasing ends it and its leases on its sources. Keep a store open on a tree that must outlive every view.
- The hub tells each tree its sources first, on every start. `OnConnect` for a source the endpoint doesn't follow throws: at once if the list has arrived, otherwise when it does, as the worker's uncaught error (the `Worker`'s `error` event on the main thread). The factory runs again on `Restart` and on the next lease after a release, so it should send whatever the worker needs to start.
- `Unregister(name)` ends one tree, and throws while another registered endpoint follows it; `Destroy()` ends all of them, the last registered first. `KindOf(name)` says where a key's tree runs, once it has started.
- Keep a worker's factory a literal `new Worker(new URL(...), { type: "module" })` at registration: bundlers compile only that form into a worker bundle.
- A tree that wires its connections by hand serves itself with `HostPublisher` and follows with `OnConnect(source, port => …)` and a `ChannelSubscription`; `DiffTreeEndpoint.Host` does this for every source.

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
  private store = new StoreSync(undefined, { keyFunc: (v: any) => v?.id });
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
ObservableNode.Snapshot(node)         // cached plain copy; reactive
ObservableNode.JSON(node)             // the same cached plain copy, without subscribing
ObservableNode.Clone(value)           // replaces proxies with plain data, mutating plain containers in place; returns value
ObservableNode.CreateFactory(alias?)  // proxy factory with aliasing (used by stores)
```

- `Snapshot` returns the same object on repeated calls until a write. After a write, unchanged nested parts are shared (`===`) with the previous snapshot. Snapshots are **not frozen**; treat them as read-only.
- `JSON(node)`, `JSON.stringify(node)` and `node.toJSON()` use the cached snapshot. `Snapshot` and `JSON` return `undefined` for a value that isn't a node, and throw for `undefined` or `null`.
- **`Opaque`** (`j-templates/Store`) holds a value whole inside a node. Assign one (`node.view = new Opaque(view)`), push or splice it into a node's array, or return it inside a `@Computed` result. The node stores the box and every read opens it, so readers get the raw value, never proxied, and re-run only when the box is replaced. Array callbacks, `pop`, `shift`, `splice`'s removed items and a `sort` comparator get raw values too. Spread, `Object.assign`, property descriptors, snapshots and `JSON.stringify` give the raw value too, so an object composed from reads holds no box. `Unwrap` gives the node's storage, boxes included (`Create(Unwrap(node))` is `node` itself), and `Clone` keeps a box it's given: fine to write back into a node, not to a store.
- `ApplyDiff`, `ApplySplice` and `Touch` also exist; they are internal to the stores. `ApplyDiff` and `ApplySplice` deep-clone what they write, so the node never shares objects with the caller.

**`Snapshot` subscribes to the whole node; `JSON` subscribes to nothing.** A scope that reads `ObservableNode.Snapshot(node)` re-runs when anything under the node changes, a keyed child's root included, and not for changes outside it: `Snapshot(store.Get("doc").section)` ignores `doc`'s other fields (verified). It's one dependency, however large the node, where reading the same fields through the proxy registers one per field read. `ObservableNode.JSON(node)`, `JSON.stringify(node)` and `node.toJSON()` register nothing, and nor does `Snapshot` inside `peek()` (verified). Before this release `Snapshot` registered nothing too: code that relied on that reads `JSON` instead.

```typescript
const saver = ObservableScope.Gated(() => JSON.stringify(ObservableNode.Snapshot(state)));
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
3. For `StoreAsync`, stub `Worker` with an in-process shim: two `EventTarget`s that deliver structured-cloned copies a tick later, with a `HostPublisher` on one side. Await a timeout before reading a commit the worker made on its own:

```typescript
import { ObservableDiffTree } from "j-templates/Store/Diff/observableDiffTree";
import { HostPublisher } from "j-templates/Store/Diff/hostPublisher";

function fakeWorker(tree = new ObservableDiffTree()) {
  const main: any = new EventTarget(), inner: any = new EventTarget();
  const send = (to: EventTarget) => (d: unknown) =>
    setTimeout(() => to.dispatchEvent(new MessageEvent("message", { data: structuredClone(d) })));
  main.postMessage = send(inner); inner.postMessage = send(main); main.terminate = () => {};
  HostPublisher(tree, inner);
  return main;
}
const tree = new ObservableDiffTree({ keyFunc: (v: any) => v?.id });
const store = new StoreAsync(fakeWorker(tree), { keyFunc: (v: any) => v?.id });

tree.WritePath("a", { value: 1 });
tree.Commit();
await new Promise((r) => setTimeout(r, 10));
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
21. **`StoreAsync` writes must be awaited** before reading; data crosses by structured clone (class methods are lost). Changes in one tick are batched, and a failed change rejects every change in its batch, and only those.
22. **The package needs a bundler or TypeScript runner**; plain Node cannot import it.

23) **Equal-value writes still notify.** Assigning the current value again re-runs every reader. Guard repeated writes or read through `gate()`.
24) **`ObservableNode.Snapshot(node)` in a scope re-runs it for any change under the node; `ObservableNode.JSON(node)` and `JSON.stringify(node)` never do.** Pick by intent: `Snapshot` (or a store's `GetSnapshot`) to wake on the whole node, `JSON` or `peek()` to read without subscribing. Code written before this release that used `Snapshot` as a non-reactive read should use `JSON`.
25) **Don't update a scope from its own emit.** Calling `ObservableScope.Update(s)` from a `Watch(s, …)` callback, or any write that re-emits the emitter currently notifying, throws `Emitter.Emit: re-entry during emit is not supported` (verified). Defer the write (`queueMicrotask`) or restructure.
26) **A worker's own writes reach no one until `Commit()`, and `Commit()` doesn't run projections.** Call `RunProjections()` before it when the change should update them.
27) **An opaque value read and written elsewhere is plain data again.** A read opens the box, so writing the value into another node or returning it from `@Computed` proxies it there, and a `@Computed` result merges into it in place. Build from it, or box it again (`new Opaque(value)`). Never mutate it.
28) **Don't write to an `ObservableDiffTree` (or its `StoreSync`) from its own delivery.** A subscriber that writes to, commits or runs projections on the tree delivering to it throws `ObservableDiffTree: a subscriber can't write to or commit the tree delivering to it.` Write to another tree, or defer the write.
29) **Projections take only their read values** (`projection(todos)`, not `projection(keys, todos)`), and a read that doesn't resolve passes `undefined`: the projection runs anyway.
30) **Projection wildcards match route segments, not root keys.** `"/row/*/name"` works; `"task_*"` throws at construction.
31) **A demand root reads as undefined until its first post, and is deleted after its readers go.** Only reactive reads subscribe it; code outside a scope holds it with `Hold`.
32) **A promoted key can't contain `.` or `/`**, and nothing checks: escape keys that might.

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
| A watcher or scope over `JSON.stringify(node)` or `ObservableNode.JSON(node)` never fires | they register no dependencies | read `ObservableNode.Snapshot(node)` instead |
| A scope re-runs on every change to a node it only meant to read once | it reads `ObservableNode.Snapshot(node)`, which subscribes to the whole node (since this release) | read `ObservableNode.JSON(node)`, or the snapshot inside `peek()` |
| `Emitter.Emit: re-entry during emit is not supported` | a `Watch`/`OnUpdated` callback updates the scope or value that is notifying it | defer the write, or move it out of the callback |
| `scope() must be called within a watch context` inside `peek()` | tracking is off inside `peek` | call `scope()`/`gate()` outside the `peek` callback |
| `Key not found in store` from `StoreAsync.Patch` right after a `Write` | the key is an entity id flattened out of a write that hasn't been applied yet | await the `Write` first |
| Every `StoreAsync` change in one batch rejects | one change in the batch failed in the worker, or a projection threw | fix that change; later batches apply as usual |
| A test's projection never updates | the test drives a `DiffTree` directly | call `tree.RunProjections()` after each write |
| `StoreAsync` never gets the worker's own data | the worker wrote but didn't call `Commit()` | call `Commit()` after the work |
| A worker commit arrives but projections are stale | `Commit()` doesn't run projections | call `RunProjections()` before `Commit()` |
| `StoreAsync.Destroy()` leaves the worker running | by design: the creator terminates it | call `worker.terminate()` over a plain channel; over a hub lease, `Destroy()` releases it |
| A projection's values are shifted by one: its first parameter holds the first read, its last is `undefined` | code written for 8.1's `projection(keys, ...values)` | drop the `keys` parameter |
| `Invalid wildcard read task_*: only one route segment may end in *.` | a projection read names root keys by pattern | read a route wildcard (`"/task/*/"`), or keep the entities in one record and use a keyed projection |
| `DiffTree projection cycle detected: …` on the first run | two projections read each other | break the cycle |
| `StoreAsync: demand roots need roots…` | `demand` given without `roots` | list the roots the store always receives |
| A demand root stays undefined | it's read outside a scope, or its first post hasn't arrived | read it in a scope, or `Hold` it; render a loading state until it arrives |
| `Duplicate keys found in projection output` | a projection's `keyFunc` keys two values of one output the same | make the keys unique in the output |
| `watchCallback must be provided when passing watch properties` | `StoreSync` given `watch` without `watchCallback` | pass both |

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
