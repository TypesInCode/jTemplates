# Templates & Data

## Overview

j-templates provides a functional template system built on virtual nodes (vNodes). DOM element functions like `div()`, `button()`, and `table()` create lightweight vNode trees. Reactive bindings — arrow functions passed as `props`, `on`, `attrs`, or `data` — automatically re-render when dependencies change. Data stores (`StoreSync`, `StoreAsync`) and TypeScript interfaces provide structured, type-safe data flow.

## Element Functions

Every HTML element is exposed as a factory function imported from `j-templates/DOM`:

```typescript
import { div, span, h1, button, input, table, tbody, tr, td, thead, th } from "j-templates/DOM";
```

Each function has the same signature:

```typescript
element<P, E, T>(
  config?: {
    props?: FunctionOr<RecursivePartial<P>>;
    attrs?: FunctionOr<{ [name: string]: string }>;
    on?: FunctionOr<vNodeEvents<E>>;
    data?: () => T | T[] | Promise<T> | Promise<T[]>;
  },
  children?: vNodeType[] | ((data: T) => vNodeType | vNodeType[] | string),
): vElementNode
```

| Property | Type | Description |
|---|---|---|
| `props` | `FunctionOr<RecursivePartial<P>>` | DOM properties. Pass a function for reactivity: `props: () => ({ className: "active" })`. |
| `attrs` | `FunctionOr<{ [name: string]: string }>` | HTML attributes. Pass a function for reactivity. |
| `on` | `FunctionOr<vNodeEvents<E>>` | Event handlers. |
| `data` | `() => T \| T[] \| Promise<T> \| Promise<T[]>` | Reactive data source. Drives iterative rendering when used with a children function. |

**`FunctionOr<T>`** means the value can be either `T` directly (static) or a function `() => T` (reactive).

### Static children

Pass an array of vNodes:

```typescript
div({}, [
  h1({}, "Title"),
  span({}, "Content"),
]);
```

### Reactive text

Use a function that returns a string. The framework creates an `ObservableScope` from the function and updates the text node when dependencies change:

```typescript
div({}, () => `Count: ${this.count}`);
```

### The `text` function

Creates a reactive text node:

```typescript
import { text } from "j-templates/DOM";

text(() => someReactiveValue);
```

## Reactive Bindings

### Props

Pass a function for `props` to make them reactive. The function is evaluated in an `ObservableScope`, so any reactive reads inside it create dependencies:

```typescript
div({
  props: () => ({ className: this.isActive ? "active" : "inactive" }),
}, () => "Content");
```

### Events

Event handlers are static by default. The `on` object maps DOM event names to handler functions:

```typescript
button({
  on: { click: (e: MouseEvent) => this.handleClick(e) },
}, () => "Click me");
```

### Data-driven lists

The `data` property drives iterative rendering. When `data` is provided, the second argument becomes a function that receives each item:

```typescript
tbody({ data: () => this.items }, (item: Todo) =>
  tr({}, () => [
    td({}, () => item.text),
    td({}, () => item.done ? "Done" : "Pending"),
  ]),
);
```

When the data array changes, the framework efficiently reconciles children using identity-based diffing (small arrays use linear scan, large arrays use `Map`-based lookup).

### Conditional rendering with data

When `data` returns a falsy value (`null`, `undefined`, `0`, `false`, `""`), the framework converts it to an empty array `[]` and **destroys all children**. This provides `*ngIf`-style show/hide behavior — all child vNodes and their DOM elements are removed:

```typescript
// Show the list only when items is truthy; hide all children when falsy
ul({ data: () => this.items }, (item) =>
  li({}, () => item.name),
);
```

When `this.items` becomes `null` or `undefined`, all `<li>` children are destroyed and removed from the DOM. When `this.items` becomes truthy again, children are recreated from the new data.

### Conditional rendering with ternary

Use ternary expressions inside reactive functions:

```typescript
div({}, () => this.isLoading ? "Loading…" : "Content");
```

### Two-way binding

Combine `props` and `on` to create two-way data binding:

```typescript
input({
  props: () => ({ value: this.searchText }),
  on: { input: (e: Event) => { this.searchText = (e.target as HTMLInputElement).value; } },
});
```

## Component Composition in Templates

Component factory functions (created with `Component.ToFunction`) are used directly in templates:

```typescript
import { numberCard } from "./components/number-card";

class Dashboard extends Component {
  Template() {
    return div({ props: { className: "dashboard" } }, () => [
      numberCard({ data: () => ({ title: "Total Visits", value: 142 }) }),
      numberCard({ data: () => ({ title: "Total Time", value: 3800 }) }),
    ]);
  }
}
```

## Data Modeling

### Domain interfaces

Define TypeScript interfaces for domain entities and display objects:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  url: string;
  time_spent: number;
  user: User;
}
```

### DTO pattern

Flatten or transform domain models for display purposes:

```typescript
export interface ActivityRow {
  timestamp: string;
  url: string;
  time_spent: number;
  user: { name: string };
}

function toActivityRow(activity: Activity): ActivityRow {
  return {
    timestamp: activity.timestamp,
    url: activity.url,
    time_spent: activity.time_spent,
    user: { name: activity.user.name },
  };
}
```

### Type-safe data in components

Component generics ensure `this.Data` is typed:

```typescript
class UserProfile extends Component<{ user: User }> {
  Template() {
    return div({}, () => [
      h1({}, () => this.Data.user.name),
      div({}, () => this.Data.user.email),
    ]);
  }
}
```

### Store operations

```typescript
const store = new StoreSync((value) => value.id);

store.Write({ id: "1", name: "Alice" });           // Write & diff
store.Patch("1", { email: "alice@example.com" });   // Deep merge
store.Push("1", "tags", "admin");                   // Push to nested array
store.Splice("1", "tags", 0, 1);                    // Splice nested array
const user = store.Get<User>("1");                  // Observable retrieval
```

### Object sharing with key functions

When two objects share the same key, the store reconciles them to a single instance:

```typescript
const store = new StoreSync((value) => value.id);

store.Write({ id: "act-1", user: { id: "usr-1", name: "John" } });
store.Write({ id: "act-2", user: { id: "usr-1", name: "John" } });

// Both activities reference the same user object
```

## Animation

The `Animation` class provides value interpolation with configurable timing. It implements `IDestroyable` for automatic cleanup with `@Destroy`.

```typescript
import { Animation, AnimationType } from "j-templates/Utils";
```

### AnimationType

| Value | Description |
|---|---|
| `Linear` | Linear interpolation |
| `EaseIn` | Ease-in interpolation (starts slow, accelerates) |

### Constructor

```typescript
new Animation(type: AnimationType, duration: number, update: (next: number) => void)
```

- `type` — Interpolation function
- `duration` — Animation duration in milliseconds
- `update` — Callback invoked each frame with the interpolated value

### Methods and properties

| Member | Signature | Description |
|---|---|---|
| `Animate` | `(start: number, end: number): Promise<void>` | Start an animation. If disabled, returns immediately. If start equals end, calls `update(end)` directly. Otherwise, schedules frame-by-frame updates. |
| `Cancel` | `(): void` | Cancel the running animation. |
| `Disable` | `(): void` | Cancel and prevent future animations. |
| `Enable` | `(): void` | Re-enable animations. |
| `Destroy` | `(): void` | Calls `Disable()`. |
| `Running` | `get: boolean` | Whether an animation is in progress. |
| `Start` | `get: number \| null` | Starting value of the current animation. |
| `End` | `get: number \| null` | Ending value of the current animation. |
| `Enabled` | `get: boolean` | Whether the animation is enabled. |

### Usage with @Destroy and @Watch

```typescript
import { Animation, AnimationType } from "j-templates/Utils";
import { Component, Value, Watch, Destroy } from "j-templates/Utils";

class NumberCard extends Component<{ title: string; value: number }> {
  @Value() cardValue = 0;

  @Destroy()
  animator = new Animation(AnimationType.Linear, 500, (next) => {
    this.cardValue = Math.floor(next);
  });

  @Watch((self) => self.Data.value)
  onValueChanged(value: number) {
    this.animator.Animate(this.cardValue, value);
  }

  Template() {
    return div({}, () => [
      h1({}, () => this.Data.title),
      div({}, () => `${this.cardValue}`),
    ]);
  }
}
```

### Async animation sequences

`Animate` returns a `Promise`, enabling sequential animations:

```typescript
async fadeOutAndMove() {
  await this.fadeAnimator.Animate(1, 0);   // Fade out
  this.element.classList.add("hidden");
  await this.moveAnimator.Animate(0, 100); // Move
  this.element.classList.remove("hidden");
  await this.fadeAnimator.Animate(0, 1);   // Fade in
}
```

### Disable/Enable for instant changes

```typescript
this.animator.Disable();
this.cardValue = targetValue; // Instant update, no animation
this.animator.Enable();
```

## Best Practices

- **Keep `Template()` pure.** Only return vNodes — no side effects.
- **Use arrow functions for reactivity.** `props: () => ({ ... })` and `data: () => this.items` create reactive scopes.
- **Use `calc` selectively.** Only when a parent scope changes but a derived value often stays the same. Not needed for basic array reactivity.
- **Use `peek` to read without subscribing.** When you need a value during template evaluation but don't want the parent to depend on it.
- **Use `@Computed` for expensive derived data.** It preserves object identity and prevents unnecessary downstream re-renders.
- **Define domain interfaces.** TypeScript interfaces ensure type safety through `this.Data` and store operations.
- **Use key functions with stores.** `new StoreSync((value) => value.id)` enables object identity sharing.
- **Mark animations with `@Destroy`.** Prevents memory leaks from animation timers.
- **Use `@Watch` to connect animations to state.** The handler is called immediately with the current value and on every change.

## Source

- `src/DOM/elements.ts` — DOM element factory functions
- `src/DOM/index.ts` — DOM module exports
- `src/Node/vNode.ts` — vNode creation, initialization, reconciliation
- `src/Node/vNode.types.ts` — vNode type definitions
- `src/Utils/animation.ts` — Animation class
- `src/Store/Store/storeSync.ts` — StoreSync
- `src/Store/Store/storeAsync.ts` — StoreAsync

## See Also

- [Components](./01-components.md) — Component class, lifecycle, composition
- [Reactivity](./02-reactivity.md) — ObservableScope, ObservableNode, decorators
- [Dependency Injection](./04-dependency-injection.md) — Injector and `@Inject`