# j-templates

A small TypeScript library for building browser UIs that keep themselves in sync. Components describe their UI as functions that read data, and when a piece of data changes, only the parts of the page that read it update.

- **Plain TypeScript classes, no build step, no runtime dependencies.** Components are classes; `Template()` returns the UI. Nothing beyond the TypeScript compiler is required.
- **Data as data.** Reactive fields are read and written as their native type — arrays support `push`, `splice`, `sort`, and direct mutation; primitives are just numbers, strings, and booleans.
- **No vNode diffing.** Reactivity is targeted at the source — when a value changes, only the exact function that reads it re-runs and updates the page.

## Getting started

Install:

```bash
npm install j-templates
```

j-templates uses TypeScript decorators, so `tsconfig.json` needs these two flags:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

A component:

```typescript
import { Component } from "j-templates";
import { State } from "j-templates/Utils";
import { div, ul, li, button } from "j-templates/DOM";

class TodoList extends Component {
  @State() items: string[] = [];

  Template() {
    return div({}, () => [
      button(
        { on: { click: () => this.items.push(`Item ${this.items.length + 1}`) } },
        () => "Add",
      ),
      ul({ data: () => this.items }, (item) => li({}, () => item)),
    ]);
  }
}

const todoList = Component.ToFunction("todo-list", TodoList);
Component.Attach(document.body, todoList({}));
```

`items` is a plain array — `push` and the other mutating array methods work directly, and the list updates. Clicking Add re-runs only the new `li`; nothing else on the page re-runs.

## Element functions

Every element function — `div`, `button`, `input`, and the rest — has the same shape:

```typescript
element(config?: {
  props?: Props | (() => Props);  // DOM properties
  attrs?: object | (() => object); // HTML attributes
  on?: object | (() => object);    // event handlers, e.g. { click: (e) => ... }
  data?: () => T | T[];            // the value(s) the children function reads
}, children?: vNode[] | ((data: T) => vNode | vNode[] | string));
```

`children` is either a fixed array of elements, or a function. A function creates its own reactive scope.

`data:` control child elements data binding. List rendering and conditional rendering are the same mechanism, read through `data:`: `data: () => this.items` calls children once per item; `data: () => this.isOpen` calls children once if `isOpen` is true. Falsy values result in no children.

## Component functions

`Component.ToFunction(tag, ComponentClass)` returns a function with the same call shape as an element function. This function can be used inside another component's `Template()` just like `div` or `button`:

```typescript
interface TaskItemEvents { remove: void }

class TaskItem extends Component<{ name: string }, void, TaskItemEvents> {
  Template() {
    return li({ on: { click: () => this.Fire("remove") } }, () => this.Data.name);
  }
}
const taskItem = Component.ToFunction("task-item", TaskItem);

class TaskList extends Component {
  @State() tasks: string[] = ["Buy milk"];

  Template() {
    return ul({ data: () => this.tasks }, (task) =>
      taskItem({
        data: () => ({ name: task }),
        on: { remove: () => this.tasks.splice(this.tasks.indexOf(task), 1) },
      }),
    );
  }
}
```

`data:` passes data down, read in the child through `this.Data`. `on:` plus `this.Fire(event, payload)` pass events back up. Unlike a DOM element, a component's `data:` value is passed through as-is — a component decides for itself whether to iterate it.

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
