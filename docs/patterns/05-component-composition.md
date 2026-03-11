# Component Composition

## Overview

Component Composition is the pattern of building complex UIs by combining simple, reusable components. j-templates supports generic components with type parameters, template functions for custom rendering, and the `Component.ToFunction()` pattern for converting classes to reusable functions.

## Key Concepts

- **Generic components**: Components parameterized by data and template types for reuse
- **Template functions**: Functions passed to components to customize rendering logic
- **Event firing**: Components can emit events that parent components can handle
- **Component.ToFunction()**: Converts component classes to reusable factory functions
- **Component.Register()**: Registers components as Web Components for declarative use
- **Component.Attach()**: Manually attaches virtual nodes to DOM nodes
- **Domain specialization**: Adapts generic components for specific use cases

## Core Patterns

### Generic Components

Components can be parameterized by data and template types, enabling reuse across different data structures and rendering requirements.

```typescript
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    // Uses D for data and CellTemplate<D> for custom rendering
  }
}
```

### Template Functions

Components can accept template functions that customize how data is rendered. This allows consumers to control the presentation logic while the component handles structure and behavior.

```typescript
import { ul, li, span } from "j-templates/DOM";

// Component definition
class List<T> extends Component<T[], { item: (item: T) => vNodeType }> {
  Template() {
    return ul({ data: () => this.Data }, (items) =>
      items.map((item) => li({}, () => this.Templates.item(item)))
    );
  }
}

// Usage with custom template
list(
  { data: () => [1, 2, 3] },
  { item: (num) => span({}, () => `Item: ${num}`) }
);
```

### Component.ToFunction()

Converts component classes to factory functions that can be composed in templates.

```typescript
import { Component } from "j-templates";
import { h1 } from "j-templates/DOM";

class MyComponent extends Component<{ title: string }> {
  Template() {
    return h1({}, () => this.Data.title);
  }
}

export const myComponent = Component.ToFunction("my-component", MyComponent);

// Use in templates
myComponent({ data: () => ({ title: "Hello" }) });
```

### Component.Register()

Registers components as Web Components, enabling declarative usage in HTML.

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class MyElement extends Component<{ message: string }> {
  Template() {
    return div({}, () => this.Data.message);
  }
}

Component.Register("my-element", MyElement);

// Use in HTML: <my-element></my-element>
```

### Component.Attach()

Manually attaches virtual nodes to DOM nodes for programmatic rendering.

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

const container = document.getElementById("app")!;
const vnode = div({}, () => "Hello World");
Component.Attach(container, vnode);
```

### Domain Specialization

Creates specialized components by composing generic components with domain-specific logic.

```typescript
import { Component } from "j-templates";
import { Inject } from "j-templates/Utils";

// Generic table component
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> { }

// Specialized activity table component
class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return dataTable(
      { data: () => ({ data: this.service.GetActivityData(), columns }) },
      activityCellTemplate
    );
  }
}
```

### Event Firing

Components can emit events that parent components handle, enabling parent-child communication.

```typescript
import { Component } from "j-templates";
import { button } from "j-templates/DOM";

// Define event map type
interface MyEvents {
  click: { count: number };
  save: { id: string };
}

class MyButton extends Component<{ label: string }, void, MyEvents> {
  private clicks = 0;

  handleClick() {
    this.clicks++;
    this.Fire("click", { count: this.clicks });
  }

  Template() {
    return button({ on: { click: () => this.handleClick() } }, () => this.Data.label);
  }
}

export const myButton = Component.ToFunction("my-button", MyButton);

// Parent component handles the event
class Parent extends Component {
  Template() {
    return myButton({
      data: () => ({ label: "Click Me" }),
      on: {
        click: (data) => console.log(`Clicked ${data.count} times`),
        save: (data) => console.log(`Saved ${data.id}`)
      }
    });
  }
}
```

## API Reference

### Type: Component<D, T, E>

Generic component base class.

**Generic Type Parameters:**
- `D`: Data type for the component's scoped state
- `T`: Template type used by the component (e.g., functions for custom rendering)
- `E`: Event map type for component events

### Type: vComponentConfig<D, E, P>

Configuration object for creating component instances.

**Properties:**
- `data?`: `() => D | undefined` - Function that returns component data
- `props?`: `RecursivePartial<P> | (() => RecursivePartial<P>)` - DOM properties to apply
- `on?`: `ComponentEvents<E>` - Event handlers

### Type: ComponentEvents<E>

Type for component event handlers.

**Properties:**
- `[P in keyof E]`: `(data: E[P]) => void` - Event handler function

### Function: Component.Fire()

Fires a component event.

**Signature:**
```typescript
public Fire<P extends keyof E>(event: P, data?: E[P]): void
```

**Parameters:**
- `event`: Event name (key from event map type)
- `data`: Optional event data matching the event type

### Function: Component.ToFunction()

### Function: Component.Register()

Registers a Component class as a Web Component.

**Signature:**
```typescript
static Register<D = void, T = void, E = void>(
  name: string,
  constructor: typeof Component<D, T, E>
): void
```

**Parameters:**
- `name`: Custom element name (must contain a hyphen)
- `constructor`: Component class to register

**Example:**
```typescript
Component.Register("my-element", MyComponent);
// Use in HTML: <my-element></my-element>
```

### Function: Component.Attach()

Attaches a virtual node to a real DOM node.

**Signature:**
```typescript
static Attach(node: any, vnode: vNodeType): vNodeType
```

**Parameters:**
- `node`: Target DOM node
- `vnode`: Virtual node to attach

**Returns:** The attached virtual node

## Usage Examples

### Creating a Generic Component

Define a component with generic types for data and templates:

```typescript
import { Component, calc } from "j-templates";
import { tbody, td, th, thead, tr } from "j-templates/DOM";

// Define interfaces for your specific use case
export interface Column {
  key: string;
  name: string;
  class?: string;
}

export interface CellTemplate<D> {
  cell: (data: D, column: Column) => vNode | vNode[];
}

export interface Data<D> {
  columns: Column[];
  data: D[];
}

// Generic table component
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    return [
      thead({ data: () => this.Data.columns }, (column) =>
        th({}, () => column.name),
      ),
      tbody({ data: () => calc(() => this.Data.data) }, (data) =>
        tr({ data: () => this.Data.columns }, (column) =>
          td({ props: () => ({ className: column.class }) }, () =>
            this.Templates.cell(data, column),
          ),
        ),
      ),
    ];
  }
}
```

### Converting to Function Component

Convert a component class to a reusable function:

```typescript
// Type definitions for function component conversion
type ToFunction<D> = typeof Component.ToFunction<Data<D>, CellTemplate<D>, {}>;
type FactoryFunction<D> = ReturnType<ToFunction<D>>;

interface TableFunction {
  <D>(...args: Parameters<FactoryFunction<D>>): ReturnType<FactoryFunction<D>>;
}

// Convert to function component
export const dataTable = Component.ToFunction(
  "table",
  DataTable,
) as unknown as TableFunction;
```

### Using Template Functions

Pass custom rendering functions to components:

```typescript
import { span } from "j-templates/DOM";

// Define custom cell template
const cellTemplate = {
  cell: function (data: ActivityRow, column: Column) {
    switch (column.key) {
      case "timestamp":
        return span({}, () => new Date(Date.parse(data.timestamp)).toLocaleString());
      case "username":
        return span({}, () => data.user.name);
      case "url":
        return span({}, () => data.url);
      case "timespent":
        return span({}, () => `${data.time_spent}s`);
    }
    return [];
  },
};

// Define column configuration
const columns: Column[] = [
  { key: "timestamp", name: "Time Stamp", class: "timestamp-cell" },
  { key: "timespent", name: "Time Spent", class: "time-spent-cell" },
  { key: "username", name: "User Name", class: "user-cell" },
  { key: "url", name: "Url", class: "url-cell" },
];

// Use the generic component with custom templates
dataTable(
  { data: () => ({ data: activityData, columns }) },
  cellTemplate,
);
```

### Domain Specialization

Create specialized components by composing generic components:

```typescript
import { Component } from "j-templates";
import { Inject } from "j-templates/Utils";
import { ActivityDataService } from "./activity-data-table.types";

class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return dataTable(
      {
        data: () => ({
          data: this.service.GetActivityData(),
          columns: columns
        })
      },
      cellTemplate,
    );
  }
}

export const activityDataTable = Component.ToFunction(
  "activity-data-table",
  ActivityDataTable,
);
```

### Event Firing and Handling

Components can emit events that parent components handle:

```typescript
import { Component } from "j-templates";
import { button, div, span } from "j-templates/DOM";

// Define event map type for the button component
interface ButtonEvents {
  click: { timestamp: number };
  doubleClick: { count: number };
}

class CounterButton extends Component<{ initialCount?: number }, void, ButtonEvents> {
  private count = this.Data.initialCount ?? 0;

  handleClick() {
    this.count++;
    this.Fire("click", { timestamp: Date.now() });
  }

  handleDoubleClick() {
    this.count += 2;
    this.Fire("doubleClick", { count: this.count });
  }

  Template() {
    return button(
      {
        on: {
          click: () => this.handleClick(),
          dblclick: () => this.handleDoubleClick()
        }
      },
      () => `Count: ${this.count}`
    );
  }
}

export const counterButton = Component.ToFunction("counter-button", CounterButton);

// Parent component handles the events
class Dashboard extends Component {
  private clickCount = 0;
  private lastClickTime = 0;

  Template() {
    return div({}, () => [
      span({}, () => `Total clicks: ${this.clickCount}`),
      counterButton({
        data: () => ({ initialCount: 5 }),
        on: {
          click: (data) => {
            this.clickCount++;
            this.lastClickTime = data.timestamp;
            console.log(`Button clicked at ${new Date(data.timestamp).toLocaleString()}`);
          },
          doubleClick: (data) => {
            console.log(`Double click! New count: ${data.count}`);
          }
        }
      })
    ]);
  }
}
```

### Nested Component Composition

Compose multiple components together:

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";
import { Inject } from "j-templates/Utils";
import { ActivityDataService } from "./activity-data-table.types";

class App extends Component {
  @Inject(ActivityDataService)
  dataService!: ActivityDataService;

  Template() {
    return div({ props: { className: "dashboard" } }, () => [
      numberCard({
        data: () => ({
          title: "Total Visits",
          value: this.dataService.GetReport().totalActivities,
        }),
      }),
      activityDataTable({}),
    ]);
  }
}
```

### Registering as Web Component

Register a component for declarative HTML usage:

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class MyElement extends Component<{ message: string }> {
  Template() {
    return div({}, () => this.Data.message);
  }
}

Component.Register("my-element", MyElement);

// Use in HTML: <my-element></my-element>
```

### Manual Attachment

Attach virtual nodes to DOM nodes programmatically:

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

const container = document.getElementById("app")!;
const vnode = div({}, () => "Hello World");
Component.Attach(container, vnode);
```

## Framework Integration

Component Composition integrates with:

- **Component Architecture**: Base Component class with generic type parameters and event firing
- **Template System**: Virtual node functions for UI rendering
- **Dependency Injection**: @Inject for service access in composed components
- **Reactive State Management**: Data properties use ObservableScope

## Best Practices

### Design for Reuse

- **Use generic types**: Parameterize components by data and template types for flexibility
- **Provide sensible defaults**: Make components work with minimal configuration
- **Document interfaces**: Clearly define the data and template types required

### Template Functions

- **Accept template functions**: Allow consumers to customize rendering logic
- **Use clear naming**: Name template functions descriptively (e.g., `item`, `cell`)
- **Provide type safety**: Use TypeScript generics for type-safe template functions

### Event Handling

- **Define event maps**: Use TypeScript interfaces to define event types and payloads
- **Fire events for actions**: Emit events when user actions or state changes occur
- **Handle events in parents**: Parent components should handle child component events
- **Use descriptive event names**: Name events clearly (e.g., `click`, `save`, `delete`)

### Component Registration

- **Use Register for Web Components**: When you need declarative HTML usage
- **Use ToFunction for composition**: When composing components programmatically
- **Use Attach for manual mounting**: When you need fine-grained control over rendering

### Domain Specialization

- **Separate concerns**: Keep generic components focused on structure and behavior
- **Create specialized components**: Wrap generic components with domain-specific logic
- **Leverage dependency injection**: Use @Inject to provide services to specialized components

## Related Patterns

- **Component Architecture**: Base Component class with generics
- **Dependency Injection**: @Inject for services in composed components
- **Reactive State Management**: Data properties use ObservableScope

## Framework Source

- `src/Node/component.ts` - Component class and ToFunction implementation
- `src/Node/vNode.ts` - Virtual node system for composition
- `src/DOM/elements.ts` - DOM element functions

## References

- [Data Table - Generic Component](../../examples/real_time_dashboard/src/components/data-table.ts)
- [Activity Data Table - Specialized Component](../../examples/real_time_dashboard/src/components/activity-data-table.ts)
