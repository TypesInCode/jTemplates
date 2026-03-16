# j-templates

Type-safe reactive framework for browser applications.

```bash
npm install --save-dev j-templates
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

**Features:**
- TypeScript only - no compile step
- Bundler agnostic - works with Vite, Webpack, Rollup
- Minimal dependencies

## Reactive State

```typescript
import { Value, State, Computed } from "j-templates/Utils";

class Counter extends Component {
  @Value() count = 0;
  
  @Scope()
  get doubled() { return this.count * 2; }
}
```

See [Reactive State Management](docs/patterns/02-reactive-state-management.md) and [Decorators](docs/patterns/03-decorators.md).

## Template System

```typescript
import { div, button } from "j-templates/DOM";

Template() {
  return div({}, () => [
    // Reactive binding
    div({ data: () => this.count }, (c: number) => div({}, () => c)),
    // Event handler
    button({ on: { click: () => this.count++ } }, () => "+"),
    // Conditional
    isLoading ? div({}, () => "Loading") : "",
  ]);
}
```

See [Template System](docs/patterns/07-template-system.md).

## Component Composition

```typescript
interface CellTemplate<D> {
  cell: (data: D) => vNode;
}

class DataTable<D> extends Component<{ data: D[] }, CellTemplate<D>> {
  Template() {
    return tbody({ data: () => this.Data.data }, (item: D) =>
      tr({}, () => this.Templates.cell(item))
    );
  }
}
```

See [Component Composition](docs/patterns/05-component-composition.md).

## Component Events

```typescript
interface ButtonEvents {
  click: { x: number; y: number };
}

class Button extends Component<void, void, ButtonEvents> {
  Template() {
    return button({
      on: { click: (e) => this.Fire("click", { x: e.clientX, y: e.clientY }) }
    }, () => "Click");
  }
}
```

See [Component Architecture](docs/patterns/01-component-architecture.md).

## Dependency Injection

```typescript
import { Inject, Destroy } from "j-templates/Utils";

abstract class DataService {
  abstract getData(): Data[];
}

class Child extends Component {
  @Inject(DataService)
  service!: DataService;
}
```

See [Dependency Injection](docs/patterns/04-dependency-injection.md).

## Documentation

### Tutorials
- [Getting Started](docs/tutorials/01-getting-started.md)
- [Your First Component](docs/tutorials/02-your-first-component.md)
- [Reactive State Basics](docs/tutorials/03-reactive-state-basics.md)

### Patterns
- [Component Architecture](docs/patterns/01-component-architecture.md)
- [Reactive State Management](docs/patterns/02-reactive-state-management.md)
- [Decorators](docs/patterns/03-decorators.md)
- [Dependency Injection](docs/patterns/04-dependency-injection.md)
- [Component Composition](docs/patterns/05-component-composition.md)
- [Animation System](docs/patterns/06-animation-system.md)
- [Template System](docs/patterns/07-template-system.md)
- [Data Modeling](docs/patterns/08-data-modeling.md)

### Reference
- [Syntax & Best Practices](docs/SYNTAX_BEST_PRACTICES.md)

## Examples

**Real-Time Dashboard** - See [examples/real_time_dashboard/](examples/real_time_dashboard/)
