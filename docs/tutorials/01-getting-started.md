# Tutorial 1: Getting Started

## What You'll Build

By the end of this tutorial, you'll have a working TypeScript project that renders a simple message using j-templates. You'll understand the framework's core philosophy and have your development environment ready.

**Final Result:** A browser page displaying "Tutorial 1: Getting Started" with styled content

## Prerequisites

- **TypeScript knowledge** - You should understand classes, interfaces, and type annotations
- **Node.js 16+** - For running Vite dev server
- **A code editor** - VS Code recommended

## Learning Objectives

- Understand what j-templates is and when to use it
- Set up a TypeScript project with j-templates
- Create virtual nodes with DOM functions
- Render to the DOM with `Component.Attach()`
- Understand the component lifecycle at a high level

---

## Step 1: What is j-templates?

j-templates is a **lightweight, TypeScript-first UI framework** that focuses on:

- **TypeScript classes** - Components are plain TypeScript classes
- **Reactive state** - Automatic UI updates when data changes
- **Composition over inheritance** - Build complex UIs from simple components
- **Minimal boilerplate** - No decorators required for basic usage
- **Zero runtime dependencies** - No React, Vue, or Angular needed

### When to Use j-templates

**Good for:**
- Small to medium applications
- Teams comfortable with TypeScript
- Learning reactive UI patterns
- Projects wanting minimal abstraction

**Not ideal for:**
- Massive enterprise apps requiring extensive ecosystems
- Projects needing pre-built component libraries
- Teams preferring JSX/TSX syntax

---

## Step 2: Set Up Your Project

### Initialize the Project

```bash
# Create project folder
mkdir tutorial-1
cd tutorial-1

# Initialize npm project
npm init -y

# Install j-templates (version 7.0.75+)
npm install j-templates@^7.0.75

# Install TypeScript
npm install --save-dev typescript

# Install Vite (build tool and dev server)
npm install --save-dev vite
```

### Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### Create Folder Structure

```
tutorial-1/
├── src/
│   └── app.ts          # Your TypeScript code
├── index.html          # HTML entry point (at root)
├── package.json
├── tsconfig.json
└── vite.config.js      # Vite configuration
```

Create the folder:

```bash
mkdir src
```

### Configure Vite

Create `vite.config.js`:

```javascript
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      // Exclude jsdom from bundling
      // j-templates has jsdom as a devDependency for testing
      external: ["jsdom"],
    },
  },
});
```

**Why this is needed:** j-templates has `jsdom` as a devDependency for testing. If you're running the tutorial examples from within the j-templates repository, Node.js module resolution may find jsdom in the root `node_modules` folder. The `external` configuration tells Vite to skip bundling it.

**In a standalone project** (outside the j-templates repo), you typically won't need this configuration because jsdom won't exist in your dependency tree.

---

## Step 3: Create Your First Virtual Node

### Understanding Virtual Nodes

j-templates uses **virtual nodes (vNodes)** - lightweight JavaScript objects that represent DOM elements. Instead of writing HTML, you write JavaScript that creates these nodes.

### The DOM Element Functions

j-templates provides functions for every HTML element, imported from `j-templates/DOM`:

```typescript
import { div, h1, span } from "j-templates/DOM";
```

These functions create vNodes:

```typescript
div({}, () => "Hello")     // Creates a <div>Hello</div>
h1({}, () => "Title")      // Creates a <h1>Title</h1>
span({}, () => "Text")     // Creates a <span>Text</span>
```

### Creating Nested Elements

You can nest vNodes by passing an array as the children:

```typescript
const content = div({}, () => [
  h1({}, () => "Tutorial 1"),
  div({}, () => "Hello, j-templates!")
]);
```

**Important:** The array becomes the *children* of the parent div. `Component.Attach()` itself takes a **single vNode**, not an array of vNodes.

---

## Step 4: Write Your Code

Create `src/app.ts`:

```typescript
import { Component } from "j-templates";
import { div, h1, span } from "j-templates/DOM";

// Create nested vNodes
const content = div({}, () => [
  h1({}, () => "Tutorial 1: Getting Started"),
  div({ props: { className: "container" } }, () => [
    span({}, () => "Hello, "),
    span({ props: { style: "color: blue;" } }, () => "j-templates!"),
    span({}, () => " This is your first virtual node.")
  ])
]);

// Get the root element and attach the vNode
const app = document.getElementById("app")!;
Component.Attach(app, content);
```

**What's happening:**

1. **Import** - We bring in `Component` and DOM functions from j-templates
2. **Create vNode** - `div({}, () => [...])` creates a virtual div with children
3. **Attach** - `Component.Attach()` renders the vNode into the real DOM

---

## Step 5: Create the HTML Entry Point

Create `index.html` at the project root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tutorial 1: Getting Started</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
    }
    .container {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>Tutorial 1: Getting Started</h1>
  
  <div id="app"></div>
  
  <script type="module" src="/src/app.ts"></script>
</body>
</html>
```

---

## Step 6: Run the Development Server

```bash
# Start Vite dev server
npm run dev
```

Vite will start a development server (usually at `http://localhost:5173`). Open that URL in your browser.

Open `http://localhost:8080` in your browser. You should see:

```
Tutorial 1: Getting Started

Hello, j-templates! This is your first virtual node.
```

### Inspect the DOM

Right-click and select "Inspect" to see what was created:

```html
<div id="app">
  <div>
    <h1>Tutorial 1: Getting Started</h1>
    <div class="container">
      <span>Hello, </span>
      <span style="color: blue;">j-templates!</span>
      <span> This is your first virtual node.</span>
    </div>
  </div>
</div>
```

j-templates created real DOM elements from our virtual nodes!

---

## Step 7: Experiment

Before moving on, try these exercises:

### Exercise 1: Change the Text

Modify the message in `src/app.ts`:

```typescript
h1({}, () => "My First j-templates App")
```

### Exercise 2: Add More Elements

Create a paragraph element:

```typescript
import { p } from "j-templates/DOM";

const content = div({}, () => [
  h1({}, () => "Tutorial 1"),
  p({}, () => "This is a paragraph."),
  div({}, () => "More content")
]);
```

### Exercise 3: Add More Styling

Use the `props` parameter for inline styles:

```typescript
div({
  props: {
    style: "background: #f0f0f0; padding: 10px; border-radius: 4px;"
  }
}, () => "Styled content")
```

### Exercise 4: Nest Deeper

Create a more complex structure:

```typescript
const content = div({}, () => [
  h1({}, () => "Header"),
  div({ props: { className: "section" } }, () => [
    h1({}, () => "Section Title"),
    div({}, () => [
      span({}, () => "Item 1"),
      span({}, () => "Item 2"),
      span({}, () => "Item 3")
    ])
  ])
]);
```

---

## Common Issues

### "Cannot find module 'j-templates'"

**Solution:** Make sure j-templates is installed:

```bash
npm install j-templates
```

### TypeScript errors in editor

**Solution:** Make sure your editor has TypeScript extension installed and `tsconfig.json` is properly configured.

### Nothing appears on the page

**Check:**
1. Browser console for errors (F12 → Console)
2. The `#app` element exists in your HTML
3. Vite dev server is running: `npm run dev`
4. The script tag in HTML points to `/src/app.ts`

---

## What You Learned

- **j-templates** is a TypeScript-first UI framework
- **Virtual nodes** are JavaScript objects representing DOM elements
- **DOM functions** like `div()` create virtual nodes
- **Component.Attach()** renders a single vNode to the real DOM
- **Arrays as children** - You can pass arrays to DOM functions for nested elements

---

## Next Steps

In [Tutorial 2: Your First Component](./02-your-first-component.md), you'll:

- Create a proper component class
- Understand the `Template()` method
- Learn about component lifecycle
- Build a reusable greeting component

---

## Further Reading

- [Component Architecture Pattern](../patterns/01-component-architecture.md) - Deep dive into components
- [Template System Pattern](../patterns/07-template-system.md) - All about DOM functions
- [j-templates README](../../README.md) - Official documentation