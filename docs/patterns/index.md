# j-templates Patterns

## Documentation

| Pattern | Description |
|---|---|
| [Components](./01-components.md) | Component class, lifecycle, data passing, template functions, events, composition |
| [Reactivity](./02-reactivity.md) | ObservableScope, ObservableNode, stores, decorators (@Value, @State, @Scope, @Computed, @Watch), calc, peek |
| [Templates & Data](./03-templates-and-data.md) | DOM element functions, reactive bindings, data modeling, stores, animation |
| [Dependency Injection](./04-dependency-injection.md) | Injector hierarchy, @Inject, @Destroy, IDestroyable, provider/consumer pattern |

## Further Reading

- [Syntax & Best Practices](../SYNTAX_BEST_PRACTICES.md) — Complete API reference and cheat sheet
- [Tutorials](../tutorials/index.md) — Step-by-step guides from getting started to full applications

## Example Application

The [Real-Time Dashboard](../../examples/real_time_dashboard/) demonstrates all patterns:

```bash
cd examples/real_time_dashboard
npm install
npm run dev
```

Key files:
- `src/app.ts` — Main component with DI, computed state
- `src/components/number-card.ts` — Animation, @Value, @Watch
- `src/components/data-table.ts` — Generic components
- `src/services/dataService.ts` — StoreSync, reactive state