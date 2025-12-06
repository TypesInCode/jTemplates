---
layout: post
title: "Getting Started with jTemplates"
date: 2025-12-05 00:00:00 -0400
categories: getting-started tutorial
---

## Navigation
- Prev: [TODO Sample](/2024-10-30-TODO Sample.markdown)
- Next: [Reactive Updates](/2025-12-05-reactive-updates.md)

## Introduction
Welcome to jTemplates, a lightweight library that combines a **virtual‑DOM‑free** rendering engine with a **reactive state system**. This guide walks a new developer through installation, core concepts, and a complete Hello World example.

## What is jTemplates?
jTemplates lets you describe UI declaratively. It renders directly to the real DOM (no virtual‑DOM diff) and automatically updates when reactive data changes.

- **No virtual DOM** – `NodeConfig.reconcileChildren` patches the real DOM in place.
- **Reactive State** – `ObservableScope` tracks dependencies and triggers updates.
- **Component Architecture** – encapsulate state, logic, and markup.
- **TypeScript First** – full type safety and IntelliSense.

## Installation
```bash
npm install j-templates
```

## Core Concepts

### Virtual Nodes (vNodes)
vNodes are plain objects that describe DOM elements. Helper functions (`div`, `button`, …) create them.
```typescript
import { div, button, h1, span } from 'j-templates/DOM';

// Children can be passed in several formats:
// 1. Array of vNodes
const container = div({ props: { className: 'container' } }, [
  h1({}, 'Hello World'),
  button({
    props: { type: 'button' },
    on: { click: () => console.log('clicked') }
  }, 'Click me'),
  span({}, 'Welcome to jTemplates!')
]);

// 2. String (automatically converted to text node)
const textNode = div({}, 'Simple text content');

// 3. Function that returns vNodes or strings (for dynamic content)
const dynamicContainer = div({ 
  data: () => ({ title: 'Dynamic Title', content: 'Dynamic Content' }),
  props: { className: 'dynamic' } 
}, function(data) {
  return [
    h1({}, data.title),
    span({}, data.content)
  ];
});
```

### Components
Components extend `Component` and provide a `Template` method that returns a vNode tree. Data passed to the component is
access through `this.Data`.
```typescript
import { Component, div, h1, p } from 'j-templates';

interface CounterData { count: number; message: string; }
interface CounterEvents { increment: void; decrement: void; }

class Counter extends Component<CounterData, void, CounterEvents> {
  public Template(): vNode {
    return div({ props: { className: 'app' } }, [
      h1({}, [this.Data.message]),
      p({}, [`Count: ${this.Data.count}`]),
      button({ props: { type: 'button' }, on: { click: () => this.Fire('increment') } }, 'Increment'),
      button({ props: { type: 'button' }, on: { click: () => this.Fire('decrement') } }, 'Decrement')
    ]);
  }
}

const CounterFn = Component.ToFunction('counter-component', Counter);
```

## Hello World Example
A complete, runnable example that shows state creation, mutation, and rendering.
```typescript
import { Component, div, h1, button } from 'j-templates';
import { ObservableScope } from 'j-templates/Store';

interface CounterData { count: number; }
interface CounterEvents { increment: void; decrement: void; }

class CounterComp extends Component<CounterData, void, CounterEvents> {
  public Template(): vNode {
    return div({ props: { className: 'counter' } }, [
      h1({}, `Count: ${this.Data.count}`),
      button({ props: { type: 'button' }, on: { click: () => this.Fire('increment') } }, 'Increment'),
      button({ props: { type: 'button' }, on: { click: () => this.Fire('decrement') } }, 'Decrement')
    ]);
  }
}

const Counter = Component.ToFunction<void, CounterData, CounterEvents>('counter-component', CounterComp);

// Reactive state – a plain object wrapped in an ObservableScope
const state = { count: 0 };
const stateScope = ObservableScope.Create<{ count: number }>(() => state);

const app = div({ props: { className: 'app' } }, [
  h1({}, 'jTemplates Hello World'),
  Counter({
    data: () => ObservableScope.Value(stateScope),
    on: {
      increment: () => { state.count++; ObservableScope.Update(stateScope); },
      decrement: () => { state.count--; ObservableScope.Update(stateScope); }
    }
  })
]);

const container = document.getElementById('app');
Component.Attach(container, app);
```

## Project Setup
A minimal TypeScript + Vite workflow.
```bash
npm init -y
npm install typescript ts-node @types/node j-templates
npm install -D vite @vitejs/plugin-legacy
```
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```
HTML skeleton (`index.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>jTemplates Hello World</title>
  <style>
    .app { font-family: Arial, sans-serif; padding: 20px; }
    .counter { margin-top: 20px; }
    button { margin: 5px; padding: 10px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="src/main.ts"></script>
</body>
</html>
```
`vite.config.js` (optional legacy support):
```javascript
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [legacy({ targets: ['defaults', 'not IE 11'] })]
});
```
Run:
```bash
npx vite        # dev server
npx vite build  # production build
npx vite preview
```

## Key Benefits
1. **Declarative UI** – describe *what* you want, not *how* to manipulate the DOM.
2. **Automatic Reactive Updates** – `ObservableScope` tracks dependencies, no manual diffing.
3. **No Virtual DOM Overhead** – `NodeConfig.reconcileChildren` patches the real DOM directly.
4. **Type‑Safe API** – full TypeScript support.
5. **Component‑First Architecture** – reusable, isolated pieces of UI.
6. **Built‑in Event System** – simple parent‑child communication.

## Understanding the Reactive System
jTemplates’ reactivity revolves around `ObservableScope`.
1. **Create a scope** – `ObservableScope.Create(() => data)` wraps your state.
2. **Read a value** – `ObservableScope.Value(scope)` registers the read as a dependency.
3. **Mutate state** – change the underlying object and call `ObservableScope.Update(scope)`.
4. **Automatic UI refresh** – any component that accessed the scope will be scheduled for DOM patching.

### Best Practices
- Keep state objects simple and focused on UI concerns.
- Always call `ObservableScope.Update(scope)` after a mutation.
- Prefer immutable updates for complex structures to avoid accidental shared‑state bugs.
- Separate business logic from reactive concerns; use plain functions or services for the former.

## Common Patterns
### Simple Counter (shown above)
Direct mutable update + `ObservableScope.Update`.

### Immutable Updates
```typescript
state = { ...state, count: state.count + 1 };
ObservableScope.Update(stateScope);
```

### Multiple Scopes
```typescript
const userScope = ObservableScope.Create(() => ({ name: 'Alice' }));
const themeScope = ObservableScope.Create(() => ({ dark: true }));

data: () => ({
  user: ObservableScope.Value(userScope),
  theme: ObservableScope.Value(themeScope)
})
```

## Next Steps
Explore deeper topics:


### Troubleshooting
**UI not updating?**
- Verify you called `ObservableScope.Update(scope)` after mutating data.
- Ensure the component’s `data` function returns `ObservableScope.Value(scope)`.

**TypeScript errors?**
- Check component generic parameters match your data and event interfaces.
- Confirm the shape returned by `data` matches the component’s `Data` type.

For more examples, visit the [GitHub repo](https://github.com/TypesInCode/jTemplates).
