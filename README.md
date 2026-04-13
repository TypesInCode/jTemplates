# j-templates

A type-safe, fine-grained reactive framework for building browser applications in TypeScript — with no compile step, no virtual DOM diffing, and no framework lock-in.

## Why j-templates?

- **Fine-grained reactivity** — Updates propagate at the property level, not the component level. Only the DOM nodes that depend on changed state are touched.
- **Zero compile step** — Pure TypeScript with experimental decorators. Works with any bundler (Vite, Webpack, Rollup).
- **Object identity preservation** — `@Computed` uses diff-based updates so downstream consumers receive the same reference when data hasn't structurally changed, enabling efficient DOM reuse without key-based reconciliation.
- **Proxy-based deep reactivity** — `@State` wraps objects and arrays in reactive proxies. Nested property writes and array mutations (`push`, `splice`, etc.) are tracked automatically.
- **Hierarchical dependency injection** — Components resolve dependencies through a parent-chain injector, making it easy to share services across a component tree.
- **Minimal dependencies** — Zero runtime dependencies. Only TypeScript as a dev dependency.

## Install

```bash
npm install j-templates
```

Requires `experimentalDecorators`, `emitDecoratorMetadata`, and `useDefineForClassFields: false` in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

## Hello World

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class HelloWorld extends Component {
  Template() {
    return div({}, () => "Hello world");
  }
}

const helloWorld = Component.ToFunction("hello-world", HelloWorld);
Component.Attach(document.body, helloWorld({}));
```

## Module Structure

| Module | Import Path | Exports |
|---|---|---|
| Core | `j-templates` | `Component`, `calc` |
| DOM | `j-templates/DOM` | 70+ HTML element factories (`div`, `button`, `table`, …), `text` |
| Store | `j-templates/Store` | `StoreSync`, `StoreAsync`, `ObservableScope`, `ObservableNode` |
| Utils | `j-templates/Utils` | `@Value`, `@State`, `@Scope`, `@Computed`, `@ComputedAsync`, `@Watch`, `@Inject`, `@Destroy`, `Animation`, `IDestroyable` |

## Reactive State

### `@Value` — Primitive reactive property

```typescript
import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, button } from "j-templates/DOM";

class Counter extends Component {
  @Value() count = 0;

  Template() {
    return div({}, () => [
      button({ on: { click: () => this.count-- } }, () => "-"),
      div({}, () => this.count),
      button({ on: { click: () => this.count++ } }, () => "+"),
    ]);
  }
}
```

### `@State` — Deep reactive objects and arrays

```typescript
import { State } from "j-templates/Utils";

class TodoList extends Component {
  @State() items: string[] = [];

  addItem(text: string) {
    this.items.push(text); // Triggers reactive update automatically
  }

  removeItem(index: number) {
    this.items.splice(index, 1); // Also tracked
  }
}
```

### `@Scope` — Computed value (new reference on change)

Best for cheap computations that return primitives or new arrays.

```typescript
import { Scope } from "j-templates/Utils";

class Stats extends Component {
  @Value() count = 0;

  @Scope()
  get doubled() { return this.count * 2; }
}
```

### `@Computed` — Computed value with object identity preservation

Best for expensive computations or when downstream consumers need stable references. Uses `StoreSync` + diff-based updates so the same object reference is returned when the structure hasn't changed.

```typescript
import { Computed } from "j-templates/Utils";

class TodoApp extends Component {
  @State() items: Todo[] = [];

  @Computed([])
  get completedItems(): Todo[] {
    return this.items.filter(t => t.done);
  }
}
```

### `@Watch` — React to state changes

```typescript
import { Watch, Value } from "j-templates/Utils";

class Logger extends Component {
  @Value() message = "";

  @Watch((self) => self.message)
  onMessageChanged(newValue: string) {
    console.log("message changed to:", newValue);
  }
}
```

## Template System

Element functions accept a config object and children:

```typescript
div({
  props: () => ({ className: "card" }),   // Reactive DOM properties
  attrs: { "aria-label": "card" },        // Static HTML attributes
  on: { click: () => handleClick() },      // Event handlers
  data: () => this.items,                  // Reactive data source
}, children)
```

### Reactive children

Pass a function as the second argument to make children reactive:

```typescript
div({}, () => `Count: ${this.count}`)  // Re-renders when count changes
```

### List rendering with `data`

The `data` property drives iterative rendering. Each item is mapped to a child via a callback:

```typescript
tbody({ data: () => this.items }, (item: Todo) =>
  tr({}, () => [
    td({}, () => item.text),
    td({}, () => item.done ? "Done" : "Pending"),
  ])
);
```

### Conditional rendering

Use ternary expressions inside reactive functions:

```typescript
div({}, () => this.isLoading ? "Loading…" : "Content");
```

Or use `data` with a falsy value to hide all children (like `*ngIf`):

```typescript
// When this.items is null/undefined/false, all children are destroyed
ul({ data: () => this.items }, (item) =>
  li({}, () => item.name),
);
```

## Component Architecture

Components are class-based with three generic type parameters:

```typescript
class MyComponent extends Component<Data, Templates, Events>
```

- **`Data`** — Shape of data passed to the component factory
- **`Templates`** — Interface describing injectable template slots
- **`Events`** — Interface describing events the component fires

### Lifecycle

1. **Constructor** — Avoid overriding. Use `Bound()` instead.
2. **`Bound()`** — Called after the component is attached to the DOM. Initialize state, start watchers, fetch data here.
3. **`Template()`** — Return the component's virtual DOM.
4. **`Destroy()`** — Cleanup. Automatically destroys all `@Value`/`@State`/`@Scope`/`@Computed` scopes and calls `.Destroy()` on `@Destroy`-decorated properties.

### Creating and mounting components

```typescript
// Convert class to factory function
const myComp = Component.ToFunction("my-comp", MyComponent);

// Mount to DOM
Component.Attach(document.body, myComp({ data: myData }));
```

### Component events

```typescript
interface ButtonEvents {
  click: { x: number; y: number };
}

class MyButton extends Component<void, void, ButtonEvents> {
  Template() {
    return button({
      on: { click: (e) => this.Fire("click", { x: e.clientX, y: e.clientY }) },
    }, () => "Click me");
  }
}
```

### Component composition with templates

```typescript
interface RowTemplate<D> {
  row: (data: D) => vNode;
}

class DataTable<D> extends Component<{ items: D[] }, RowTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.items }, (item: D) =>
      this.Templates.row(item)
    );
  }
}

// Usage — inject the row template
const table = Component.ToFunction("data-table", DataTable);
table({
  data: { items: myItems },
  templates: { row: (item) => tr({}, () => td({}, () => item.name)) },
});
```

## Dependency Injection

```typescript
import { Inject, Destroy } from "j-templates/Utils";

abstract class ApiService {
  abstract fetch(): Promise<Data[]>;
}

class DataView extends Component {
  @Inject(ApiService) api!: ApiService;
  @Destroy() subscription?: IDestroyable;

  Bound() {
    this.subscription = this.api.fetch();
  }
}
```

Injectors are hierarchical — if a dependency isn't found on the current component, the framework walks up the component tree to parent injectors.

## Stores

### `StoreSync` — Synchronous diff-based store

```typescript
import { StoreSync } from "j-templates/Store";

const store = new StoreSync((item) => item.id); // Key function for identity

store.Write({ id: "1", name: "Alice" });           // Write & diff
store.Patch("1", { name: "Bob" });                  // Deep merge patch
store.Push("1", "tags", "admin");                   // Push to nested array
const user = store.Get<User>("1");                  // Observable retrieval
```

### `StoreAsync` — Asynchronous diff-based store

Same API as `StoreSync`, but all mutations return `Promise` and diff computation runs in a Web Worker to keep the main thread free.

```typescript
import { StoreAsync } from "j-templates/Store";

const store = new StoreAsync((item) => item.id);
await store.Write({ id: "1", name: "Alice" });
```

## Observable Primitives

For advanced use cases, the reactive primitives are directly accessible:

### `ObservableScope` — Signal-like reactive scope

```typescript
import { ObservableScope } from "j-templates/Store";

const scope = ObservableScope.Create(() => count.value * 2);
const value = ObservableScope.Value(scope);    // Read (registers dependency)
const peeked = ObservableScope.Peek(scope);     // Read without registering
ObservableScope.Watch(scope, (v) => console.log(v));
```

### `ObservableNode` — Proxy-based deep reactivity

```typescript
import { ObservableNode } from "j-templates/Store";

const obj = ObservableNode.Create({ a: 1, b: { c: 2 } });
obj.a = 10;            // Triggers reactive update on leaf scope
const raw = ObservableNode.Unwrap(obj);  // { a: 10, b: { c: 2 } }
```

### `calc` — Memoized computed gatekeeper

```typescript
import { calc } from "j-templates";

// Inside a scope evaluation, only re-emits when value changes by ===
const memoized = calc(() => expensiveTransform(data));
```

## Animation

```typescript
import { Animation, AnimationType } from "j-templates/Utils";

const anim = new Animation(AnimationType.EaseIn, 1000, (next) => {
  element.style.opacity = String(next);
});
anim.Animate(0, 1); // Fades from 0 to 1 over 1000ms
```

## API Quick Reference

### Decorators

| Decorator | Target | Description |
|---|---|---|
| `@Value()` | Property | Reactive primitive (number, string, boolean) |
| `@State()` | Property | Deep reactive object/array via proxy |
| `@Scope()` | Getter | Cached computed value; new reference on change |
| `@Computed(default)` | Getter | Cached computed with identity preservation via diff |
| `@ComputedAsync(default)` | Getter | Async `@Computed` backed by `StoreAsync` |
| `@Watch(scopeFn)` | Method | Auto-subscribe method to reactive value changes |
| `@Inject(type)` | Property | Dependency injection from component injector |
| `@Destroy()` | Property | Auto-calls `.Destroy()` on property when component is destroyed |

### Component API

| Method | Description |
|---|---|
| `Template()` | Return virtual DOM — override in subclass |
| `Bound()` | Lifecycle hook — called after DOM attachment |
| `Destroy()` | Lifecycle hook — cleanup (auto-cleans decorators) |
| `Fire(event, data)` | Emit a component event |
| `Component.ToFunction(name, Class)` | Convert class to factory function |
| `Component.Register(name, Class)` | Register as Web Component (custom element) |
| `Component.Attach(node, vNode)` | Mount a vNode to a real DOM node |

### Store API

| Method | StoreSync | StoreAsync |
|---|---|---|
| `Write(data, key?)` | Sync | `Promise` |
| `Patch(key, patch)` | Sync | `Promise` |
| `Push(key, ...data)` | Sync | `Promise` |
| `Splice(key, start, del?, ...items)` | Sync | `Promise` |
| `Get(key)` | Sync | Sync |
| `Destroy()` | — | Stops async queue |

## Documentation

### Tutorials
- [Getting Started](docs/tutorials/01-getting-started.md)
- [Your First Component](docs/tutorials/02-your-first-component.md)
- [Reactive State Basics](docs/tutorials/03-reactive-state-basics.md)

### Patterns
- [Components](docs/patterns/01-components.md) — Component class, lifecycle, data passing, template functions, events, composition
- [Reactivity](docs/patterns/02-reactivity.md) — ObservableScope, ObservableNode, stores, decorators (@Value, @State, @Scope, @Computed, @Watch)
- [Templates & Data](docs/patterns/03-templates-and-data.md) — DOM element functions, reactive bindings, data modeling, animation
- [Dependency Injection](docs/patterns/04-dependency-injection.md) — Injector hierarchy, @Inject, @Destroy, IDestroyable

### Reference
- [Syntax & Best Practices](docs/SYNTAX_BEST_PRACTICES.md)

## Examples

- [Real-Time Dashboard](examples/real_time_dashboard/) — Full application example
- [Tutorial Project](examples/tutorial_project/) — Progressive tutorial series

## License

MIT