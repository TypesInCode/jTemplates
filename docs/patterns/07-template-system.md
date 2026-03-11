# Template System

## Overview

The Template System in j-templates provides reactive DOM rendering using virtual nodes (vNodes) and DOM element functions. Templates are defined in the `Template()` method and automatically re-render when reactive data changes.

## Key Concepts

- **DOM element functions**: Functions like `div()`, `span()`, `h1()` that create vNodes
- **Reactive bindings**: Arrow functions in data props enable automatic reactivity
- **vNode tree**: Tree structure representing the DOM hierarchy
- **Template functions**: Functions that render children based on parent data
- **calc()**: Optional optimization that prevents emissions when parent scope changes but derived value doesn't

## API Reference

### DOM Element Functions

All DOM element functions follow the same signature:

```typescript
function element(
  config?: vNodeConfig,
  children?: vNode[] | ((data: T) => vNode[])
): vNode
```

**Common DOM Functions:**
- `div()`, `span()`, `h1()`, `h2()`, etc. - Standard HTML elements
- `table()`, `thead()`, `tbody()`, `tr()`, `td()`, `th()` - Table elements
- `input()`, `button()`, `select()`, `option()` - Form elements
- `svg()`, `circle()`, `rect()` - SVG elements

### Function: calc()

Optional optimization wrapper for derived values.

```typescript
calc<T>(fn: () => T, idOverride?: string): T
```

**Purpose:** 
- Prevents emissions when parent scope changes but value doesn't (uses === check)
- Reuses scopes by ID within single parent evaluation

**Note:** NOT required for array reactivity - `@State` arrays work without it. Use only for primitive derived state or when parent scope aggregates multiple values.

### Type: vNodeConfig

Configuration for virtual nodes.

```typescript
interface vNodeConfig<P = HTMLElement, E = HTMLElementEventMap, T = never> {
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
}
```

**Properties:**
- `props`: DOM properties (e.g., `className`, `value`)
- `attrs`: HTML attributes
- `on`: Event handlers
- `data`: Reactive data binding

## Usage Examples

### Basic DOM Elements

```typescript
import { div, h1, span } from "j-templates/DOM";

class App extends Component {
  Template() {
    return div({ props: { className: "container" } }, () => [
      h1({}, () => "Title"),
      span({}, () => "Content"),
    ]);
  }
}
```

### Reactive Data Binding

```typescript
div({ data: () => this.Report }, (report) => [
  div({}, () => `Total: ${report.total}`),
  div({}, () => `Average: ${report.avg}`),
])
```

### Props with Functions

```typescript
div({
  props: () => ({
    className: this.isActive ? "active" : "inactive",
    id: `item-${this.Data.id}`
  })
}, () => "Content")
```

### Event Handlers

```typescript
button({
  on: {
    click: (event: MouseEvent) => {
      this.handleClick(event);
    },
    mouseover: (event: MouseEvent) => {
      this.handleHover(event);
    }
  }
}, () => "Click me")
```

### Dynamic Class Binding

```typescript
div({
  props: () => ({
    className: `card ${this.Data.selected ? "selected" : ""}`
  })
}, () => "Card")
```

### Table with Reactive Columns

```typescript
import { thead, th, tbody, td, tr } from "j-templates/DOM";

class DataTable extends Component<{ columns: Column[]; data: Item[] }> {
  Template() {
    return [
      thead({ data: () => this.Data.columns }, (column) =>
        th({}, () => column.name),
      ),
      tbody({ data: () => calc(() => this.Data.data) }, (data) =>
        tr({ data: () => this.Data.columns }, (column) =>
          td({}, () => data[column.key]),
        ),
      ),
    ];
  }
}
```

### Conditional Rendering

```typescript
div({}, () => [
  this.Data.loading
    ? span({}, () => "Loading...")
    : this.Data.error
      ? span({ props: { className: "error" } }, () => this.Data.error)
      : this.Data.items.map((item) => div({}, () => item.name)),
])
```

### Component Composition

```typescript
import { numberCard } from "./components/number-card";

div({ props: { className: "card-row" } }, () => [
  numberCard({
    data: () => ({
      title: "Total Visits",
      value: this.dataService.GetTotalVisits(),
    }),
  }),
  numberCard({
    data: () => ({
      title: "Total Time",
      value: this.dataService.GetTotalTime(),
    }),
  }),
])
```

### Form with Reactive Input

```typescript
input({
  props: () => ({
    value: this.Data.value,
    type: "text",
    placeholder: "Enter value"
  }),
  on: {
    input: (event: Event) => {
      const target = event.target as HTMLInputElement;
      this.Data.value = target.value;
    }
  }
})
```

## Framework Integration

Template System integrates with:

- **Component Architecture**: `Template()` method defines UI
- **Reactive State Management**: Data bindings track ObservableScope
- **Component Composition**: Components can embed other components
- **Animation System**: Animations can modify DOM properties

## Best Practices

- **Keep Template pure**: Only return vNodes, no side effects
- **Use arrow functions for reactivity**: `data: () => this.state`
- **Use calc() selectively**: Only when parent changes but derived value doesn't - not required for array reactivity
- **Leverage reactive bindings**: Use functions for dynamic props
- **Compose components**: Build complex UIs from simple components

## Related Patterns

- **Component Architecture**: Template method defines UI
- **Reactive State Management**: Data bindings use ObservableScope
- **Component Composition**: Components embed other components

## Framework Source

- `src/DOM/elements.ts` - DOM element functions
- `src/DOM/index.ts` - DOM module exports
- `src/Utils/functions.ts` - calc() implementation

## References

- [App Template](../../examples/real_time_dashboard/src/app.ts)
- [Data Table Template](../../examples/real_time_dashboard/src/components/data-table.ts)
- [Number Card Template](../../examples/real_time_dashboard/src/components/number-card.ts)
