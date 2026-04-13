# Tutorial 3: Reactive State Basics

## What You'll Build

By the end of this tutorial, you'll have created reactive components that automatically update their UI when state changes. You'll understand the difference between `@Value` and `@State` decorators and when to use each.

**Final Result:** A counter component with reactive state and a user profile form that updates in real-time

## Prerequisites

- **Completed Tutorial 2** - You should understand component classes and Template()
- **TypeScript knowledge** - Classes, interfaces, decorators
- **Tutorial 2 project** - Or a fresh project setup

## Learning Objectives

- Understand why reactivity matters in UI frameworks
- Use `@Value` decorator for primitive state (numbers, strings, booleans)
- Use `@State` decorator for complex state (objects, arrays)
- Understand how reactive state triggers automatic re-renders
- Know when to use `@Value` vs `@State`

---

## Step 1: The Problem with Manual Updates

### Why Reactivity Matters

In Tutorial 2, you learned about components and the `Template()` method. But there was a problem - components couldn't automatically update when data changed.

Let's see what that looked like:

```typescript
class Counter extends Component {
  private count = 0;  // ❌ Not reactive!

  Template() {
    return div({}, () => [
      button({
        on: {
          click: () => {
            this.count++;  // Updates the variable
            // But the UI doesn't update!
          }
        }
      }, () => "Increment"),
      span({}, () => `Count: ${this.count}`)
    ]);
  }
}
```

**The problem:** When you click the button, `this.count` increases, but the displayed count stays the same. The UI doesn't know the data changed.

### The Manual Fix (That Doesn't Scale)

To make it work without reactivity, you'd need to manually update the DOM:

```typescript
class Counter extends Component {
  private count = 0;
  private countSpan!: HTMLElement;  // Store reference

  Bound() {
    // Find the span element after rendering
    const span = document.querySelector('.count-display');
    if (span) this.countSpan = span as HTMLElement;
  }

  Template() {
    return div({}, () => [
      button({
        on: {
          click: () => {
            this.count++;
            if (this.countSpan) {
              this.countSpan.textContent = `Count: ${this.count}`;  // Manual update
            }
          }
        }
      }, () => "Increment"),
      span({ props: { className: "count-display" } }, () => `Count: ${this.count}`)
    ]);
  }
}
```

**Why this doesn't scale:**
- You need to track DOM element references
- Manual updates are error-prone
- Hard to maintain with complex UIs
- Doesn't work well with nested components
- You're essentially rebuilding React's reactivity system

### The Reactive Solution

With reactive state, you just change the data, and the UI updates automatically:

```typescript
class Counter extends Component {
  @Value()
  count = 0;  // ✅ Reactive!

  Template() {
    return div({}, () => [
      button({
        on: {
          click: () => {
            this.count++;  // UI updates automatically!
          }
        }
      }, () => "Increment"),
      span({}, () => `Count: ${this.count}`)
    ]);
  }
}
```

That's the power of reactivity - **declarative** instead of **imperative**.

---

## Step 2: The @Value Decorator

### Purpose

The `@Value` decorator is for **simple primitive values**:
- `number` (count, age, price)
- `string` (name, title, message)
- `boolean` (isLoading, isActive, isVisible)
- `null` or `undefined`

### Syntax

```typescript
@Value()
count: number = 0;

@Value()
name: string = "John";

@Value()
isLoading: boolean = false;
```

### How It Works

Under the hood, `@Value` creates a lightweight `ObservableScope` to store your value. When the value changes:

1. The scope is marked as "dirty"
2. Any dependent computations (like your Template()) are notified
3. The UI automatically re-renders

### When to Use @Value

Use `@Value` when:
- ✅ You have primitive values (number, string, boolean)
- ✅ You only need top-level change detection
- ✅ Performance is important (less overhead than @State)
- ✅ The value doesn't have nested properties

### Complete Counter Example

```typescript
import { Component } from "j-templates";
import { div, button, span } from "j-templates/DOM";

class Counter extends Component {
  @Value()
  count: number = 0;

  Template() {
    return div({ props: { className: "counter" } }, () => [
      h2({}, () => `Counter: ${this.count}`),
      
      div({ props: { className: "buttons" } }, () => [
        button({
          on: { click: () => this.count-- }
        }, () => "Decrement"),
        
        button({
          on: { click: () => this.count++ }
        }, () => "Increment"),
        
        button({
          on: { click: () => this.count = 0 }
        }, () => "Reset")
      ])
    ]);
  }
}

const counter = Component.ToFunction("counter", Counter);
```

### Key Points

1. **Lazy initialization** - The scope is created on first access, not construction
2. **Top-level only** - Only changes to the top-level value trigger updates
3. **Lightweight** - Minimal overhead compared to @State
4. **Type-safe** - TypeScript enforces the type you declare

---

## Step 3: The @State Decorator

### Purpose

The `@State` decorator is for **complex data structures**:
- Objects with nested properties (`{ user: { name: string, email: string } }`)
- Arrays (`string[]`, `TodoItem[]`)
- Any structure needing deep reactivity

### Syntax

```typescript
@State()
user: { name: string; email: string } = { name: "", email: "" };

@State()
items: string[] = [];

@State()
config: { theme: string; language: string } = { 
  theme: "dark", 
  language: "en" 
};
```

### How It Works

`@State` wraps your value in an `ObservableNode` proxy. This provides:

1. **Deep reactivity** - Changes to nested properties are tracked
2. **Array mutation tracking** - Push, pop, splice, etc. are all tracked
3. **Automatic proxy creation** - Nested objects/arrays become proxies automatically

### When to Use @State

Use `@State` when:
- ✅ You have nested objects
- ✅ You need to track array mutations
- ✅ You need deep change detection
- ✅ The value has multiple levels of properties

### Complete UserProfile Example

```typescript
import { Component } from "j-templates";
import { div, h2, input, label, span } from "j-templates/DOM";

class UserProfile extends Component {
  @State()
  user: { name: string; email: string } = { 
    name: "", 
    email: "" 
  };

  Template() {
    return div({ props: { className: "profile" } }, () => [
      h2({}, () => "User Profile"),
      
      div({ props: { className: "form-group" } }, () => [
        label({}, () => "Name:"),
        input({
          props: { 
            value: this.user.name,
            placeholder: "Enter your name"
          },
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.user.name = target.value;  // ✅ Deep reactivity!
            }
          }
        })
      ]),
      
      div({ props: { className: "form-group" } }, () => [
        label({}, () => "Email:"),
        input({
          props: { 
            value: this.user.email,
            placeholder: "Enter your email"
          },
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.user.email = target.value;  // ✅ Deep reactivity!
            }
          }
        })
      ]),
      
      div({ props: { className: "preview" } }, () => [
        h3({}, () => "Preview:"),
        span({}, () => `Name: ${this.user.name}`),
        span({}, () => `Email: ${this.user.email}`)
      ])
    ]);
  }
}

const userProfile = Component.ToFunction("user-profile", UserProfile);
```

### Deep Reactivity in Action

```typescript
@State()
user = { name: "John", address: { city: "NYC", zip: "10001" } };

// Changing nested property triggers update
this.user.address.city = "LA";  // ✅ UI updates!

// Array mutations work too
@State()
items: string[] = [];

this.items.push("new item");  // ✅ UI updates!
this.items.splice(0, 1);      // ✅ UI updates!
```

---

## Step 4: @Value vs @State Decision Guide

### Quick Reference Table

| Your Value Type | Use | Why |
|-----------------|-----|-----|
| `number`, `string`, `boolean` | `@Value` | Lightweight, no proxy overhead |
| `null`, `undefined` | `@Value` | Simple scope storage |
| `{ nested: objects }` | `@State` | Deep reactivity needed |
| `arrays (User[], Todo[])` | `@State` | Array mutations tracked |
| Simple getters only | `@Scope` | Cached, minimal overhead |
| Complex getters only | `@Computed` | Cached + object reuse |

### Decision Tree

```
Is it a primitive (number, string, boolean)?
├─ Yes → Use @Value
└─ No
    └─ Is it an object or array?
        ├─ Yes → Use @State
        └─ No (it's a getter)
            ├─ Simple/cheap computation? → Use @Scope
            └─ Complex/expensive computation? → Use @Computed
```

### Performance Considerations

**@Value Overhead:**
- Creates one `ObservableScope`
- Stores value directly
- Minimal memory footprint
- Fast read/write

**@State Overhead:**
- Creates `ObservableNode` proxy
- Creates nested scopes for deep reactivity
- Higher memory footprint
- Slightly slower due to proxy layer

**Rule of thumb:** Use `@Value` for primitives unless you specifically need deep reactivity.

### Common Mistakes to Avoid

#### ❌ Mistake 1: Using @State for primitives

```typescript
// ❌ Overkill - creates unnecessary proxy
@State()
count: number = 0;

// ✅ Better - lightweight scope
@Value()
count: number = 0;
```

#### ❌ Mistake 2: Using @Value for objects

```typescript
// ❌ Won't track nested changes
@Value()
user: { name: string; email: string } = { name: "", email: "" };

this.user.name = "John";  // ❌ UI won't update!

// ✅ Better - deep reactivity
@State()
user: { name: string; email: string } = { name: "", email: "" };

this.user.name = "John";  // ✅ UI updates!
```

#### ❌ Mistake 3: Replacing entire objects with @State

```typescript
@State()
user = { name: "John" };

// ❌ This replaces the entire object, losing reactivity
this.user = { name: "Jane" };

// ✅ Better - modify properties
this.user.name = "Jane";

// ✅ Or use @Value for simple replacement
@Value()
user: { name: string } = { name: "John" };
this.user = { name: "Jane" };  // ✅ Works with @Value
```

---

## Complete Example Project

The complete example for this tutorial is in `examples/tutorial_project/tutorial-3/`.

### File Structure

```
tutorial-3/
├── src/
│   ├── app.ts           # Main application with both components
│   ├── counter.ts       # Counter component with @Value
│   └── user-profile.ts  # UserProfile component with @State
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.js       # Vite configuration
```

### Run the Example

```bash
cd examples/tutorial_project/tutorial-3
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Try It Yourself

### Exercise 1: Create a Toggle Component

Create a component with a boolean `@Value` that toggles visibility:

```typescript
interface ToggleConfig {
  label: string;
}

class Toggle extends Component<ToggleConfig> {
  @Value()
  isVisible: boolean = true;

  Template() {
    return div({}, () => [
      button({
        on: { click: () => this.isVisible = !this.isVisible }
      }, () => this.isVisible ? "Hide" : "Show"),
      
      this.isVisible 
        ? div({ props: { className: "content" } }, () => this.Data.label)
        : null
    ]);
  }
}

const toggle = Component.ToFunction("toggle", Toggle);
```

### Exercise 2: Build a Multi-Field Form

Create a form with multiple `@State` fields:

```typescript
class ContactForm extends Component {
  @State()
  contact: { 
    firstName: string;
    lastName: string;
    phone: string;
    message: string;
  } = {
    firstName: "",
    lastName: "",
    phone: "",
    message: ""
  };

  Template() {
    return div({ props: { className: "form" } }, () => [
      // Add input fields for each property
      // Preview section showing all values
    ]);
  }
}
```

### Exercise 3: Create an Item List

Build a list with add/remove functionality using `@State` array:

```typescript
class ItemList extends Component {
  @State()
  items: string[] = [];

  @Value()
  newItem: string = "";

  Template() {
    return div({}, () => [
      input({
        props: { value: this.newItem },
        on: { 
          input: (e: Event) => {
            const target = e.target as HTMLInputElement;
            this.newItem = target.value;
          }
        }
      }),
      
      button({
        on: { click: () => {
          if (this.newItem.trim()) {
            this.items.push(this.newItem);
            this.newItem = "";
          }
        }}
      }, () => "Add"),
      
      ul({}, () => 
        this.items.map((item, index) => 
          li({}, () => [
            span({}, () => item),
            button({
              on: { click: () => this.items.splice(index, 1) }
            }, () => "×")
          ])
        )
      )
    ]);
  }
}
```

---

## Troubleshooting

### UI Doesn't Update When Changing State

**Possible causes:**

1. **Using @Value for nested objects**
   ```typescript
   // ❌ Won't work for nested changes
   @Value()
   user = { name: "John" };
   this.user.name = "Jane";  // UI won't update
   
   // ✅ Use @State for nested objects
   @State()
   user = { name: "John" };
   ```

2. **Not using arrow functions in Template()**
   ```typescript
   // ❌ Wrong - not reactive
   Template() {
     return span({}, `${this.count}`);
   }
   
   // ✅ Correct - reactive binding
   Template() {
     return span({}, () => `${this.count}`);
   }
   ```

3. **Replacing entire object with @State**
   ```typescript
   // ❌ Loses reactivity
   @State()
   user = { name: "John" };
   this.user = { name: "Jane" };
   
   // ✅ Modify properties
   this.user.name = "Jane";
   ```

### TypeScript Errors with Decorators

**Error:** `Property decorator does not match any signature`

**Solution:** Enable experimental decorators in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

### Performance Issues with Large Objects

**Problem:** Using `@State` for large objects causes slow updates

**Solution:**
1. Split into multiple `@Value` primitives if possible
2. Use `@Computed` for derived values
3. Consider pagination/virtualization for large arrays
4. Only store what you need in state

---

## What You Learned

- **Reactivity solves manual DOM updates** - Change data, UI updates automatically
- **@Value for primitives** - Lightweight, for numbers, strings, booleans
- **@State for complex data** - Deep reactivity for objects and arrays
- **Decision guide** - Use the table/tree to choose the right decorator
- **Common pitfalls** - Don't use @Value for nested objects, don't replace @State objects

---

## Next Steps

In [Tutorial 4: Template System Deep Dive](./04-template-deep-dive.md), you'll:

- Master DOM element functions (div, span, input, button, etc.)
- Create reactive bindings with arrow functions
- Implement conditional rendering
- Render lists of items
- Handle user events

---

## Further Reading

- [Reactivity](../patterns/02-reactivity.md) - Deep dive into all decorators and reactive state
- [Source: decorators.ts](../../src/Utils/decorators.ts) - Implementation details