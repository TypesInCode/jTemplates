# Tutorial 4: Template System Deep Dive

**Duration:** 60 minutes  
**What You'll Build:** A fully functional todo list application with conditional rendering, list rendering, and event handling

## Prerequisites

- Tutorial 1: Getting Started (complete)
- Tutorial 2: Your First Component (complete)
- Tutorial 3: Reactive State Basics (complete)
- Node.js 18+ installed
- Basic TypeScript knowledge

## Learning Objectives

By the end of this tutorial, you will be able to:

- Use DOM element functions (`div`, `span`, `input`, `button`, etc.)
- Create reactive bindings using arrow functions
- Implement conditional rendering patterns
- Render lists of items using the `data` prop
- Handle user events properly
- Implement two-way data binding
- Pass data and events between components

---

## Step 1: DOM Element Functions

j-templates provides helper functions for creating common HTML elements. These functions create vNodes (virtual DOM nodes) that are efficiently rendered to the real DOM.

### Available Functions

```typescript
// Block elements
div(config?, children?)
section(config?, children?)
article(config?, children?)
header(config?, children?)
footer(config?, children?)
nav(config?, children?)

// Text elements
h1(config?, children?)
h2(config?, children?)
h3(config?, children?)
p(config?, children?)
span(config?, children?)

// Form elements
input(config?)
button(config?, children?)
textarea(config?)
select(config?, children?)
label(config?, children?)

// List elements
ul(config?, children?)
ol(config?, children?)
li(config?, children?)

// Container elements
form(config?, children?)
table(config?, children?)
tr(config?, children?)
td(config?, children?)
th(config?, children?)
```

### Function Signature

Each element function has the same signature:

```typescript
function element(config?: ElementConfig, children?: vNode | ((data) => vNode)): vNode
```

**Parameters:**
- `config` (optional): Configuration object with `props`, `on`, `data`, etc.
- `children` (optional): Child elements or a function returning children

### Example: Creating Nested Elements

```typescript
// Create a simple div with text
div({}, () => "Hello World")

// Create a div with CSS class
div({ props: { className: "container" } }, () => "Content")

// Create nested structure
div({ props: { className: "card" } }, [
  h2({}, () => "Card Title"),
  p({}, () => "Card description text"),
  button({ on: { click: () => console.log("Clicked!") } }, () => "Click Me")
])
```

**Note:** Children that are arrays don't need to be wrapped in a function for basic cases. However, wrapping children arrays in functions creates separate reactive scopes for each child, enabling more granular updates:

```typescript
// Without function - all children tracked in parent scope
div({}, [
  span({}, () => this.value1),  // Updates with parent
  span({}, () => this.value2)   // Updates with parent
])

// With function - each child has its own scope
div({}, () => [
  span({}, () => this.value1),  // Independent scope
  span({}, () => this.value2)   // Independent scope
])
```

**Why it matters:** When wrapping children in a function, each reactive expression creates its own scope. This means toggling one todo item only updates that specific item's scope, not the entire list. For complex templates with many reactive values, use `() => [...]` to minimize unnecessary re-renders.

---

## Step 2: Reactive Bindings

Reactive bindings automatically update the DOM when state changes. You create them by passing functions (arrow functions or methods) to props or children.

### How It Works

When you pass a function to a prop or child position, j-templates:
1. Calls the function initially to get the value
2. Tracks dependencies (reactive state accessed inside)
3. Re-runs the function when dependencies change
4. Updates the DOM with the new value

### Reactive Props

```typescript
class Counter extends Component {
  @Value()
  count = 0;
  
  Template() {
    return div({
      props: () => ({ 
        className: `counter ${this.count > 10 ? 'large' : 'normal'}` 
      })
    }, () => `Count: ${this.count}`);
  }
}
```

The `className` prop re-evaluates whenever `count` changes.

### Reactive Children

```typescript
class Greeting extends Component {
  @Value()
  name = "World";
  
  Template() {
    return div({}, () => `Hello, ${this.name}!`);
  }
}
```

The text content updates automatically when `name` changes.

### When to Use Functions

| Scenario | Use Function? | Example |
|----------|---------------|---------|
| Static prop value | ❌ No | `props: { className: "btn" }` |
| Prop depends on state | ✅ Yes | `props: () => ({ disabled: !this.isValid })` |
| Static text | ❌ No | `span({}, "Static text")` |
| Text with state | ✅ Yes | `span({}, () => `Count: ${this.count}`)` |
| Array of vNodes | ❌ No | `div({}, [child1, child2])` |
| Conditional vNode | ✅ Yes | `div({}, () => this.show ? child1 : child2)` |

---

## Step 3: Conditional Rendering

Conditional rendering lets you show or hide elements based on state.

### Pattern 1: Ternary Operator

Use when you have two alternatives:

```typescript
class LoadingComponent extends Component {
  @Value()
  isLoading = true;
  
  Template() {
    return div({}, [
      this.isLoading
        ? span({}, () => "Loading...")
        : div({}, () => "Content loaded!")
    ]);
  }
}
```

### Pattern 2: Short-Circuit Evaluation

Use when you want to show something only when a condition is true:

```typescript
class ErrorDisplay extends Component {
  @Value()
  error: string | null = null;
  
  Template() {
    return div({}, [
      // Only shows when error is truthy
      this.error && div({ props: { className: "error" } }, () => this.error),
      div({}, () => "Main content")
    ]);
  }
}
```

**Warning:** If the condition can be `0` or `false`, use ternary instead:

```typescript
// ❌ Won't work if count is 0
this.count && span({}, () => `Count: ${this.count}`)

// ✅ Works correctly
this.count > 0 && span({}, () => `Count: ${this.count}`)
```

### Pattern 3: Helper Function

Use for complex conditions:

```typescript
class UserStatus extends Component {
  @State()
  user = { name: "", isLoggedIn: false };
  
  @Value()
  isLoading = false;
  
  private getStatusMessage(): string {
    if (this.isLoading) return "Loading...";
    if (!this.user.isLoggedIn) return "Please log in";
    return `Welcome, ${this.user.name}!`;
  }
  
  Template() {
    return div({}, () => this.getStatusMessage());
  }
}
```

---

## Step 4: List Rendering

Rendering lists of items uses the `data` prop. Pass your array to `data`, and the framework automatically iterates it.

### Basic List Rendering

```typescript
class ItemList extends Component {
  @State()
  items = ["Apple", "Banana", "Cherry"];
  
  Template() {
    return div({
      props: { className: "list" },
      data: () => this.items
    }, (item) =>
      div({}, () => item)
    );
  }
}
```

**How it works:**
- `data: () => this.items` passes the array to the framework
- Framework automatically iterates the array
- Children function `(item) => ...` receives one element at a time
- Each call to children renders one item

### Lists with Components

```typescript
class TodoList extends Component {
  @State()
  todos: Todo[] = [];
  
  Template() {
    return div({
      data: () => this.todos
    }, (todo) => 
      todoItem({
        data: todo,
        on: {
          onToggle: (id) => this.toggleTodo(id)
        }
      })
    );
  }
}
```

**Key Point:** Notice we don't call `.map()` ourselves. The framework handles iteration when you use the `data` prop.

### Handling Empty States

```typescript
class TodoList extends Component {
  @State()
  todos: Todo[] = [];
  
  Template() {
    return div({}, [
      this.todos.length === 0
        ? div({ props: { className: "empty-state" } }, () => "No todos yet!")
        : div({
            data: () => this.todos
          }, (todo) =>
            todoItem({ data: todo })
          )
    ]);
  }
}
```

---

## Step 5: Event Handling

Events are handled through the `on` config parameter.

### Basic Event Handling

```typescript
button({
  on: {
    click: () => console.log("Clicked!")
  }
}, () => "Click Me")
```

### Accessing Event Objects

```typescript
input({
  on: {
    input: (e: Event) => {
      const target = e.target as HTMLInputElement;
      console.log(target.value);
    }
  }
})
```

### Common Event Types

| Element | Events |
|---------|--------|
| button, div | `click`, `dblclick`, `mousedown`, `mouseup` |
| input | `input`, `change`, `focus`, `blur` |
| form | `submit`, `reset` |
| document | `keydown`, `keyup`, `keypress` |
| any | `mouseenter`, `mouseleave`, `scroll` |

### Event Handler Patterns

**Pattern 1: Inline Arrow Function** (good for simple logic)

```typescript
button({
  on: { click: () => this.count++ }
}, () => "Increment")
```

**Pattern 2: Component Method** (good for complex logic)

```typescript
class Counter extends Component {
  @Value()
  count = 0;
  
  private handleIncrement(): void {
    if (this.count < 100) {
      this.count++;
      console.log("Incremented to", this.count);
    }
  }
  
  Template() {
    return button({
      on: { click: () => this.handleIncrement() }
    }, () => "Increment");
  }
}
```

**Pattern 3: With Event Object**

```typescript
input({
  on: {
    input: (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.value = target.value;
    }
  }
})
```

---

## Step 6: Two-Way Data Binding

Two-way data binding syncs a form input's value with component state.

### Basic Two-Way Binding

```typescript
class TextInput extends Component {
  @Value()
  text = "";
  
  Template() {
    return input({
      props: () => ({ value: this.text }),  // Wrap value in function for reactivity
      on: {
        input: (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.text = target.value;
        }
      }
    });
  }
}
```

**Important:** The `value` prop must be wrapped in a function `() => this.text` for two-way binding to work properly. Without the function wrapper, the input will lose focus after each keystroke because the DOM element gets recreated instead of updated.

**How it works:**
1. `props: { value: this.text }` - Sets the input's value from state
2. `on: { input: ... }` - Updates state when user types
3. Result: State and input stay in sync

### Reusable Input Component

```typescript
interface TextInputConfig {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function textInput(config: TextInputConfig) {
  return input({
    props: () => ({ 
      value: config.value,
      placeholder: config.placeholder || ""
    }),
    on: {
      input: (e: Event) => {
        const target = e.target as HTMLInputElement;
        config.onChange(target.value);
      }
    }
  });
}
```

Usage:

```typescript
textInput({
  value: this.name,
  placeholder: "Enter your name",
  onChange: (value) => this.name = value
})
```

---

## Complete Example: Todo List

Let's build a complete todo list application that demonstrates all the concepts we've learned.

### Project Structure

```
tutorial-4/
├── src/
│   ├── app.ts              # Entry point
│   ├── todo-list.ts        # Main todo list component
│   └── todo-item.ts        # Individual todo item component
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

### Component 1: TodoItem

```typescript
import { Component } from 'j-templates';
import { div, input, span, button } from 'j-templates/DOM';

interface TodoItemData {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoItemEvents {
  onToggle: number;
  onDelete: number;
}

class TodoItem extends Component<TodoItemData, {}, TodoItemEvents> {
  Template() {
    return div({
      props: () => ({
        className: this.Data.completed ? 'todo-item completed' : 'todo-item'
      })
    }, [
      // Checkbox
      input({
        type: 'checkbox',
        props: { checked: this.Data.completed },
        on: { change: () => this.Fire('onToggle', this.Data.id) }
      }),
      
      // Text
      span({}, () => this.Data.text),
      
      // Delete button
      button({
        on: { click: () => this.Fire('onDelete', this.Data.id) }
      }, () => 'Delete')
    ]);
  }
}

export const todoItem = Component.ToFunction('todo-item', TodoItem);
```

### Component 2: TodoList

```typescript
import { Component, Value, State } from 'j-templates';
import { div, h1, input, button, span } from 'j-templates/DOM';
import { todoItem } from './todo-item.js';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type FilterType = 'all' | 'active' | 'completed';

class TodoList extends Component {
  @Value()
  newInput: string = '';
  
  @State()
  todos: Todo[] = [];
  
  @Value()
  filter: FilterType = 'all';
  
  @Value()
  nextId: number = 1;
  
  // Filter todos based on current filter
  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }
  
  // Add new todo - use .push() with @State
  private addTodo(): void {
    if (this.newInput.trim() === '') return;
    
    this.todos.push({
      id: this.nextId,
      text: this.newInput.trim(),
      completed: false
    });
    this.nextId++;
    this.newInput = '';
  }
  
  // Toggle todo completion - direct mutation with @State
  private toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }
  
  // Delete todo - filter creates new array
  private deleteTodo(id: number): void {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }
  
  // Clear completed todos
  private clearCompleted(): void {
    this.todos = this.todos.filter(todo => !todo.completed);
  }
  
  Template() {
    return div({ props: { className: 'app' } }, [
      h1({}, () => 'Todo List'),
      
      // Input with two-way binding
      div({}, [
        input({
          props: { value: this.newInput, placeholder: 'Add a todo...' },
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newInput = target.value;
            }
          }
        }),
        button({ on: { click: () => this.addTodo() } }, () => 'Add')
      ]),
      
      // Filter buttons
      div({}, [
        button({ 
          props: () => ({ className: this.filter === 'all' ? 'active' : '' }),
          on: { click: () => this.filter = 'all' }
        }, () => 'All'),
        button({ 
          props: () => ({ className: this.filter === 'active' ? 'active' : '' }),
          on: { click: () => this.filter = 'active' }
        }, () => 'Active'),
        button({ 
          props: () => ({ className: this.filter === 'completed' ? 'active' : '' }),
          on: { click: () => this.filter = 'completed' }
        }, () => 'Completed')
      ]),
      
      // Todo list - framework iterates array from data prop
      this.todos.length === 0
        ? div({}, () => 'No todos yet!')
        : div({ 
            props: { className: 'todo-list' },
            data: () => this.filteredTodos
          }, (todo) =>
            todoItem({
              data: todo,
              on: {
                onToggle: (id: number) => this.toggleTodo(id),
                onDelete: (id: number) => this.deleteTodo(id)
              }
            })
          )
    ]);
  }
}

export const todoList = Component.ToFunction('todo-list', TodoList);
```

### Entry Point

```typescript
import { Component } from 'j-templates';
import { todoList } from './todo-list.js';

class App extends Component {
  Template() {
    return todoList({});
  }
}

const app = new App();
Component.Attach(app, document.getElementById('app')!);
```

---

## Try It Yourself

### Exercise 1: Add Priority Levels

Extend the todo list to support priority levels (high, medium, low):

1. Add a `priority` field to the `Todo` interface
2. Add a priority selector in the input section
3. Color-code todo items based on priority
4. Add a filter for priority levels

### Exercise 2: Add Todo Editing

Implement inline editing for todos:

1. Add an "Edit" button to each todo item
2. When editing, show an input field instead of text
3. Save changes when user presses Enter or clicks outside
4. Cancel editing with Escape key

### Exercise 3: Persist to LocalStorage

Make todos persist across page reloads:

1. Save todos to `localStorage` whenever they change
2. Load todos from `localStorage` on component initialization
3. Handle cases where localStorage is empty or invalid

---

## Troubleshooting

### Issue: Events Not Firing

**Problem:** Click handlers don't work

**Solution:** Make sure you're using `on` not `props`:

```typescript
// ❌ Wrong
button({ props: { onclick: () => handleClick() } })

// ✅ Correct
button({ on: { click: () => handleClick() } })
```

### Issue: DOM Not Updating

**Problem:** State changes but UI doesn't update

**Solution:** Check that you're using reactive state (`@Value` or `@State`) and not plain properties:

```typescript
// ❌ Won't trigger updates
private count: number = 0;

// ✅ Will trigger updates
@Value()
declare count: number;
```

### Issue: Cannot Access Event Target

**Problem:** TypeScript error when accessing `e.target`

**Solution:** Cast to the appropriate HTML element type:

```typescript
// ✅ Correct
input({
  on: {
    input: (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.value = target.value;
    }
  }
})
```

### Issue: List Items Not Rendering

**Problem:** Array items don't appear in the list

**Solution:** Make sure you're using the `data` prop correctly:

```typescript
// ❌ Wrong - children function receives array, not items
div({}, (items) => items.map(item => ...))

// ✅ Correct - framework passes single item
div({ data: () => items }, (item) => ...)
```

---

## References

### Patterns Documentation
- [Templates & Data](../../patterns/03-templates-and-data.md) - Complete template API reference
- [Reactivity](../../patterns/02-reactivity.md) - Reactive state patterns
- [Components](../../patterns/01-components.md) - Component basics

### Source Code
- `src/DOM/elements.ts` - DOM element functions
- `src/Node/vNode.ts` - vNode type definitions
- `src/Node/component.ts` - Component base class

### Example Projects
- `examples/tutorial_project/tutorial-4/` - Complete todo list example
- `examples/real_time_dashboard/` - Advanced component composition

---

## Summary

In this tutorial, you learned:

✅ **DOM element functions** - `div`, `span`, `input`, `button`, etc. create vNodes  
✅ **Reactive bindings** - Arrow functions in props/children auto-update  
✅ **Conditional rendering** - Ternary and short-circuit patterns  
✅ **List rendering** - Use `data` prop for framework-managed iteration  
✅ **Event handling** - Use the `on` config for event handlers  
✅ **Two-way data binding** - Sync inputs with component state  

### Next Steps

Continue to **Tutorial 5: Decorators Deep Dive** to learn about:
- `@Computed` for derived state
- `@Watch` for side effects
- `@Destroy` for cleanup
- Advanced reactive patterns

---

## Checklist

Before moving to the next tutorial, verify:

- [ ] You understand when to use functions vs plain values
- [ ] You can implement conditional rendering
- [ ] You know to use `data` prop for list rendering (not `.map()`)
- [ ] You know how to handle events properly
- [ ] You can implement two-way data binding
- [ ] The tutorial-4 example builds and runs successfully
- [ ] You've completed at least one "Try It Yourself" exercise
