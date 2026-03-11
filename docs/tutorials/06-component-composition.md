# Tutorial 6: Component Composition

**Duration:** 75 minutes

**What You'll Build:** Reusable list, table, and card components with event handling, data passing, and template functions.

---

## What You'll Learn

By the end of this tutorial, you'll understand:

1. **Passing data from parent to child components** - How to share data between components via `data` config
2. **Component events** - How children notify parents of actions via `on` config
3. **Template functions for customization** - Making components flexible with custom rendering
4. **Framework data iteration** - Using the `data` prop for automatic list iteration
5. **Building reusable components** - Creating generic, type-safe components
6. **Component composition patterns** - Combining components to build complex UIs

---

## Prerequisites

- Completed Tutorials 1-5
- Familiarity with `@Value` and `@State` decorators
- Understanding of the Template() method
- Basic TypeScript knowledge (interfaces, generic types)

---

## Table of Contents

1. [Introduction to Component Composition](#introduction-to-component-composition)
2. [Section 1: Simple List with Component Events](#section-1-simple-list-with-component-events)
3. [Section 2: Template Functions](#section-2-template-functions)
4. [Section 3: Table Component](#section-3-table-component)
5. [Section 4: Card Components](#section-4-card-components)
6. [Section 5: Event Handling](#section-5-event-handling)
7. [Section 6: Conditional Rendering](#section-6-conditional-rendering)
8. [Try It Yourself Exercises](#try-it-yourself-exercises)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Introduction to Component Composition

Component composition is the practice of building complex UIs by combining simpler components. It's a fundamental pattern in modern frontend development.

### Key Concepts

1. **Data Props** - Parents pass data to children via the `data` config
2. **Component Events** - Children notify parents of actions via the `on` config
3. **Template Functions** - Parents customize child rendering via templates
4. **Framework Data Iteration** - The framework automatically iterates arrays passed via `data`

### Component Communication Patterns

```typescript
// Parent → Child (data passing)
childComponent({
  data: () => ({ title: "Hello", items: [...] })
})

// Parent → Child (events)
childComponent({
  on: {
    select: (payload) => this.handleSelect(payload),
    delete: (payload) => this.handleDelete(payload)
  }
})

// Child → Parent (firing events)
this.Fire("select", { index, data: item });
```

---

## Section 1: Simple List with Component Events

Let's build a reusable list component that displays items and handles selection.

### Step 1: Define Data and Event Interfaces

First, define what data the component needs and what events it fires:

```typescript
interface SimpleListData {
  items: string[];
}

interface SimpleListEvents {
  select: { index: number; item: string };
}
```

### Step 2: Create the List Component Class

```typescript
class SimpleList extends Component<SimpleListData, void, SimpleListEvents> {
  @Value() selectedIndex: number = -1;

  Template() {
    const { items } = this.Data;

    return div({ props: { className: "simple-list" } }, () => [
      p({}, () => `Items: ${items.length}`),
      // Use framework data iteration - passes single item to children function
      div({ data: () => calc(() => items) }, (item: string) => {
        const index = items.indexOf(item);
        return div({
          props: () => ({
            className: this.selectedIndex === index ? "selected list-item" : "list-item"
          }),
          on: {
            click: () => {
              this.selectedIndex = index;
              // Fire component event to parent
              this.Fire("select", { index, item });
            }
          }
        }, () => item);
      })
    ]);
  }
}
```

**Key Points:**

1. **`<Component<D, T, E>>`** - Generic parameters for Data, Templates, Events
2. **`this.Data`** - Accesses the passed data props
3. **`data: () => calc(() => items)`** - Framework iterates array automatically
4. **`this.Fire("select", ...)`** - Fires event to parent handler
5. **Framework iteration** - Children function receives single item, not array

### Step 3: Convert to Factory Function

```typescript
const simpleList = Component.ToFunction("simple-list", SimpleList);
```

### Step 4: Use the Component with Event Handlers

```typescript
simpleList({
  data: () => ({
    items: ["Item 1", "Item 2", "Item 3"]
  }),
  on: {
    select: (payload: { index: number; item: string }) => {
      console.log("Selected:", payload.index, payload.item);
    }
  }
})
```

**Important:** Events go in the `on` config, NOT in `data` or `props`!

### Try It

1. Click items to see selection highlighting
2. Open the console to see selection events
3. Notice how the framework handles array iteration

---

## Section 2: Template Functions

Template functions allow parents to customize how child components render their content. This is a powerful pattern for building flexible, reusable components.

### Step 1: Define Template Interface

```typescript
interface GenericListData<T> {
  items: T[];
  emptyMessage?: string;
}

interface GenericListTemplate<T> {
  item: (data: T, index: number) => vNode;
}

interface GenericListEvents<T> {
  select: { index: number; data: T };
}
```

### Step 2: Create Generic List Component

```typescript
class GenericList<T> extends Component<GenericListData<T>, GenericListTemplate<T>, GenericListEvents<T>> {
  @Value() selectedIndex: number = -1;

  Template() {
    const { items, emptyMessage } = this.Data;
    const templates = this.Templates;

    if (!items || items.length === 0) {
      return div({ props: { className: "list-empty" } }, () => emptyMessage || "No items");
    }

    return div({ props: { className: "generic-list" } }, () => [
      div({ data: () => calc(() => items) }, (item: T) => {
        const index = items.indexOf(item);
        return div({
          props: () => ({
            className: this.selectedIndex === index ? "selected list-item" : "list-item"
          }),
          on: {
            click: () => {
              this.selectedIndex = index;
              this.Fire("select", { index, data: item });
            }
          }
        }, () => templates.item(item, index));
      })
    ]);
  }
}
```

### Step 3: Create Factory Function with Type Preservation

```typescript
function createGenericList<T>() {
  return Component.ToFunction("generic-list", GenericList<T>);
}

const genericList = createGenericList() as <T>(
  config: Parameters<ReturnType<typeof createGenericList<T>>>[0],
  templates?: GenericListTemplate<T>
) => ReturnType<ReturnType<typeof createGenericList<T>>>;
```

### Step 4: Use with Custom Template

```typescript
genericList(
  {
    data: () => ({
      items: ["Apple", "Banana", "Cherry"]
    }),
    on: {
      select: (payload: { index: number; data: string }) => {
        this.selectedGenericItem = payload.data;
      }
    }
  },
  {
    // Parent passes custom template for rendering each item
    item: (fruit: string, index: number) => 
      div({}, () => [
        span({ props: { className: "item-icon" } }, () => "🍎 "),
        span({}, () => `${fruit} #${index + 1}`)
      ])
  }
)
```

**Key Pattern: Templates as Second Parameter**

```typescript
component(config, {
  templateFunction1: (data) => ...,
  templateFunction2: (data) => ...
})
```

### Benefits of Template Functions

1. **Flexibility** - Same component, different visual presentations
2. **Type Safety** - TypeScript ensures templates match data types
3. **Reusability** - Generic components work with any data type
4. **Separation** - Component logic separate from rendering details

---

## Section 3: Table Component

Tables display tabular data. Let's create a table component using framework data iteration.

### Step 1: Define Table Data Interface

```typescript
interface TableData {
  headers: string[];
  rows: string[][];
}
```

### Step 2: Create the Table Component

```typescript
class SimpleTable extends Component<TableData> {
  Template() {
    const { headers, rows } = this.Data;

    return table({ props: { className: "simple-table" } }, [
      // Header row - static, use map in children array
      thead({}, () =>
        tr({}, () =>
          headers.map((header) => th({}, () => header))
        )
      ),
      // Data rows - use framework iteration with calc()
      tbody({ data: () => calc(() => rows) }, (row: string[]) =>
        tr({}, () =>
          // Cells are static for each row - use map
          row.map((cell) => td({}, () => cell))
        )
      )
    ]);
  }
}

const simpleTable = Component.ToFunction("simple-table", SimpleTable);
```

**Important: Using calc()**

Arrays are reactive by default through `@State` and ObservableNode. `calc()` is optional:

```typescript
// Without calc() - works fine, arrays are reactive via @State
tbody({ data: () => rows }, ...)

// With calc() - optional optimization that gates emissions
// Only emits if array reference changes (=== check)
tbody({ data: () => calc(() => rows) }, ...)
// Only beneficial when parent scope changes but array reference stays same
```

### Step 3: Use with Real Data

```typescript
const users = [
  { name: "Alice", email: "alice@example.com", role: "admin" },
  { name: "Bob", email: "bob@example.com", role: "user" }
];

simpleTable({
  data: () => ({
    headers: ["Name", "Email", "Role"],
    rows: users.map(u => [u.name, u.email, u.role])
  })
})
```

---

## Section 4: Card Components

Cards are versatile containers for content. Let's build one with optional sections.

### Step 1: Define Card Data

```typescript
interface CardData {
  title: string;
  content: string;
  footer?: string;  // Optional footer
}
```

### Step 2: Create the Card Component

```typescript
class Card extends Component<CardData> {
  Template() {
    const { title, content, footer } = this.Data;

    return div({ props: { className: "card" } }, () => [
      div({ props: { className: "card-header" } }, () => title),
      div({ props: { className: "card-content" } }, () => content),
      footer ? div({ props: { className: "card-footer" } }, () => footer) : div({}, () => "")
    ]);
  }
}

const card = Component.ToFunction("card", Card);
```

**Key Pattern: Conditional Rendering**

```typescript
// Show element if value exists
footer ? div({}, () => footer) : div({}, () => "")
```

### Step 3: Use Multiple Cards

```typescript
div({
  props: () => ({
    style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;"
  })
}, () => [
  card({
    data: () => ({
      title: "Card 1",
      content: "Simple card with title and content.",
      footer: "Footer text"
    })
  }),
  card({
    data: () => ({
      title: "Card 2",
      content: "Another card without footer."
      // No footer property
    })
  })
])
```

---

## Section 5: Event Handling

Components communicate upward through events. This is the primary way for children to notify parents of user actions.

### Complete Example: User List with Details

```typescript
class App extends Component {
  @Value() selectedUser: User | null = null;

  Template() {
    return div({}, () => [
      // User list using framework iteration
      div({ data: () => calc(() => users) }, (user: User) =>
        div({
          props: () => ({
            className: this.selectedUser?.id === user.id ? "user-selected" : "user-item"
          }),
          on: {
            click: () => {
              this.selectedUser = user;
            }
          }
        }, () => user.name)
      ),
      // Selected user details
      this.selectedUser 
        ? div({ props: { className: "user-details" } }, () => [
            h3({}, () => this.selectedUser!.name),
            p({}, () => `Email: ${this.selectedUser!.email}`),
            p({}, () => `Role: ${this.selectedUser!.role}`)
          ])
        : p({}, () => "No user selected")
    ]);
  }
}
```

**Key Points:**

1. **`@Value()`** stores selected state in parent
2. **`this.selectedUser?.id`** - Optional chaining prevents errors
3. **`this.selectedUser!`** - Non-null assertion after conditional check
4. **Framework iteration** - `data: () => calc(() => users)` passes single user
5. Conditional rendering shows/hides details panel

---

## Section 6: Conditional Rendering

Control what gets rendered based on state.

### Pattern 1: Ternary Operator

```typescript
this.showMessage 
  ? div({ props: { className: "message" } }, () => "Visible!")
  : div({}, () => "Hidden")
```

### Pattern 2: Optional with Empty Fallback

```typescript
// Returns empty div if condition is false
this.showMessage 
  ? div({ props: { className: "message" } }, () => "Visible!")
  : div({}, () => "")
```

### Pattern 3: Optional Chaining

```typescript
// Safe property access
this.selectedUser?.name || "No user"
```

### Complete Example: Toggle Message

```typescript
class MessageToggle extends Component {
  @Value() showMessage: boolean = true;

  Template() {
    return div({}, () => [
      button({
        props: { className: "btn" },
        on: {
          click: () => {
            this.showMessage = !this.showMessage;
          }
        }
      }, () => "Toggle Message"),
      this.showMessage 
        ? div({ props: { className: "message" } }, () => "Message is visible!")
        : div({}, () => "Message is hidden")
    ]);
  }
}
```

---

## Try It Yourself Exercises

### Exercise 1: Add Filtering to List

Modify the `SimpleList` component to add a text filter:

1. Add a `filterText` @Value() for the current filter
2. Add an input field for the filter
3. Filter items based on the filter text
4. Use `calc()` for the filtered items (optional - though filtering always creates new array)

**Hint:** Create a computed filtered list in the Template. Note: filtering creates a new array each time, so calc()'s === check won't help, but it's still valid syntax.

### Exercise 2: Add Delete Button to Cards

Modify the `Card` component to include a delete button:

1. Add a `onDelete?: () => void` to CardData
2. Add a delete button in the header
3. Call onDelete when clicked
4. Style the button differently

### Exercise 3: Create a Sortable Table

Extend `SimpleTable` to support sorting:

1. Add a `sortColumn` @Value() to track current sort
2. Add click handlers to column headers
3. Sort the rows when a header is clicked
4. Show a sort indicator (↑ or ↓)

### Exercise 4: Build a List with Custom Actions

Create a generic list that supports multiple actions:

1. Add `onSelect` and `onDelete` events
2. Add action buttons to each item
3. Use template functions to customize action buttons
4. Fire appropriate events when buttons clicked

---

## Troubleshooting

### Problem: Component Events Don't Fire

**Cause:** Event handlers not passed correctly

**Solution:** Make sure to use the `on` config, not `props`:

```typescript
// ❌ Wrong
simpleList({
  data: () => ({ items }),
  onSelect: handler  // This doesn't work!
})

// ✅ Right
simpleList({
  data: () => ({ items }),
  on: {
    select: handler  // Events go in 'on' config
  }
})
```

### Problem: List Doesn't Update When Data Changes

**Cause:** Array not using reactive state (not @State or ObservableNode)

**Solution:** Use @State for arrays or ensure proper reactivity:

```typescript
// ✅ Correct - @State arrays are reactive by default
@State()
items: Item[] = [];

div({ data: () => this.items }, ...)  // Works without calc()

// Optional: add calc() for batching optimization
div({ data: () => calc(() => this.items) }, ...)
```

**Note:** If using a plain array constant, reactivity won't work - must use @State or ObservableNode.Create()

### Problem: Optional Properties Cause Errors

**Cause:** Accessing undefined optional properties

**Solution:** Use optional chaining:

```typescript
// ❌ Error if footer is undefined
div({}, () => this.Data.footer.toUpperCase())

// ✅ Safe
div({}, () => this.Data.footer?.toUpperCase() || "")
```

### Problem: Conditional Rendering Shows Nothing

**Cause:** Returning `null` or `undefined` directly

**Solution:** Return empty div or use string:

```typescript
// ❌ May cause issues
this.condition ? component() : null

// ✅ Better
this.condition ? component() : div({}, () => "")
```

### Problem: Templates Not Working

**Cause:** Templates passed in wrong parameter

**Solution:** Pass templates as second argument:

```typescript
// ❌ Wrong
genericList({
  data: () => ({ items }),
  templates: { item: ... }  // Doesn't work!
})

// ✅ Right
genericList(
  { data: () => ({ items }) },
  { item: ... }  // Templates as second parameter
)
```

---

## References

### Patterns Documentation

- **Component Architecture:** `docs/patterns/01-component-architecture.md`
- **Component Composition:** `docs/patterns/05-component-composition.md`

### Source Code

- **Component Class:** `src/Node/component.ts`
- **DOM Functions:** `src/DOM/elements.ts`
- **vNode System:** `src/Node/vNode.ts`

### Previous Tutorials

- **Tutorial 1:** Getting Started - `docs/tutorials/01-getting-started.md`
- **Tutorial 2:** Your First Component - `docs/tutorials/02-your-first-component.md`
- **Tutorial 3:** Reactive State Basics - `docs/tutorials/03-reactive-state-basics.md`
- **Tutorial 4:** Template System Deep Dive - `docs/tutorials/04-template-system-deep-dive.md`
- **Tutorial 5:** Decorators Deep Dive - `docs/tutorials/05-decorators-deep-dive.md`

---

## What's Next?

Continue to **Tutorial 7: Dependency Injection** to learn:

- How to inject services into components
- The @Inject decorator
- Service contracts and dependency inversion
- Testing with mock dependencies

---

## Summary

In this tutorial, you learned:

✅ **Data Props** - Passing data from parent to child via `data: () => {...}`

✅ **Component Events** - Communicating from child to parent via `on: { event: handler }` and `this.Fire()`

✅ **Template Functions** - Customizing child rendering via templates as second parameter

✅ **Framework Data Iteration** - Using `data: () => calc(() => array)` for automatic list iteration

✅ **Component Patterns** - Building reusable, composable components

✅ **Conditional Rendering** - Using ternary and boolean operators

You now have the foundation to build complex, interactive UIs with j-templates!
