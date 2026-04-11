# j-templates Patterns

## Documentation Structure

| Type | Description |
|------|-------------|
| **[Recipes](./RECIPES.md)** | Short, focused code examples for common tasks (start here) |
| **[Quick Reference](./QUICK_REFERENCE.md)** | One-page API summaries |
| **[Detailed Docs](#detailed-documentation)** | Full documentation (for deep dives) |

## Quick Start

1. **[Recipes](./RECIPES.md)** - Copy-paste examples for common patterns
2. **[Quick Reference](./QUICK_REFERENCE.md)** - Keep handy for API lookup
3. **[Example App](../../examples/real_time_dashboard/)** - See patterns in action

---

## Detailed Documentation

For comprehensive documentation with full API references and explanations:

### Core Patterns
- [Component Architecture](./01-component-architecture.md) - Components, lifecycle, events
- [Reactive State Management](./02-reactive-state-management.md) - ObservableScope, StoreSync
- [Decorators](./03-decorators.md) - @Value, @State, @Computed, @Watch, @Inject, @Destroy
- [Dependency Injection](./04-dependency-injection.md) - Injector, service contracts
- [Component Composition](./05-component-composition.md) - Generic components, templates
- [Animation System](./06-animation-system.md) - Smooth transitions
- [Template System](./07-template-system.md) - DOM rendering, reactive bindings
- [Data Modeling](./08-data-modeling.md) - TypeScript interfaces, DTOs

## Example Application

The [Real-Time Dashboard](../../examples/real_time_dashboard/) demonstrates all patterns:

```bash
cd examples/real_time_dashboard
npm install
npm run dev
```

**Key Files:**
- `src/app.ts` - Main component with DI, computed state
- `src/components/number-card.ts` - Animation, @Value, @Watch
- `src/components/data-table.ts` - Generic components
- `src/services/dataService.ts` - StoreSync, reactive state

---

## Contributing

To add recipes:
1. Keep it focused - one task per recipe
2. Show minimal code - copy-pasteable examples
3. Link to source - reference framework files
4. Cross-link - connect related recipes

See [RECIPES.md](./RECIPES.md) for format.
