# j-templates

A small TypeScript library for building browser UIs that keep themselves in sync. You describe your UI as functions that read your data, and when a piece of data changes, exactly the parts of the page that read it update — nothing else does.

- Plain TypeScript classes. No JSX, no template files, no extra build step beyond the TypeScript compiler you already have.
- Updates are surgical: typing in an input, adding to a list, clicking a counter — each only touches the elements involved.
- Zero runtime dependencies.

## Getting started

Install:

```bash
npm install j-templates
```

j-templates uses TypeScript decorators, so your `tsconfig.json` needs these two flags:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

Your first component:

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

That's the whole model:

1. **A component describes its UI in `Template()`.** Element functions like `div` and `button` take a config object and children. When children are a function, they re-run whenever the data they read changes — so the UI stays current without you touching the DOM.
2. **Reactive data lives on the component.** Fields marked with `@Value()` and `@State()` are the data your UI can depend on.

## A task list, start to finish

One small app shows the whole component model: a parent that owns the task list, and a child that renders one task. The comments carry the API:

```typescript
import { Component, gate } from "j-templates";
import { Value, State, Scope, Watch } from "j-templates/Utils";
import { div, h1, ul, li, input, button, text, fragment } from "j-templates/DOM";

interface Task {
  id: number;
  name: string;
  done: boolean;
}

let nextId = 1;

// The child. Component takes three type parameters, in this order:
//   Data      — what the parent passes in (read as this.Data)
//   Templates — which parts of the UI the caller customizes (see below)
//   Events    — what this component reports back to the parent
interface TaskItemEvents {
  toggle: { id: number };
  remove: { id: number };
}

class TaskItem extends Component<Task, void, TaskItemEvents> {
  Template() {
    return li({
      // props can be a static object, or a function that re-runs when
      // the data it reads changes.
      props: () => ({ className: this.Data.done ? "task done" : "task" }),
    }, () => [
      // text() renders a string; the function re-runs on change.
      text(() => this.Data.name),
      // Fire() reports a typed event to the parent. The child never
      // touches the list — the parent decides what a toggle means.
      button({ on: { click: () => this.Fire("toggle", { id: this.Data.id }) } }, () => "✓"),
      button({ on: { click: () => this.Fire("remove", { id: this.Data.id }) } }, () => "×"),
    ]);
  }
}

// ToFunction turns the class into a function you call from a parent's
// template to create the child.
const taskItem = Component.ToFunction("task-item", TaskItem);

// The parent owns the state.
class TaskApp extends Component {
  // @State() deeply tracks plain objects and arrays: push, splice, and
  // editing a nested field all update the UI — no manual re-render.
  @State() tasks: Task[] = [];
  // @Value() tracks a raw value. Best for scalars like string, number, or boolean.
  @Value() draft = "";

  // A plain getter is reactive when it reads reactive state: the UI
  // reading it re-runs whenever a task changes.
  get openTasks() {
    return this.tasks.filter((t) => !t.done);
  }

  // Cheap derived value: @Scope caches it and re-runs when the input
  // changes. (For a new composite object read in several places, use
  // @Computed() instead — see below.)
  @Scope()
  get openCount(): number {
    return this.openTasks.length;
  }

  // @Watch(fn) runs the method when the value fn reads changes — and
  // once with the initial value when the component mounts. Use it for
  // side effects that don't belong in the UI: fetch, log, sync.
  // openTasks reads every task's done flag, so this fires on add,
  // remove, and toggle alike.
  @Watch((self) => self.openTasks)
  persist() {
    localStorage.setItem("tasks", JSON.stringify(this.tasks));
  }

  // Bound() runs once after the component appears in the page: fetch
  // data, open subscriptions, start timers here.
  Bound() {
    super.Bound(); // required — this is what activates @Watch
    const saved = localStorage.getItem("tasks");
    if (saved) this.tasks = JSON.parse(saved);
  }

  // Destroy() runs when the component leaves the page: clean up
  // whatever Bound() started. Reactive fields are cleaned up for you.
  Destroy() {
    super.Destroy();
  }

  addTask() {
    const name = this.draft.trim();
    if (!name) return;
    this.tasks.push({ id: nextId++, name, done: false });
    this.draft = "";
  }

  Template() {
    return div({}, () => [
      // A children function re-runs only when the data it reads changes —
      // typing in the input below never re-runs this line.
      h1({}, () => `${this.openCount} open`),
      // For inputs, props must be a function: a static props object
      // makes the field lose focus as you type.
      input({
        props: () => ({ value: this.draft, placeholder: "What needs doing?" }),
        on: {
          input: (e: Event) => (this.draft = (e.target as HTMLInputElement).value),
          keydown: (e: KeyboardEvent) => e.key === "Enter" && this.addTask(),
        },
      }),
      // fragment() creates a dedicated reactive scope without adding another
      // element to the DOM. This prevents the sibling elements from being rebuilt
      // when the gate() conditional changes.
      fragment({}, () =>
        // gate is an inline scope helper that only emits a change to the parent
        // scope when the calculated value actually changes (=== comparison).
        gate(() => this.tasks.length === 0)
          ? div({}, () => "Nothing yet — add a task.")
          : ul({ data: () => this.tasks }, (task) =>
              // data: renders one child per item and keeps the list in
              // sync as the array grows and shrinks.
              taskItem({
                // data: passes the item down as a reactive getter.
                data: () => task,
                // on: handles the events the child fires.
                on: {
                  toggle: ({ id }) => {
                    const t = this.tasks.find((x) => x.id === id);
                    if (t) t.done = !t.done; // editing a nested field updates the UI
                  },
                  remove: ({ id }) => {
                    const i = this.tasks.findIndex((x) => x.id === id);
                    if (i !== -1) this.tasks.splice(i, 1);
                  },
                },
              })
            )
      ),
    ]);
  }
}

const app = Component.ToFunction("task-app", TaskApp);
// Attach mounts the component into the real DOM.
Component.Attach(document.body, app({}));
```

That's the whole component contract: data flows down with `data:`, events flow up with `on:` and `Fire`, and each side only touches its own state.

### Choosing a derived value

| Decorator | Use it when |
|---|---|
| plain getter | A simple derived read of reactive state — no caching, no overhead. |
| `@Scope()` | A cheap derived value: a primitive, or a filter/sort of existing references. Cached, new reference each update. |
| `@Computed()` | A new composite object read in several places. The same reference is preserved across updates. |
| `@ComputedAsync(initialValue)` | Same as `@Computed()`, but update work runs off the main thread; getter must be synchronous. |

A value that comes from a promise uses `scope()` (from `j-templates`) inside a `@Scope()` getter — the UI shows nothing until the first result arrives, and keeps the old value while a new one is pending. Read any reactive state before the first `await`; reads after `await` are not tracked:

```typescript
import { scope } from "j-templates";

@Scope()
get summary(): string {
  // this.openCount is read before the await, so the fetch re-runs when it changes.
  // async keyword is required by the framework to identify async functions.
  return scope(async () => (await fetch(`/api/summary?open=${this.openCount}`)).text());
}
```

## Let callers decide how part of the UI looks

Sometimes a component knows the *structure* (a list, a card, a table) and the caller knows how each piece should *look*:

```typescript
import { vNode } from "j-templates/Node/vNode.types";

// The second type parameter declares the slots the caller can fill.
interface CardTemplates {
  // function can have an arbitrary signature
  footer: () => vNode;
}

class Card extends Component<{ title: string }, CardTemplates> {
  Template() {
    // Template return type is vNode | vNode[]
    return [
      h2({}, () => this.Data.title),
      // the caller's UI, placed by the component
      this.Templates.footer(),
    ];
  }
}

const card = Component.ToFunction("card", Card);

// The caller passes data first, slots second.
card(
  { data: () => ({ title: "Profile" }) },
  { footer: () => button({}, () => "Edit") }
);
```

## Share services across components

When several components need the same service — an API client, a live connection, a theme provider — declare it with `@Inject`:

```typescript
import { Inject, Destroy } from "j-templates/Utils";

abstract class Api {
  abstract fetchTasks(): Promise<Task[]>;
}

// Provide the service at the top of the app. Every component below can
// ask for it — no threading the dependency through data:
class App extends Component {
  @Destroy() @Inject(Api) api = new ApiClient();
}

// …and consume it anywhere below.
class TaskList extends Component {
  @Inject(Api) api!: Api;

  Bound() {
    super.Bound();
    this.api.fetchTasks().then((tasks) => { /* … */ });
  }
}
```

Use `@Destroy` for properties that hold a resource — an open subscription, a timer, a socket. When the component leaves the page, j-templates calls `.Destroy()` on it:

```typescript
import { Destroy, IDestroyable } from "j-templates/Utils";

class LiveStats extends Component {
  @Destroy() feed!: IDestroyable;

  Bound() {
    this.feed = openFeed((stats) => { this.stats = stats; });
  }
}
```

Instead of a wrapper component, you can pre-configure the context a component is created in. `Injector.Provide` binds values to a fresh context and runs the creation inside it — the created component and everything beneath it can inject from it:

```typescript
import { Injector } from "j-templates/Utils";

// Bind the services once, create the whole app inside that context.
const root = Injector.Provide(
  (injector) => {
    injector.Set(Api, new ApiClient());
    injector.Set(Theme, "dark");
  },
  () => app({}),
);
Component.Attach(document.body, root);
```

A context built inside another inherits from it — an inner binding shadows the outer one. Values in a provided context belong to you, not the component tree: the tree won't destroy them. For a service that must be cleaned up, keep a reference to the injector and call `injector.Destroy()` — it destroys every binding that has a `.Destroy()` method — from your own teardown. The wrapper pattern above does that automatically via `@Destroy()`.

## Keep the page in sync with a server

A store is a keyed collection of records that UI can read. When a record changes, only the parts of the page displaying that record update. Most apps only need `StoreSync`:

```typescript
import { StoreSync } from "j-templates/Store";

const users = new StoreSync((user) => user.id); // which field identifies a record

users.Write({ id: "1", name: "Alice", role: "dev" });
const alice = users.Get("1");         // UI reading this updates when the record changes
users.Patch("1", { name: "Alicia" }); // partial update
users.Push("1", "tags", "admin");     // append to an array field
```

For very large or fast-moving data (message feeds, real-time dashboards), use `StoreAsync` — same API, but the page stays responsive while it updates:

```typescript
import { StoreAsync } from "j-templates/Store";

// Only stores plain JSON data (no class instances, `Date`, `Map`, or the like),
// and you call `Destroy()` on it when you're done. Writes return promises:
const metrics = new StoreAsync((m) => m.id);
await metrics.Write({ id: "cpu", label: "CPU" });
```

## Animate a value over time

`Animation` calls a function on every frame while a value travels from A to B:

```typescript
import { Animation, AnimationType } from "j-templates/Utils";

const fade = new Animation(AnimationType.EaseIn, 400, (next) => {
  box.style.opacity = String(next);
});
fade.Animate(0, 1); // 0 → 1 over 400 ms
```

## Use components in pages that don't use j-templates

`Register` publishes a component as a standard web component:

```typescript
Component.Register("my-widget", MyWidget);
```

From then on, `<my-widget></my-widget>` works in any HTML page — a React app, an Angular page, a hand-rolled page, anything. The component renders into its own shadow DOM, so page styles don't leak in and the component's styles don't leak out.

## Test components

Components render into the DOM, so a test mounts one, changes its data, and checks the page. Vitest runs the tests in Node with a fake DOM — no browser needed:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // a fake DOM — the component renders into it like a real page
    environment: "jsdom",
    // apply updates immediately instead of waiting for the next frame
    env: { SYNC_SCHEDULING: "true" },
  },
});
```

The component under test:

```typescript
import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, button } from "j-templates/DOM";

class Counter extends Component {
  @Value() count = 0;

  Template() {
    return div({}, () => [
      div({}, () => `Count: ${this.count}`),
      button({ on: { click: () => this.count++ } }, () => "Add one"),
    ]);
  }
}

const counter = Component.ToFunction("counter", Counter);
```

A test is: attach, check, change, check again. The factory's result exposes the component instance, so you can drive the state directly — or find the rendered elements and use them like a user:

```typescript
import { describe, it, expect } from "vitest";
import { Component } from "j-templates";
import { counter } from "./counter";

describe("Counter", () => {
  it("updates the page when the data changes", () => {
    const vnode = counter({});
    Component.Attach(document.body, vnode);

    expect(document.body.textContent).toContain("Count: 0");

    // drive the state directly through the component
    (vnode.component as Counter).count = 3;
    expect(document.body.textContent).toContain("Count: 3");

    // empty the page between tests
    document.body.innerHTML = "";
  });

  it("counts clicks", () => {
    const vnode = counter({});
    Component.Attach(document.body, vnode);

    const addButton = document.querySelector("button")!;
    addButton.click();
    addButton.click();

    expect(document.body.textContent).toContain("Count: 2");
    document.body.innerHTML = "";
  });
});
```

Run them with `npx vitest`, or add a `"test": "vitest run"` script to package.json.

## Quick reference

### Decorators

| Decorator | Goes on | What you get |
|---|---|---|
| `@Value()` | property | A reactive scalar (number, string, boolean). UI reading it updates when it changes. |
| `@State()` | property | A reactive plain object or array. Changes anywhere inside it are tracked. |
| `@Scope()` | getter | A cached cheap derived value — a primitive, or a filter/sort of existing refs. New reference each update. |
| `@Computed()` | getter | A cached new composite object. The same reference is preserved across updates. |
| `@ComputedAsync(initial)` | getter | Same as `@Computed()`, but update work runs off the main thread; getter must be synchronous. |
| `@Watch(fn)` | method | Runs the method when the value read by `fn` changes — and once with the initial value on mount. |
| `@Inject(service)` | property | Gets a shared service from the component tree. |
| `@Destroy()` | property | Calls the property's `.Destroy()` when the component is removed. |

### Element config

Every element function takes `(config, children)`:

| Key | What it does |
|---|---|
| `props` | DOM properties. A static object, or a function for properties that depend on reactive data. |
| `attrs` | HTML attributes (`aria-label`, `data-*`, …). A static object, or a function for reactive values. |
| `on` | Event handlers: `on: { click: (e) => … }`. |
| `data` | An array renders one child per item; a single non-array value is passed to the child once; falsy renders no children. |
| children | A string, an array of elements, or a function that re-runs when the data it reads changes. |

### What's in each import

| Import | What you get |
|---|---|
| `j-templates` | `Component`, plus `gate`, `peek`, `scope`, and `mapped` for advanced cases |
| `j-templates/DOM` | A function per HTML element — `div`, `button`, `input`, `table`, … — plus `text` and `fragment` |
| `j-templates/Utils` | The decorators above, plus `Animation`, and `Injector` for setting up services |
| `j-templates/Store` | `StoreSync` and `StoreAsync`, plus the low-level reactive primitives for advanced use |

## Learn more

- [Tutorials](docs/tutorials/index.md) — eight hands-on lessons, from setup to a complete app
- [Pattern docs](docs/patterns/index.md) — components, reactivity, templates, and dependency injection in depth
- [Syntax primer](docs/SYNTAX_PRIMER.md) — the complete reference, including the traps
- [Examples](examples/)
  - [smart-tasks](examples/smart-tasks/) — a task manager: components, events, and filtering
  - [real_time_dashboard](examples/real_time_dashboard/) — a live-updating dashboard with stores and injected services
  - [tutorial_project](examples/tutorial_project/) — the working projects from the tutorials

## License

MIT
