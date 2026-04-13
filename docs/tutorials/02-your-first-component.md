# Tutorial 2: Your First Component

## What You'll Build

By the end of this tutorial, you'll have created your first reusable component class in j-templates. You'll understand how components work, how to pass data to them, and how to make them reusable throughout your application.

**Final Result:** A page displaying multiple greeting cards, each created from the same reusable component

## Prerequisites

- **Completed Tutorial 1** - You should understand vNodes and Component.Attach()
- **TypeScript knowledge** - Classes, interfaces, and type annotations
- **Tutorial 1 project** - Or a fresh project setup

## Learning Objectives

- Understand component class structure
- Implement the Template() method
- Use Component.ToFunction() for reusability
- Understand the component lifecycle (Bound method)
- Pass data to components
- Create a reusable greeting component

---

## Step 1: Component Class Structure

### What is a Component?

A component in j-templates is a TypeScript class that extends the `Component` base class. Components are:

- **Reusable** - Use the same component multiple times with different data
- **Encapsulated** - Each instance has its own state and lifecycle
- **Composable** - Build complex UIs by combining simple components
- **Type-safe** - TypeScript ensures you pass the right data

### Basic Component Structure

```typescript
import { Component } from "j-templates";
import { div } from "j-templates/DOM";

class MyComponent extends Component {
  Template() {
    return div({}, () => "Hello!");
  }
}
```

### Component Type Parameters

The `Component` class accepts type parameters for type safety:

```typescript
// Component<Data, Templates, Events>
class MyComponent extends Component<{ name: string }> {
  Template() {
    return div({}, () => `Hello, ${this.Data.name}`);
  }
}
```

- **Data** - The data props the component expects (first parameter)
- **Templates** - Template functions passed to the component (second parameter)
- **Events** - Events the component can fire (third parameter)

---

## Step 2: The Template() Method

### What is Template()?

The `Template()` method is the main rendering method of a component. It returns a vNode (or array of vNodes) that represents the component's UI.

```typescript
class GreetingComponent extends Component<{ name: string }> {
  Template() {
    return div({ props: { className: "greeting" } }, () => [
      h1({}, () => `Hello, ${this.Data.name}!`)
    ]);
  }
}
```

### When is Template() Called?

1. **When the component is first attached** - Initial render
2. **When reactive state changes** - Automatic re-render (covered in Tutorial 3)

### Template() Best Practices

- **Return a vNode or vNode[]** - Can return a single vNode or an array
- **Use this.Data** - Access component data
- **Keep it simple** - Complex logic should be in methods or computed properties

---

## Step 3: Component.ToFunction() Pattern

### Why Convert to a Function?

Component classes need to be converted to functions to use them in templates. The `Component.ToFunction()` method creates a factory function that:

1. Instantiates your component class
2. Returns a vNode definition
3. Enables component composition

### How to Use ToFunction()

```typescript
// Define your component class
class GreetingComponent extends Component<{ name: string }> {
  Template() {
    return div({}, () => `Hello, ${this.Data.name}!`);
  }
}

// Convert to function
const greeting = Component.ToFunction("greeting-component", GreetingComponent);

// Use in templates
const content = div({}, () => [
  greeting({ data: () => ({ name: "Alice" }) }),
  greeting({ data: () => ({ name: "Bob" }) })
]);
```

### ToFunction() Parameters

```typescript
Component.ToFunction(type: string, constructor: typeof Component)
```

- **type** - A string identifier for the component (used for debugging)
- **constructor** - Your component class

---

## Step 4: Component Lifecycle - Bound() Method

### Understanding the Lifecycle

Components have a lifecycle with distinct phases:

```
1. Constructor() - Component is instantiated
2. Bound() - Component is attached to DOM (called once)
3. Template() - Returns the vNode to render
4. Destroy() - Component is cleaned up (when removed)
```

### The Bound() Method

`Bound()` is called after the component is attached to the DOM. Use it for:

- **Initializing state** - Set up non-reactive properties
- **Fetching data** - Load initial data from APIs
- **Setting up listeners** - Add event listeners
- **Logging** - Debug component lifecycle

```typescript
class MyComponent extends Component<{ userId: string }> {
  private user: User | null = null;

  Bound() {
    // This runs once when component is attached
    console.log(`Component bound for user ${this.Data.userId}`);
    
    // Fetch initial data
    this.user = this.FetchUserData(this.Data.userId);
  }

  Template() {
    return div({}, () => this.user?.name || "Loading...");
  }
}
```

### When NOT to Use Bound()

- **Reactive state** - Use `@Value` or `@State` decorators (Tutorial 3)
- **Template rendering** - Use `Template()` method
- **Cleanup** - Use `@Destroy` decorator (Tutorial 5)

---

## Step 5: Creating a Reusable Greeting Component

Let's build a complete greeting component that demonstrates all these concepts.

### Step 5.1: Define the Data Interface

```typescript
interface GreetingData {
  name: string;
  title?: string;
  message?: string;
}
```

### Step 5.2: Create the Component Class

```typescript
class GreetingComponent extends Component<GreetingData> {
  
  /**
   * Display name - uses getter to access data directly
   * This pattern prepares for reactive state with @Scope in Tutorial 3
   */
  private get displayName(): string {
    return this.Data.name || "Guest";
  }

  /**
   * Display title - uses getter to access data directly
   */
  private get displayTitle(): string {
    return this.Data.title || "Welcome";
  }

  /**
   * Display message - uses getter to access data directly
   */
  private get displayMessage(): string {
    return this.Data.message || "Hello, j-templates!";
  }

  Bound() {
    console.log(`GreetingComponent bound: Welcome ${this.displayName}`);
  }

  Template() {
    return div({ props: { className: "greeting-card" } }, () => [
      h2({}, () => `${this.displayTitle}, ${this.displayName}!`),
      p({}, () => this.displayMessage)
    ]);
  }
}
```

**Why use getters?**

Using getters instead of assigning properties in `Bound()` has several benefits:

1. **Direct data access** - Always shows current data values
2. **Prepares for reactivity** - Same pattern used with `@Scope` decorator in Tutorial 3
3. **No stale state** - Values update automatically when data changes
4. **Cleaner code** - No need to manually sync data to properties

### Step 5.3: Convert to Function

```typescript
const greeting = Component.ToFunction("greeting-component", GreetingComponent);
```

### Step 5.4: Use in Your App

```typescript
import { Component } from "j-templates";
import { div, h1 } from "j-templates/DOM";
import { greeting } from "./greeting";

class App extends Component {
  Template() {
    return div({}, () => [
      h1({}, () => "My App"),
      
      // First greeting
      greeting({
        data: () => ({
          name: "Alice",
          title: "Welcome",
          message: "This is your first greeting!"
        })
      }),
      
      // Second greeting
      greeting({
        data: () => ({
          name: "Bob",
          message: "Components are reusable!"
        })
      })
    ]);
  }
}

const appComponent = Component.ToFunction("app-component", App);
const app = document.getElementById("app")!;
Component.Attach(app, appComponent({}));
```

---

## Complete Example Project

The complete example for this tutorial is in `examples/tutorial_project/tutorial-2/`.

### File Structure

```
tutorial-2/
├── src/
│   ├── app.ts           # Main application component
│   └── greeting.ts      # GreetingComponent class
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.js       # Vite configuration
```

### Run the Example

```bash
cd examples/tutorial_project/tutorial-2
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Try It Yourself

### Exercise 1: Create an InfoCard Component

Create a new component called `InfoCard` that displays information cards:

```typescript
interface InfoCardData {
  title: string;
  content: string;
  type?: "info" | "warning" | "error";
}

class InfoCard extends Component<InfoCardData> {
  
  private get cardType(): string {
    return this.Data.type || "info";
  }

  Bound() {
    console.log(`InfoCard: ${this.Data.title}`);
  }

  Template() {
    return div({ props: { className: `info-card ${this.cardType}` } }, () => [
      h3({}, () => this.Data.title),
      p({}, () => this.Data.content)
    ]);
  }
}

const infoCard = Component.ToFunction("info-card", InfoCard);
```

### Exercise 2: Add Multiple Cards

Create an app that displays:
- A greeting card
- An info card with type "info"
- An info card with type "warning"
- An info card with type "error"

### Exercise 3: Add Click Logging

Modify the greeting component to log clicks to the console:

```typescript
class GreetingComponent extends Component<GreetingData> {
  private clickCount = 0;

  Bound() {
    console.log(`GreetingComponent bound: Welcome ${this.displayName}`);
  }

  Template() {
    return div({ 
      props: { className: "greeting-card" },
      on: {
        click: () => {
          this.clickCount++;
          console.log(`Clicked ${this.clickCount} times`);
        }
      }
    }, () => [
      h2({}, () => `${this.displayTitle}, ${this.displayName}!`),
      p({}, () => this.displayMessage)
    ]);
  }
}
```

**Note:** The click counter updates the console but not the UI. For reactive counters that auto-update the UI when state changes, you'll learn about `@Value` decorator in Tutorial 3.

---

## Common Issues

### "Property 'Data' does not exist"

**Solution:** Make sure you're accessing `this.Data` inside a class method (like `Bound()` or `Template()`), not in the constructor. The `Data` property is initialized by the parent `Component` constructor.

### Component doesn't render

**Check:**
1. Did you call `Component.ToFunction()` to create a usable function?
2. Are you passing data correctly with `data: () => ({ ... })`?
3. Does the `Template()` method return a valid vNode?
4. Check browser console for errors

### LSP shows errors on import

**Solution:** Run `npm install` first. The TypeScript language server needs the node_modules to be present.

---

## What You Learned

- **Component classes** extend the `Component` base class
- **Template()** method returns the component's vNode
- **Component.ToFunction()** converts classes to reusable functions
- **Bound()** lifecycle method runs once when attached
- **Data props** are passed via the `data` config and accessed via `this.Data`

---

## Next Steps

In [Tutorial 3: Reactive State Basics](./03-reactive-state-basics.md), you'll:

- Learn about `@Value` and `@State` decorators
- Make your components reactive
- Understand automatic UI updates
- Build a counter component

---

## Further Reading

- [Components](../patterns/01-components.md) - Deep dive into components
- [Reactivity](../patterns/02-reactivity.md) - Understanding decorators and reactive state
- [Example: Real-Time Dashboard](../../examples/real_time_dashboard/src/app.ts) - See components in action