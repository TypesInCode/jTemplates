# j-templates Framework Patterns

Welcome to the j-templates Framework Patterns documentation. This guide documents the core patterns used in j-templates applications, based on the Real-Time Dashboard sample application.

## Documentation Structure

The documentation is organized into 8 core patterns that form the foundation of j-templates applications:

### 1. [Component Architecture](./01-component-architecture.md)
The foundation of j-templates applications. Components are TypeScript classes that define UI structure through a `Template()` method. Learn about the base Component class, lifecycle hooks, and component composition.

**Key Topics:**
- Component class structure with generic type parameters
- Template method for UI definition
- Lifecycle hooks (Bound, Destroy)
- Component.ToFunction() for composition

### 2. [Reactive State Management](./02-reactive-state-management.md)
The core mechanism for automatic UI updates. j-templates uses ObservableScope, ObservableNode, and StoreAsync to create a reactive data layer that tracks dependencies and propagates changes.

**Key Topics:**
- ObservableScope for reactive computations
- ObservableNode for nested data tracking
- StoreAsync for asynchronous data storage
- Key-based object sharing

### 3. [Decorators](./03-decorators.md)
Declarative patterns for adding reactive behavior and dependency injection. Decorators provide a clean syntax for common patterns.

**Key Topics:**
- @Computed for derived state
- @Value for reactive primitives
- @Watch for property observation
- @Inject for dependency injection
- @Destroy for cleanup management

### 4. [Dependency Injection](./04-dependency-injection.md)
Scoped, type-safe sharing of services across the component tree. The injector system supports parent-child hierarchies and abstract class tokens.

**Key Topics:**
- Injector class with type-based resolution
- @Inject decorator for declarative injection
- Parent-child injector hierarchy
- IDestroyable for cleanup-aware services

### 5. [Component Composition](./05-component-composition.md)
Building complex UIs by combining simple, reusable components. Supports generic components with type parameters and template functions for custom rendering.

**Key Topics:**
- Generic components with type parameters
- Template functions for custom rendering
- CellTemplate interface for table components
- Component.ToFunction() for reuse

### 6. [Animation System](./06-animation-system.md)
Smooth value transitions using interpolation. Animations integrate with the framework's lifecycle management for automatic cleanup.

**Key Topics:**
- Animation class with configurable timing
- AnimationType enum (Linear, EaseIn)
- IDestroyable pattern for cleanup
- Efficient DOM update batching

### 7. [Template System](./07-template-system.md)
Reactive DOM rendering using virtual nodes and DOM element functions. Templates automatically re-render when reactive data changes.

**Key Topics:**
- DOM element functions (div, span, h1, etc.)
- Reactive bindings with arrow functions
- calc() for emit gating (optional - arrays work without it)
- Component composition in templates

### 8. [Data Modeling](./08-data-modeling.md)
TypeScript interfaces for domain entities and display objects. The reactive store system works seamlessly with these models.

**Key Topics:**
- TypeScript interfaces for domain models
- DTO pattern for display optimization
- StoreAsync key functions for object sharing
- Nested object relationships

## Getting Started

New to j-templates? Start with:

1. **Component Architecture** - Understand the basic building blocks
2. **Template System** - Learn how to define UI
3. **Decorators** - Master reactive state management patterns
4. **Reactive State Management** - Understand the reactive data layer

## Examples

The Real-Time Dashboard sample application demonstrates all these patterns:

```bash
cd examples/real_time_dashboard
npm install
npm run dev
```

**Key Files to Examine:**
- `src/app.ts` - Main application component
- `src/services/dataService.ts` - Reactive state management
- `src/components/number-card.ts` - Animation system
- `src/components/data-table.ts` - Component composition
- `src/components/activity-data-table.ts` - Domain specialization

## Related Resources

- [j-templates README](../../README.md)
- [Real-Time Dashboard Example](../../examples/real_time_dashboard/)
- [Framework Source Code](../../src/)

## Contributing

To add new patterns or improve existing documentation:

1. Follow the existing documentation structure
2. Include code examples from the sample application
3. Link to relevant framework source files
4. Add references to example files

## License

This documentation is part of the j-templates project.
