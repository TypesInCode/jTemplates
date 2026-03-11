# j-templates Tutorials

Welcome to the j-templates tutorial series. These tutorials will guide you from zero to building production-ready applications using the j-templates framework.

## How to Use This Guide

1. **Follow tutorials in order** - Each tutorial builds on previous concepts
2. **Code along** - Type the examples yourself; don't just read
3. **Complete exercises** - Each tutorial includes challenges to reinforce learning
4. **Reference patterns docs** - For API details, see the [Patterns documentation](../patterns/)

## Tutorial Series

| # | Tutorial | Duration | What You'll Build | Status |
|---|----------|----------|-------------------|--------|
| 1 | [Getting Started](./01-getting-started.md) | 30 min | Static HTML page with j-templates | ✅ Complete |
| 2 | [Your First Component](./02-your-first-component.md) | 45 min | Greeting component | ✅ Complete |
| 3 | [Reactive State Basics](./03-reactive-state-basics.md) | 60 min | Counter and profile components | ✅ Complete |
| 4 | [Template System Deep Dive](./04-template-system-deep-dive.md) | 60 min | Todo list application | ✅ Complete |
| 5 | [Decorators Deep Dive](./05-decorators-deep-dive.md) | 75 min | Shopping cart with computed values | ⏳ Next |
| 6 | [Component Composition](./06-component-composition.md) | 75 min | Generic list and table components | 📋 Planned |
| 7 | [Dependency Injection](./07-dependency-injection.md) | 60 min | Service-architected component | 📋 Planned |
| 8 | [Building a Complete App](./08-advanced-patterns.md) | 90 min | Real-Time Dashboard | 📋 Planned |

## Prerequisites

- **TypeScript knowledge** - You should understand classes, interfaces, and type annotations
- **Modern JavaScript** - ES6+ features (arrow functions, destructuring, etc.)
- **HTML/CSS basics** - For styling components
- **Node.js 16+** - For running Vite dev server

## Setup

All tutorials use **Vite** as the build tool and dev server. This is the same tool used in the official [Real-Time Dashboard example](../../examples/real_time_dashboard/).

**Important Vite Configuration:** When setting up your project, you may need to exclude jsdom from bundling in `vite.config.js`:

```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["jsdom"],
    },
  },
});
```

**Why this is needed:** j-templates has `jsdom` as a devDependency for testing. If you're running the tutorial examples from within the j-templates repository, Node.js module resolution may find jsdom in the root `node_modules` folder. The `external` configuration tells Vite to skip bundling it.

**In a standalone project** (outside the j-templates repo), you typically won't need this configuration because jsdom won't exist in your dependency tree.

### Standard Project Structure

```
my-app/
├── src/
│   ├── components/    # Component classes
│   ├── services/      # Business logic
│   ├── data/          # Data models
│   └── app.ts         # Main entry point
├── index.html         # HTML entry point (at root)
├── package.json
├── tsconfig.json
└── vite.config.js
```

## Getting Help

- **Patterns documentation** - API reference and deep dives
- **Example projects** - See `examples/real_time_dashboard/`
- **Source code** - Framework code is well-commented in `src/`

## Tutorial Conventions

Throughout these tutorials, you'll see:

- **Code blocks** with TypeScript examples
- **Notes** with important information
- **Exercises** to practice what you've learned
- **References** to patterns documentation for deeper reading

---

## Ready to Start?

Begin with [Tutorial 1: Getting Started](./01-getting-started.md) to set up your environment and render your first component.