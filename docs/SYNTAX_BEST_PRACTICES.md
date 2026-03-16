# j-templates Syntax and Best Practices Reference

This document provides a comprehensive reference for all j-templates framework syntax and best practices. Use this as a quick reference to avoid reading the entire codebase.

---

## Table of Contents

1. [Core Imports](#core-imports)
2. [Component Syntax](#component-syntax)
3. [Template System](#template-system)
4. [Reactive State Decorators](#reactive-state-decorators)
5. [Dependency Injection](#dependency-injection)
6. [Event Handling](#event-handling)
7. [Lifecycle Methods](#lifecycle-methods)
8. [Store Operations](#store-operations)
9. [ObservableScope API](#observablescope-api)
10. [ObservableNode API](#observablenode-api)
11. [Animation System](#animation-system)
12. [Injector API](#injector-api)
13. [Utility Functions](#utility-functions)
14. [Type Definitions](#type-definitions)
15. [Best Practices](#best-practices)

---

## Core Imports

### Main Exports
```typescript
// Main entry point
import { Component, calc } from "j-templates";

// Alternative import paths
import { Component } from "j-templates/Node/component";
import { CalcScope as calc } from "j-templates/Store/Tree/observableScope";
```

### DOM Functions
```typescript
import { div, span, h1, h2, h3, p, button, input, textarea } from "j-templates/DOM";
import { table, thead, tbody, tr, th, td } from "j-templates/DOM";
import { select, option, label } from "j-templates/DOM";
import { img, video, aside, pre } from "j-templates/DOM";
import { text } from "j-templates/DOM"; // Text node creator
```

### Utils
```typescript
import { Computed, ComputedAsync, State, Value, Scope, Watch, Inject, Destroy, Bound } from "j-templates/Utils";
import { Injector } from "j-templates/Utils/injector";
import { Animation, AnimationType } from "j-templates/Utils/animation";
import { IDestroyable } from "j-templates/Utils/utils.types";
```

### Store
```typescript
import { StoreSync, StoreAsync, ObservableScope, ObservableNode } from "j-templates/Store";
```

---

## Component Syntax

### Basic Component Class
```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class MyComponent extends Component<D, T, E> {
  // D: Data type (passed from parent)
  // T: Template type (functions for custom rendering)
  // E: Event map type (interface defining events)

  Template(): vNodeType | vNodeType[] {
    return div({}, () => "Hello World");
  }
}
```

### Converting to Function Component
```typescript
export const myComponent = Component.ToFunction("my-component", MyComponent);

// Usage in templates
myComponent({
  data: () => ({ /* data object */ }),
  on: {
    eventName: (payload) => { /* handler */ }
  }
}, /* templates if needed */);
```

### Component Generic Type Parameters
```typescript
// Component<D, T, E>
class MyComponent extends Component<
  { name: string },           // D: Data type
  { render: (item: string) => vNode },  // T: Template functions
  { click: { x: number }, save: string } // E: Event map
> {
  // Access data: this.Data (returns { name: string })
  // Access templates: this.Templates (has render method)
  // Fire events: this.Fire("click", { x: 10 })
  
  // IMPORTANT: Never override constructor
  // Use field initializers and Bound() instead
}
```

### Component Properties
```typescript
class MyComponent extends Component {
  // Protected accessors (available in component class)
  protected get Data(): D { /* current data value */ }
  protected get Templates(): T { /* template collection */ }
  protected get Scope(): IObservableScope<D> { /* internal scope */ }
  protected get VNode(): vNodeType { /* virtual node */ }
  protected get Injector(): Injector { /* component injector */ }
  protected get Destroyed(): boolean { /* destroyed state */ }

  // Public properties
  public Fire<P extends keyof E>(event: P, data?: E[P]): void
}
```

### Component.Register() - Web Components
```typescript
// Register as Web Component
Component.Register("my-element", MyComponent);

// Now usable in HTML: <my-element></my-element>
// Must contain hyphen in name
```

### Component.Attach() - Manual Attachment
```typescript
const container = document.getElementById("app")!;
const vnode = myComponent({ data: () => ({ /* data */ }) });
Component.Attach(container, vnode);
```

---

## Template System

### DOM Element Functions Signature
```typescript
// All DOM functions follow this pattern:
function element<P, E, T>(
  config?: {
    props?: FunctionOr<RecursivePartial<P>>;  // DOM properties
    attrs?: FunctionOr<{ [name: string]: string }>;  // HTML attributes
    on?: FunctionOr<vNodeEvents<E>>;  // Event handlers
    data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;  // Reactive data
  },
  children?: vNodeType[] | ((data: T) => vNodeType[] | vNodeType | string)
): vNodeType
```

### Creating Elements
```typescript
// Simple text content
div({}, () => "Hello World");

// With props
div({ props: { className: "container", id: "main" } }, () => "Content");

// With reactive props
div({
  props: () => ({
    className: isActive ? "active" : "inactive",
    style: { color: textColor }
  })
}, () => "Dynamic");

// With attributes
div({ attrs: { "data-id": itemId, role: "button" } }, () => "Div");

// With event handlers
button({
  on: {
    click: (event: MouseEvent) => handleClick(event),
    mouseover: (event: MouseEvent) => handleHover(event)
  }
}, () => "Click me");

// With reactive data binding - framework handles array iteration
div({
  data: () => this.Data.items,
  props: () => ({ className: "list" })
}, (item) =>  // Framework passes single item from array
  div({}, () => item.name)
);
```

### Reactive Data Binding
```typescript
// data prop creates reactive binding
div({ data: () => this.SomeProperty }, (value) => {
  // This re-renders when SomeProperty changes
  return div({}, () => `Value: ${value}`);
});

// Arrow functions in config create reactive bindings
div({
  props: () => ({ className: this.isActive ? "active" : "" })
}, () => "Content");
```

### Conditional Rendering
    ```typescript
    // Filter out null/falsy values before returning in arrays
    div({}, () => [
      isLoading && span({}, () => "Loading..."),
      hasError && div({ props: { className: "error" } }, () => errorMessage),
      data && div({}, () => data.name)
    ].filter(Boolean));

    // Or use ternary with string fallback (children return type is string|vNode)
    div({}, () => [
      isLoading ? span({}, () => "Loading...") : "",
      hasError ? div({ props: { className: "error" } }, () => errorMessage) : ""
    ]);

    // For data prop conditional - falsy values render no children
    div({ data: () => isLoading }, (data) =>  // data is true/false here
      span({}, () => "Loading...")  // Not rendered when data is false
    );
    ```

### List Rendering
    ```typescript
    // ✅ CORRECT: Pass array as data prop - framework handles iteration
    tbody({
      data: () => calc(() => this.Data.items)
    }, (item) =>  // Framework passes single item here
      tr({}, () => td({}, () => item.name))
    );

    // ❌ WRONG: Don't call .map() inside children function
    tbody({}, (items) =>
      items.map((item) => tr({}, () => td({}, () => item.name)))  // Wrong!
    );
    ```

    **Why:** When `data` returns an array, the framework automatically iterates it and calls the children function for each element. Calling `.map()` manually bypasses this optimization.

### Granular Reactive Scopes
    ```typescript
    // ✅ Wrap children arrays in functions for separate scopes
    div({}, () => [
      span({}, () => this.value1),  // Independent scope
      span({}, () => this.value2)   // Independent scope
    ]);
    // Changing value1 only updates first span

    // ❌ Without function wrapper - all children share parent scope
    div({}, [
      span({}, () => this.value1),  // Updates with parent
      span({}, () => this.value2)   // Updates with parent
    ]);
    // Changing value1 re-renders entire div and both spans
    ```

    **Why:** Wrapping children in a function creates separate reactive scopes for each child. This minimizes unnecessary re-renders in complex templates.

### Two-Way Data Binding
    ```typescript
    // ✅ CORRECT: Wrap value in function for proper reactivity
    input({
      props: () => ({ value: this.text }),
      on: {
        input: (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.text = target.value;
        }
      }
    });

    // ❌ WRONG: Static props cause element recreation
    input({
      props: { value: this.text },  // Loses focus after each keystroke
      on: {
        input: (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.text = target.value;
        }
      }
    });
    ```

    **Why:** Without the function wrapper, the `value` prop is evaluated once and the input element gets recreated on each state change, causing focus loss.

### List Rendering
```typescript
// Pass array as data - framework iterates automatically
// Each array element is passed to children function individually
div({ data: () => items }, (item) =>
  div({ key: item.id }, () => item.name)
);

// With calc() - optional optimization for batching
// Framework tracks array values by object identity for DOM reuse (works without calc())
tbody({
  data: () => calc(() => this.Data.items)  // or just: data: () => this.Data.items
}, (item) =>  // Framework passes single item here
  tr({}, () => td({}, () => item.name))
);

// Important: Don't call .map() inside children function
// Wrong:
div({}, (items) =>
  items.map((item) => tr({}, () => td({}, () => item.name)))
);

// Correct - pass array as data, framework handles iteration
div({ data: () => items }, (item) =>
  tr({}, () => td({}, () => item.name))
);
```

### Data Property Behavior

**Falsy Values**: When data returns a falsy value (null, undefined, false, 0, ""), the children function is not called and no children are rendered.
```typescript
// Falsy data - span not rendered
div({ data: () => false }, (data) => span({}, () => "never rendered"));
// data receives false, but framework treats falsy as empty array
```

**Array Iteration**: When data returns an array, the framework automatically iterates over the array, calling the children function for each element. The framework tracks array values by object identity internally to support DOM element reuse.
```typescript
// Array is automatically iterated by framework
div({ data: () => [1, 2, 3] }, (item) => 
  span({}, () => item)  // Called 3 times with 1, 2, 3
);
```

**Object Identity Tracking**: The framework tracks array elements by object identity for DOM reuse. This works with or without `calc()` - the framework handles identity tracking internally.
```typescript
// Framework tracks items by identity for DOM reuse (works with or without calc())
tbody({
  data: () => this.Data.items  // or data: () => calc(() => this.Data.items)
}, (item) => tr({}, () => td({}, () => item.name))
);
```

### Text Nodes
```typescript
import { text } from "j-templates/DOM";

div({}, () => [
  text(() => "Hello "),
  text(() => userName),
  text(() => "!")
]);
```

### Component Composition
```typescript
div({}, () => [
  headerComponent({ data: () => headerData }),
  mainContent({ data: () => mainData }),
  footerComponent({ data: () => footerData })
]);
```

### Passing Templates to Components
```typescript
// Define template interface
interface CellTemplate<D> {
  cell: (data: D, column: Column) => vNode | vNode[];
}

// Generic component that accepts templates
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    return tbody(
      { data: () => calc(() => this.Data.data) },
      (data) =>
        tr({}, (column) =>
          td({}, () => this.Templates.cell(data, column))
        )
    );
  }
}

// Usage with custom template
const cellTemplate = {
  cell: (data: User, column: Column) => {
    if (column.key === "name") return span({}, () => data.name);
    return span({}, () => String(data[column.key]));
  }
};

dataTable(
  { data: () => ({ columns, data: users }) },
  cellTemplate
);
```

---

## Reactive State Decorators

### @Value - Primitive Reactive State
```typescript
import { Value } from "j-templates/Utils";

class MyComponent extends Component {
  @Value()
  count: number = 0;

  @Value()
  name: string = "John";

  @Value()
  isActive: boolean = true;

  increment() {
    this.count++; // Triggers reactivity
  }

  setName(name: string) {
    this.name = name; // Triggers reactivity
  }

  Template() {
    return div({}, () => `${this.count} - ${this.name}`);
  }
}

// Use case: Simple primitives (number, string, boolean, null, undefined)
// Not suitable: Nested objects/arrays (changes won't be tracked deeply)
```

### @State - Complex Reactive State
```typescript
import { State } from "j-templates/Utils";

class MyComponent extends Component {
  @State()
  user: { name: string; email: string } = {
    name: "John",
    email: "john@example.com"
  };

  @State()
  items: string[] = ["Item 1", "Item 2"];

  @State()
  config?: { theme: string; language: string };

  updateUserEmail(email: string) {
    this.user.email = email; // Triggers reactivity (deep)
  }

  addItem(item: string) {
    this.items.push(item); // Triggers reactivity (array mutation)
  }

  Template() {
    return div({}, () => [
      div({}, () => this.user.name),
      div({}, () => this.items.length)
    ]);
  }
}

// Use case: Objects with nested properties, arrays
// Provides deep reactivity through proxy-based ObservableNode
```

### @Scope - Cached Getter (New Reference)
```typescript
import { Scope, Value } from "j-templates/Utils";

class MyComponent extends Component {
  @Value()
  firstName: string = "John";

  @Value()
  lastName: string = "Doe";

  @Scope()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Value()
  items: number[] = [1, 2, 3];

  @Scope()
  get doubled(): number[] {
    return this.items.map(x => x * 2); // New array each time
  }

  Template() {
    return div({}, () => [
      div({}, () => this.fullName),
      div({}, () => this.doubled.join(", "))
    ]);
  }
}

// Use case: Cheap computations, primitives, simple array operations
// Fine for array operations that maintain object identity (map, filter, sort)
// Cached between dependency changes, but returns NEW reference on update
```

### @Computed - Cached Getter with Object Reuse
```typescript
import { Computed, State } from "j-templates/Utils";

class MyComponent extends Component {
  @State()
  items: TodoItem[] = [];

  @Computed([])
  get completedItems(): TodoItem[] {
    return this.items
      .filter(item => item.completed)
      .sort((a, b) => a.id - b.id);
  }

  @Computed({ total: 0, average: 0 })
  get report(): { total: number; average: number } {
    const total = this.items.reduce((sum, i) => sum + i.value, 0);
    return {
      total,
      average: total / (this.items.length || 1)
    };
  }

  Template() {
    return div({}, () => [
      div({}, () => this.completedItems.length),
      div({}, () => this.report.total)
    ]);
  }
}

// Use case: Creating new in-memory objects in getter (filtering, sorting, aggregating)
// Uses StoreSync for object reuse via ApplyDiff - same reference, in-place updates
// Preserves DOM references to avoid unnecessary re-renders
// Note: Fine for array operations that maintain object identity (filter, sort, map)
```

### @ComputedAsync - Async Getter with Object Reuse
```typescript
import { ComputedAsync, Value } from "j-templates/Utils";

class MyComponent extends Component {
  @Value()
  userId: string = "123";

  @ComputedAsync(null)
  async getUser(): Promise<User | null> {
    const response = await fetch(`/api/users/${this.userId}`);
    return response.json();
  }

  @ComputedAsync([])
  async getRecentActivities(): Promise<Activity[]> {
    const response = await fetch(`/api/users/${this.userId}/activities`);
    return response.json();
  }

  Template() {
    return div({}, () => [
      div({}, () => this.getUser?.name || "Loading..."),
      div({}, () => this.getRecentActivities?.length || 0)
    ]);
  }
}

// Use case: Async operations (API calls, file reads)
// Returns defaultValue while async operation is pending
// Same object reuse benefits as @Computed
```

### @Watch - Property Change Handler
```typescript
import { Watch, Value, State } from "j-templates/Utils";

class MyComponent extends Component {
  @Value()
  count: number = 0;

  @State()
  user: { name: string; email: string } = { name: "", email: "" };

  @Watch((comp) => comp.count)
  handleCountChange(newCount: number) {
    console.log(`Count changed to ${newCount}`);
    this.analytics.track("count_changed", { count: newCount });
  }

  @Watch((comp) => comp.user.name)
  handleNameChange(newName: string) {
    console.log(`Name changed to ${newName}`);
  }

  @Watch((comp) => comp.Data.value)
  onDataChange(newValue: DataType) {
    // Called with initial value on Bound()
    // Called with new value when Data.value changes
  }

  Template() {
    return div({}, () => this.count);
  }
}

// Handler is called immediately with current value when Bound() is called
// Handler is called with new value whenever watched property changes
// Subscription is automatically cleaned up on Destroy()
// Watched value is computed within a greedy scope (batched updates)
```

### @Inject - Dependency Injection
```typescript
import { Inject, Destroy } from "j-templates/Utils";
import { Injector } from "j-templates/Utils/injector";

// Define abstract service contract
export abstract class DataService {
  abstract getData(): Data[];
  abstract save(data: Data): Promise<void>;
}

// Component providing service
class ParentComponent extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new DataServiceImplementation(); // Registers in injector
}

// Component consuming service
class ChildComponent extends Component {
  @Inject(DataService)
  dataService!: DataService; // Retrieves from parent injector

  Template() {
    return div({}, () => this.dataService.getData().length);
  }
}

// Manual injector manipulation
this.Injector.Set(SomeService, instance);
const service = this.Injector.Get<SomeService>(SomeService);
```

### @Destroy - Auto-Cleanup
```typescript
import { Destroy, Inject } from "j-templates/Utils";
import { Animation, AnimationType } from "j-templates/Utils/animation";
import { IDestroyable } from "j-templates/Utils/utils.types";

class MyComponent extends Component {
  // Auto-destroys when component is destroyed
  @Destroy()
  animation = new Animation(AnimationType.Linear, 500, (value) => {
    this.updateValue(value);
  });

  @Destroy()
  @Inject(DataService)
  dataService = new DataService(); // Also implements IDestroyable

  @Destroy()
  timer = new RefreshTimer(() => this.refresh(), 1000);

  @Destroy()
  subscription = someObservable.subscribe(this.handleData);

  Destroy() {
    super.Destroy(); // Calls Destroy.All(this)
    // All @Destroy()-marked properties have .Destroy() called automatically
  }
}

// IDestroyable interface
interface IDestroyable {
  Destroy(): void;
}

// @Destroy calls .Destroy() on marked properties during component teardown
// Properties must implement IDestroyable or have a Destroy() method
```

### @Bound - Lifecycle Hook (Internal)
```typescript
import { Bound } from "j-templates/Utils";

// Internal decorator namespace, typically not used directly
// Bound.All(instance) is called automatically in Component.Bound()

class MyComponent extends Component {
  public Bound() {
    super.Bound(); // Calls Bound.All(this)
    // @Watch decorators are now active
  }
}
```

---

## Dependency Injection

### Injector Class
```typescript
import { Injector } from "j-templates/Utils/injector";

// Create injector
const injector = new Injector();

// Set value at this scope
injector.Set(SomeService, instance);

// Get value (searches parent scopes)
const service = injector.Get<SomeService>(SomeService);

// Parent-child hierarchy
const parentInjector = new Injector();
parentInjector.Set(ParentService, parentInstance);

const childInjector = new Injector();
childInjector.parent = parentInjector; // Automatically set in vNode

// Child injector can access parent services
const parentSvc = childInjector.Get(ParentService); // Returns parentInstance
```

### Injector.Scope() - Temporarily Change Current Injector
```typescript
import { Injector } from "j-templates/Utils/injector";

const customInjector = new Injector();
customInjector.Set(SomeService, customInstance);

Injector.Scope(customInjector, () => {
  // Inside this scope, Injector.Current() returns customInjector
  const service = Injector.Current().Get(SomeService);
});

// Outside, back to original scope
```

### @Inject Decorator Mechanics
```typescript
// Decorator creates getter/setter using component's injector
@Inject(SomeType)
prop!: SomeType;

// Getter: this.Injector.Get(SomeType)
// Setter: this.Injector.Set(SomeType, value)

// Provider pattern (parent component)
@Inject(SomeService)
service = new SomeService(); // Automatically registers in injector

// Consumer pattern (child component)
@Inject(SomeService)
service!: SomeService; // Retrieves from parent's injector
```

---

## Event Handling

### Component Events
```typescript
// Define event map interface
interface ButtonEvents {
  click: { x: number; y: number };
  save: { id: string; data: any };
  cancel: void;
}

// Component with events
class Button extends Component<{}, {}, ButtonEvents> {
  Template() {
    return button({
      on: {
        click: (event: MouseEvent) => {
          this.Fire("click", { x: event.clientX, y: event.clientY });
        }
      }
    }, () => "Click me");
  }
}

// Parent component handles events
buttonComponent({
  data: () => ({}),
  on: {
    click: (payload) => {
      console.log(`Clicked at ${payload.x}, ${payload.y}`);
    },
    save: (payload) => {
      console.log(`Saved ${payload.id}`);
    },
    cancel: () => {
      console.log("Cancelled");
    }
  }
});
```

### DOM Events
```typescript
// Native DOM events
button({
  on: {
    click: (event: MouseEvent) => handleClick(event),
    mouseenter: (event: MouseEvent) => handleMouseEnter(event),
    mouseleave: (event: MouseEvent) => handleMouseLeave(event),
    keydown: (event: KeyboardEvent) => handleKeyDown(event),
    submit: (event: SubmitEvent) => handleSubmit(event)
  }
}, () => "Button");

// Event types are typed based on element
input({
  on: {
    input: (event: Event) => {
      const target = event.target as HTMLInputElement;
      this.value = target.value;
    },
    change: (event: Event) => handleChange(event)
  }
});
```

---

## Lifecycle Methods

### Component Lifecycle
```typescript
class MyComponent extends Component {
  // DON'T override constructor - use field initializers and Bound() instead
  // constructor(vNode, config, templates) { super(vNode, config, templates); } // Never needed

  Template(): vNodeType | vNodeType[] {
    // Called during initialization and on reactive updates
    return div({}, () => "Content");
  }

  Bound(): void {
    // Called after component is attached to DOM
    // @Watch decorators are initialized here
    // Use this for initialization that requires DOM access or this.Data
    this.timer.start();
    this.subscribeToEvents();
  }

  Destroy(): void {
    // Called when component is removed from DOM
    // @Destroy properties are cleaned up here
    super.Destroy();
    this.unsubscribeFromEvents();
  }
}

// Lifecycle order:
// 1. Component.Attach() called with DOM element and vNode
// 2. vNode.Init() initializes component
// 3. Component constructor runs (framework-controlled, never override)
// 4. Bound() method is called
// 5. Template is rendered and attached to DOM
//
// On removal:
// 1. vNode.Destroy() called
// 2. Component.Destroy() runs
// 3. @Destroy properties have .Destroy() called
// 4. All scopes are destroyed

// Initialization pattern (DON'T override constructor)
class Counter extends Component {
  @Value() count: number = 0; // Field initializer
  
  Bound() {
    super.Bound();
    // Use Bound() for initialization that needs this.Data
    // or requires DOM access
  }
}
```

---

## Store Operations

### StoreSync - Synchronous Storage
```typescript
import { StoreSync } from "j-templates/Store";

// Create store with optional key function for object sharing
const store = new StoreSync((value) => value.id);

// Write data
store.Write({ id: "1", name: "John" }, "user-1");
store.Write({ id: "1", name: "John", email: "john@example.com" }); // key from function

// Patch data
store.Patch("user-1", { email: "new@example.com" });

// Push to array
store.Push("users", { id: "2", name: "Jane" });
store.Push("users", { id: "3", name: "Bob" });

// Splice array
const deleted = store.Splice("users", 0, 1); // Remove first item

// Get data (returns observable node)
const user = store.Get<{ name: string }>("user-1");
const users = store.Get<User[]>("users", []); // Default if undefined

// Object sharing
const user1 = { id: "usr-1", name: "John" };
const user2 = { id: "usr-1", name: "John" };
store.Write(user1);
store.Write(user2);
// user1 and user2 reference the same stored instance
```

### StoreAsync - Asynchronous Storage
```typescript
import { StoreAsync } from "j-templates/Store";

const store = new StoreAsync((value) => value.id);

// Write is async (returns Promise)
await store.Write({ id: "1", name: "John" }, "user-1");

// Push to array is async
await store.Push("users", { id: "2", name: "Jane" });

// All other operations same as StoreSync
await store.Patch("user-1", { email: "new@example.com" });
const deleted = await store.Splice("users", 0, 1);
const user = store.Get("user-1");

// Destroy async store
store.Destroy();
```

### Key Function for Object Sharing
```typescript
// Key function extracts unique identifier from objects
const store = new StoreSync((value) => {
  if (value && typeof value === "object" && "id" in value) {
    return value.id as string;
  }
  return undefined; // No key for this value
});

// When objects with same key are written, they share the same instance
store.Write({ id: "1", user: { id: "u1", name: "Alice" } });
store.Write({ id: "2", user: { id: "u1", name: "Alice" } });
// Both records reference same user instance internally
```

---

## ObservableScope API

### Creating Scopes
```typescript
import { ObservableScope } from "j-templates/Store";

// Create reactive scope
const scope = ObservableScope.Create(() => {
  // This runs when dependencies change
  return computeValue();
});

// Create with greedy batching (updates batched via microtask queue)
const scope = ObservableScope.Create(
  () => computeValue(),
  true // greedy
);

// Force dynamic scope even without dependencies
const scope = ObservableScope.Create(
  () => staticValue,
  false,
  true // force
);
```

### Accessing Scope Values
```typescript
// Value() - Gets value and registers as dependency
const value = ObservableScope.Value(scope);

// Peek() - Gets value WITHOUT registering as dependency
const value = ObservableScope.Peek(scope);

// Touch() - Register scope as dependency without getting value
ObservableScope.Touch(scope);
```

### Watching Scopes
```typescript
// Watch for changes
const callback = (scope: IObservableScope<DataType>) => {
  const newValue = ObservableScope.Value(scope);
  console.log("Changed:", newValue);
};

ObservableScope.Watch(scope, callback);

// Unwatch
ObservableScope.Unwatch(scope, callback);
```

### Update and Destroy
```typescript
// Mark scope as dirty (triggers recomputation)
ObservableScope.Update(scope);

// Destroy scope and cleanup
ObservableScope.Destroy(scope);

// Destroy multiple scopes
ObservableScope.DestroyAll([scope1, scope2, scope3]);
```

### Cleanup on Destruction
```typescript
// Register cleanup callback
ObservableScope.OnDestroyed(scope, () => {
  console.log("Scope destroyed");
  cleanupResources();
});
```

### calc() - Gatekeeper for Derived Values

**Important:** `calc()` does NOT make arrays reactive. `@State` arrays are already reactive through ObservableNode proxies. `calc()` is an optimization that prevents unnecessary emissions when the value hasn't changed.

```typescript
import { calc } from "j-templates";

// ✅ When parent scope changes but array reference doesn't
const parent = ObservableScope.Create(() => ({
  filter: this.filterValue,
  items: this.Data.items
}));

const items$ = ObservableScope.Create(() => 
  calc(() => ObservableScope.Value(parent).items)  // Only emits when items changes
);
// Changing filterValue updates parent but NOT items$ ✅

// ✅ Direct @State arrays - calc() is optional optimization
tbody({
  data: () => calc(() => this.Data.items)
}, (item) =>  // Framework passes single item here
  tr({}, () => td({}, () => item.name))
);
// Without calc(): Still reactive, but always emits on parent change
// With calc(): Only emits if array reference differs

// ✅ Primitive derived state - === check can prevent emissions
calc(() => this.Data.count > 10);  // boolean - emits only when result changes
calc(() => this.Data.value);        // Same reference - no emission if unchanged

// ❌ Transformations - always new references, === check never helps
calc(() => this.Data.items.filter(x => x.active));  // New array each time
calc(() => this.Data.items.map(x => x.name));       // New array each time

// Multiple calc scopes with custom IDs
calc(() => computeA(), "id-a");
calc(() => computeB(), "id-b");
```

**What calc() Does:**

1. **Value Gating**: Only emits if `===` comparison shows value changed (prevents unnecessary updates)
2. **Scope Reuse**: Same ID within one parent evaluation reuses the scope (avoids duplicate computations)

**What calc() Does NOT Do:**

1. ❌ Does NOT make arrays reactive - `@State` already does this via ObservableNode
2. ❌ Does NOT prevent emissions for array transformations (filter/map/sort always return new references)
3. ❌ Does NOT provide object reuse - that's what `@Computed` does with StoreSync

**When to Use calc():**

| Scenario | Use calc()? | Why |
|----------|-------------|-----|
| Direct @State array access | Optional | Value gating when parent changes |
| Static constant array | ❌ No | Never changes, adds overhead |
| Primitive derived state | ✅ Yes | `===` can prevent unnecessary emissions |
| Parent scope aggregates multiple values | ✅ Yes | Child only cares about specific parts |
| Array transformations (filter/map) | ❌ No | Always new references, never helps |
| Multiple uses in same template | ✅ Yes | Scope reuse avoids duplicate work |

---

## ObservableNode API

### Creating Observable Nodes
```typescript
import { ObservableNode } from "j-templates/Store";

// Create observable object
const user = ObservableNode.Create({
  name: "John",
  email: "john@example.com",
  profile: { age: 30, location: "NYC" }
});

// Create observable array
const items = ObservableNode.Create([
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" }
]);

// Access properties (creates reactive dependencies)
const name = user.name; // Tracked

// Modify properties (triggers updates)
user.name = "Jane"; // Triggers reactive updates
```

### Array Operations
```typescript
const items = ObservableNode.Create([1, 2, 3]);

// Mutations trigger updates
items.push(4);
items.pop();
items.shift();
items.unshift(0);
items.splice(1, 1); // Remove at index 1
items.sort();
items.reverse();

// Map and other functional methods work
items.map(item => item * 2);

// Array proxy handles all mutations reactively
```

### Unwrapping Proxies
```typescript
// Get raw underlying value
const raw = ObservableNode.Unwrap(proxy);

// Unwrap nested objects/arrays recursively
const user = {
  name: "John",
  activities: [{ id: 1 }]
};
const observable = ObservableNode.Create(user);
const unwrapped = ObservableNode.Unwrap(observable);
// unwrapped is plain object, no proxies
```

### Touch - Manual Update Trigger
```typescript
// Touch entire node
ObservableNode.Touch(observable);

// Touch specific property
ObservableNode.Touch(observable, "name");
```

### ApplyDiff - Efficient Nested Updates
```typescript
import { JsonDiff } from "j-templates/Utils/json";
import { ObservableNode } from "j-templates/Store";

const obj = ObservableNode.Create({ user: { name: "John", age: 30 } });

// Compute diff
const oldData = { user: { name: "John", age: 30 } };
const newData = { user: { name: "Jane", age: 31 } };
const diff = JsonDiff(oldData, newData);

// Apply diff to maintain object identity
ObservableNode.ApplyDiff(obj, diff);
// obj.user is same reference, only name/age properties changed
```

### CreateFactory - Custom Transformations
```typescript
// Create factory with alias function (for read-only views)
const createReadOnly = ObservableNode.CreateFactory((value) => {
  // Transform before creating proxy
  return { ...value, readonly: true };
});

const proxy = createReadOnly({ name: "John" });
// proxy has readonly: true added
```

---

## Animation System

### Animation Class
```typescript
import { Animation, AnimationType } from "j-templates/Utils/animation";
import { IDestroyable } from "j-templates/Utils/utils.types";

// Create animation
const anim = new Animation(
  AnimationType.Linear,  // Interpolation type
  500,                   // Duration in ms
  (next) => {            // Update callback
    this.value = next;
  }
);

// Start animation
await anim.Animate(0, 100); // Returns Promise<void>

// Check animation state
console.log(anim.Running); // boolean
console.log(anim.Start);   // current start value
console.log(anim.End);     // current end value
console.log(anim.Enabled); // is enabled

// Control animation
anim.Enable();
anim.Disable();  // Cancels if running
anim.Cancel();   // Cancel running animation

// Destroy (implements IDestroyable)
anim.Destroy(); // Calls Disable()
```

### Animation Types
```typescript
enum AnimationType {
  Linear,   // Linear interpolation
  EaseIn    // Ease-in (starts slow, accelerates)
}
```

### Using @Destroy with Animation
```typescript
class MyComponent extends Component {
  @Destroy()
  animation = new Animation(AnimationType.Linear, 300, (next) => {
    this.cardValue = Math.floor(next);
  });

  @Watch((comp) => comp.Data.value)
  updateValue(newValue: number) {
    this.animation.Animate(this.cardValue, newValue);
  }

  Template() {
    return div({}, () => this.cardValue);
  }
}
```

---

## Injector API

### Basic Operations
```typescript
import { Injector } from "j-templates/Utils/injector";

// Create injector
const injector = new Injector();

// Set value at current scope
injector.Set<SomeService>(SomeService, instance);

// Get value (searches parent scopes)
const service = injector.Get<SomeService>(SomeService);

// Access current injector scope
const current = Injector.Current();

// Execute within injector scope
const result = Injector.Scope(customInjector, () => {
  // Inside this, Injector.Current() returns customInjector
  return someOperation();
});
```

---

## Utility Functions

### Functions
```typescript
import { IsAsync } from "j-templates/Utils/functions";

// Check if function is async
const isAsync = IsAsync(myFunction); // boolean
```

### Thread and Schedule
```typescript
import { Thread, Schedule } from "j-templates/Utils/thread";
import { NodeConfig } from "j-templates/Node/nodeConfig";

// Schedule update for next microtask
NodeConfig.scheduleUpdate(() => {
  // Runs in next microtask
  updateDOM();
});

// Thread execution
Thread(() => {
  // Runs in thread context
  doWork();
});

// Schedule for next frame
Schedule(() => {
  // Runs in scheduled context
  doWork();
});
```

### List Utilities
```typescript
import { List } from "j-templates/Utils/list";

const list = List.Create();
list.Add(item);
list.Remove(item);
list.Clear();
```

### Array Utilities
```typescript
import { DistinctArray } from "j-templates/Utils/distinctArray";

const arr = DistinctArray.Create();
arr.AddUnique(item); // Only adds if not already present
```

### Router
```typescript
import { Router } from "j-templates/Utils/router";

const router = Router.Create();
router.AddRoute("/path", handler);
router.Navigate("/path");
```

---

## Type Definitions

### Core Types
```typescript
// Virtual Node
type vNodeType = {
  definition: vNodeDefinition | null;
  type: string;
  injector: Injector;
  node: Node | null;
  children: any[] | null;
  destroyed: boolean;
  onDestroyed: Emitter | null;
  component: Component | null;
  scopes: IObservableScope<any>[];
};

// vNode Definition
interface vNodeDefinition<P = HTMLElement, E = HTMLElementEventMap, T = never> {
  type: string;
  namespace?: string | null;
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
  children?: (data: T) => vNodeType[] | vNodeType | string;
  childrenArray?: vNodeType[];
  componentFactory?: (vnode: vNodeType) => Component;
  node?: Node;
}

// Config Types
type FunctionOr<T> = T | (() => T);
type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };

interface vNodeEvents<E = HTMLElementEventMap> {
  [K in keyof E]?: (event: E[K]) => void;
}

// Observable Scope
interface IObservableScope<T> {
  type: "static" | "dynamic";
  value: T;
  // ... other properties for dynamic scopes
}

// Component Config
interface vComponentConfig<D, E, P = HTMLElement> {
  data?: () => D | undefined;
  props?: FunctionOr<RecursivePartial<P>>;
  on?: ComponentEvents<E>;
}

// Component Events
interface ComponentEvents<E> {
  [P in keyof E]: (data: E[P]) => void;
}

// Destroyable
interface IDestroyable {
  Destroy(): void;
}

// Constructor Token for DI
type ConstructorToken<I> =
  | { new (...args: any[]): I }
  | (abstract new (...args: any[]) => I);
```

### Decorator Types
```typescript
// @Computed
function Computed<V>(defaultValue: V): PropertyDecorator

// @Value
function Value(): PropertyDecorator

// @State
function State(): PropertyDecorator

// @Scope
function Scope(): PropertyDecorator

// @Watch
function Watch<S extends (instance: T) => any, T>(
  scope: S
): MethodDecorator

// @Inject
function Inject<I, T extends Record<K, I>>(type: ConstructorToken<I>): PropertyDecorator

// @Destroy
function Destroy(): PropertyDecorator
```

---

## Best Practices

### Component Structure
1. **Keep Template() pure**: Only return vNodes, no side effects
2. **Use Bound() for initialization**: Start timers, subscribe to events
3. **Implement Destroy()**: Clean up resources to prevent memory leaks
4. **Use TypeScript generics**: Strongly type data, templates, and events
5. **Name components descriptively**: Use kebab-case for type names
6. **Never override constructor**: Use field initializers and Bound() instead

### Reactive State
1. **Use @Value for primitives**: number, string, boolean, null, undefined
2. **Use @State for objects/arrays**: Deep reactivity through proxies
3. **Use @Scope for cheap getters**: Array operations maintaining identity (map, filter, sort)
4. **Use @Computed for creating new objects**: Filtering, sorting, aggregating data
5. **Use @ComputedAsync for async operations**: API calls, file reads

### Template Best Practices
1. **Use arrow functions for reactivity**: `data: () => this.property`
2. **Arrays are reactive by default**: `@State` arrays work without `calc()`; use it only for optimization (batching, primitive gating)
3. **Keep Templates reactive**: Use arrow functions, not direct values
4. **Avoid side effects in Template()**: No API calls, mutations
5. **Use conditional rendering**: Ternary, string fallback (not null in arrays)
6. **Pass arrays as data**: Framework iterates automatically, don't call .map()
7. **Handle falsy data values**: falsy values (null, undefined, false, 0, "") render no children

### Dependency Injection
1. **Use abstract class tokens**: Interface-based service contracts
2. **Register in parent components**: Services available to all descendants
3. **Use @Destroy with @Inject**: Auto-cleanup of injected services
4. **Follow provider/consumer pattern**: Parent provides, child consumes

### Event Handling
1. **Define event map interfaces**: Strongly typed event payloads
2. **Fire events for actions**: Let parent handle component behavior
3. **Type event handlers**: Use proper event types (MouseEvent, etc.)
4. **Avoid tight coupling**: Use events, not direct parent references

### Performance
1. **Use calc() selectively**: Only for primitive derived state or when parent scope changes but child data doesn't
2. **Use object sharing**: Key functions for same-instance references
3. **Avoid unnecessary @Computed**: Simple values don't need it
4. **Destroy resources**: Always implement IDestroyable for timers/streams

### Code Organization
1. **Separate concerns**: Domain models vs display models (DTOs)
2. **Create specialized components**: Wrap generic components
3. **Use service contracts**: Abstract classes for DI tokens
4. **Organize by feature**: Components, services, models in feature folders

### Common Patterns

#### Counter Pattern
```typescript
class Counter extends Component {
  @Value()
  count: number = 0;

  Template() {
    return div({}, () => [
      button({ on: { click: () => this.count-- } }, () => "-"),
      div({}, () => this.count),
      button({ on: { click: () => this.count++ } }, () => "+")
    ]);
  }
}
```

#### Form Pattern
```typescript
class UserForm extends Component {
  @State()
  user: { name: string; email: string } = { name: "", email: "" };

  @Watch((comp) => comp.user)
  onUserChange(userData: typeof this.user) {
    this.saveToStorage(userData);
  }

  Template() {
    return div({}, () => [
      input({
        props: () => ({ value: this.user.name, type: "text" }),
        on: {
          input: (e) => {
            const target = e.target as HTMLInputElement;
            this.user.name = target.value;
          }
        }
      }),
      button({ on: { click: () => this.submit() } }, () => "Save")
    ]);
  }
}
```

#### List Pattern
```typescript
class ItemList extends Component<{ items: Item[] }> {
  Template() {
    return div({ props: { className: "list" } }, () => [
      div({ props: { className: "count" } }, () =>
        `Items: ${this.Data.items.length}`
      ),
      // Pass array as data - framework iterates automatically
      div({ props: { className: "items" }, data: () => this.Data.items }, (item) =>
        div({ key: item.id }, () => item.name)
      )
    ]);
  }
}

// With calc() - optional optimization for batching
// Without calc() also works - @State arrays are reactive by default
tbody({
  data: () => calc(() => this.Data.items)  // or just: data: () => this.Data.items
}, (item) =>  // Framework passes single item
  tr({}, () => td({}, () => item.name))
);
```

#### Derived State Pattern
```typescript
class Analytics extends Component {
  @State()
  activities: Activity[] = [];

  @Scope()
  get uniqueUsers(): number {
    // Cheap computation - primitive return value
    return new Set(this.activities.map(a => a.userId)).size;
  }

  @Scope()
  get sortedActivities(): Activity[] {
    // Array operation maintaining object identity - @Scope is fine
    return this.activities.slice().sort((a, b) => b.value - a.value);
  }

  @Computed({ total: 0, average: 0 })
  get report(): Report {
    // Creating new object in getter - use @Computed
    const total = this.activities.reduce((sum, a) => sum + a.value, 0);
    return {
      total,
      average: total / (this.activities.length || 1)
    };
  }

  Template() {
    return div({}, () => [
      div({}, () => `Users: ${this.uniqueUsers}`),
      div({}, () => `Total: ${this.report.total}`)
    ]);
  }
}
```

---

## Quick Reference Tables

### Decorator Selection

| Your Value Type | Use | Why |
|----------------|-----|-----|
| number, string, boolean | @Value | Lightweight, no proxy overhead |
| null, undefined | @Value | Simple scope storage |
| { nested: objects } | @State | Deep reactivity needed |
| arrays (User[], Todo[]) | @State | Array mutations tracked |
| getters (primitives, cheap) | @Scope | Cached, minimal overhead |
| getters (array map/filter/sort) | @Scope | Cached, identity preserved |
| getters (creating new objects) | @Computed | Cached + object reuse |
| getters (async) | @ComputedAsync | Async with caching |
| subscribe to changes | @Watch | Calls method on change |
| dependency injection | @Inject | Gets from component injector |
| cleanup on destroy | @Destroy | Calls .Destroy() on teardown |

### @Computed vs @Scope

| Aspect | @Computed | @Scope |
|--------|-----------|--------|
| Caches value | ✅ Yes | ✅ Yes |
| Re-evaluates on dep change | ✅ Yes | ✅ Yes |
| Object identity preserved | ✅ Yes | ❌ No |
| Returns new object on update | ❌ No | ✅ Yes |
| Overhead | Store + diff | Single scope |
| Best for | Creating new objects (filter/sort/map) | Primitives/simple arrays |

### Store Operations

| Operation | StoreSync | StoreAsync |
|-----------|-----------|------------|
| Write | sync | async (Promise) |
| Push | sync | async (Promise) |
| Patch | sync | async (Promise) |
| Splice | sync | async (Promise) |
| Get | sync | sync |
| Key sharing | ✅ Yes | ✅ Yes |

---

## File Locations

### Core Framework Files
| Feature | File Path |
|---------|-----------|
| Component class | src/Node/component.ts |
| Virtual node system | src/Node/vNode.ts |
| vNode types | src/Node/vNode.types.ts |
| Component types | src/Node/component.types.ts |
| Node config | src/Node/nodeConfig.ts |
| ObservableScope | src/Store/Tree/observableScope.ts |
| ObservableNode | src/Store/Tree/observableNode.ts |
| StoreSync | src/Store/Store/storeSync.ts |
| StoreAsync | src/Store/Store/storeAsync.ts |
| Store base | src/Store/Store/store.ts |
| Decorators | src/Utils/decorators.ts |
| Injector | src/Utils/injector.ts |
| Animation | src/Utils/animation.ts |
| DOM elements | src/DOM/elements.ts |
| Main index | src/index.ts |

### Documentation Files
| Pattern | File Path |
|---------|-----------|
| Component Architecture | docs/patterns/01-component-architecture.md |
| Reactive State Management | docs/patterns/02-reactive-state-management.md |
| Decorators | docs/patterns/03-decorators.md |
| Dependency Injection | docs/patterns/04-dependency-injection.md |
| Component Composition | docs/patterns/05-component-composition.md |
| Animation System | docs/patterns/06-animation-system.md |
| Template System | docs/patterns/07-template-system.md |
| Data Modeling | docs/patterns/08-data-modeling.md |

### Example Projects
| Project | Path |
|---------|------|
| Tutorial 1 | examples/tutorial_project/tutorial-1/src/app.ts |
| Tutorial 2 | examples/tutorial_project/tutorial-2/src/app.ts |
| Tutorial 3 | examples/tutorial_project/tutorial-3/src/app.ts |
| Tutorial 4 | examples/tutorial_project/tutorial-4/src/app.ts |
| Real-Time Dashboard | examples/real_time_dashboard/src/ |

---

## Common Gotchas

1. **calc() is NOT required for arrays**: @State arrays are reactive by default; calc() is only for optimization (batching, primitive gating)
2. **@Value doesn't track nested changes**: Use @State for nested objects
3. **Template() must be pure**: No side effects, no mutations
4. **Always use @Destroy for timers**: Prevent memory leaks
5. **Component.ToFunction() creates factory**: Don't instantiate components directly
6. **data prop creates reactive binding**: Use arrow functions, not direct values
7. **Component.Attach() takes single vNode**: Wrap arrays in container div
8. **@Inject requires Injector property**: Component has this.Injector automatically
9. **Bound() called once on attachment**: Not called on updates
10. **Destroy() called on removal**: Clean up all resources here
11. **Never override constructor**: Use field initializers and Bound() for setup
12. **children return type is string**: Convert non-element primitives to strings
13. **Don't use null in arrays**: Filter or use empty string for conditional children

---

*Last updated: Based on framework version from codebase analysis*
