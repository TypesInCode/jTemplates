# Tutorial 5: Decorators Deep Dive

**Duration:** 75 minutes  
**What You'll Build:** A shopping cart application with computed totals, change logging, and automatic cleanup

## Prerequisites

- Tutorial 1: Getting Started (complete)
- Tutorial 2: Your First Component (complete)
- Tutorial 3: Reactive State Basics (complete)
- Tutorial 4: Template System Deep Dive (complete)
- Node.js 18+ installed
- Basic TypeScript knowledge

## Learning Objectives

By the end of this tutorial, you will be able to:

- Use `@Computed` decorator for derived/computed values
- Use `@Scope` decorator for simple cached getters
- Use `@Watch` decorator to react to state changes
- Use `@Destroy` decorator for automatic cleanup
- Implement the `IDestroyable` pattern for custom cleanup logic
- Understand when to use `@Computed` vs `@Scope`
- Build services that integrate with the framework's lifecycle

---

## Step 1: The Problem with Derived State

When building applications, you often need computed values based on your state. For example, in a shopping cart:

- Subtotal: Sum of all item prices
- Discount amount: Subtotal × discount percentage
- Total: Subtotal - discount amount
- Item count: Total number of items

### Manual Approach (Wrong)

```typescript
class ShoppingCart extends Component {
  @State()
  items: CartItem[] = [];
  
  @Value()
  discount: number = 0;
  
  // ❌ This won't update automatically!
  get total(): number {
    const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = subtotal * (this.discount / 100);
    return subtotal - discountAmount;
  }
  
  Template() {
    // This total won't update when items change!
    return div({}, () => `Total: $${this.total}`);
  }
}
```

**Problem:** Regular getters don't integrate with the reactivity system. The template won't know to re-render when `items` or `discount` changes.

**Solution:** Use the `@Computed` decorator!

---

## Step 2: The @Computed Decorator

The `@Computed` decorator creates cached, reactive computed values that automatically update when their dependencies change.

### Basic Syntax

```typescript
import { Computed, State, Value } from "j-templates/Utils";

class ShoppingCart extends Component {
  @State()
  items: CartItem[] = [];
  
  @Value()
  discount: number = 0;
  
  @Computed(0)  // 0 is the default value
  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  
  @Computed(0)
  get discountAmount(): number {
    return this.subtotal * (this.discount / 100);
  }
  
  @Computed(0)
  get total(): number {
    return this.subtotal - this.discountAmount;
  }
  
  Template() {
    return div({}, () => `Total: $${this.total.toFixed(2)}`);
  }
}
```

### How @Computed Works

1. **Caching:** The getter only recalculates when dependencies (`items`, `discount`) change
2. **Object Reuse:** For object/array returns, `@Computed` preserves identity using `StoreSync`
3. **Automatic Tracking:** Dependencies are automatically tracked - no manual dependency arrays needed
4. **Lazy Evaluation:** Only computes when accessed in the template

### Default Value Parameter

The first parameter to `@Computed` is the default value returned before the first computation:

```typescript
// For numbers
@Computed(0)
get total(): number { ... }

// For strings
@Computed("")
get displayName(): string { ... }

// For arrays
@Computed([])
get completedItems(): Item[] { ... }

// For objects
@Computed({ count: 0, total: 0 })
get stats(): Stats { ... }

// For null/undefined
@Computed(null)
get selectedUser(): User | null { ... }
```

### @Computed with Arrays

```typescript
@State()
todos: Todo[] = [];

@Computed([])
get completedTodos(): Todo[] {
  // Returns a new filtered array, but @Computed caches it
  // and preserves object identity for efficient DOM updates
  return this.todos
    .filter(todo => todo.completed)
    .sort((a, b) => b.createdAt - a.createdAt);
}

Template() {
  return div({ data: () => this.completedTodos }, (todo) =>
    div({}, () => todo.text)
  );
}
```

### @Computed with Objects

```typescript
@State()
items: Product[] = [];

@Computed({ total: 0, average: 0, count: 0 })
get stats(): { total: number; average: number; count: number } {
  const total = this.items.reduce((sum, item) => sum + item.price, 0);
  return {
    total,
    average: total / (this.items.length || 1),
    count: this.items.length
  };
}

Template() {
  return div({}, () => [
    div({}, () => `Total: $${this.stats.total}`),
    div({}, () => `Average: $${this.stats.average.toFixed(2)}`),
    div({}, () => `Count: ${this.stats.count}`)
  ]);
}
```

**Key Point:** When returning objects, `@Computed` uses `StoreSync` to reuse the same object reference with in-place updates, preventing unnecessary DOM re-renders.

---

## Step 3: The @Scope Decorator

`@Scope` is similar to `@Computed` but lighter-weight. Use it for simple cached getters that don't need object identity preservation.

### When to Use @Scope vs @Computed

| Use Case | Decorator | Why |
|----------|-----------|-----|
| Primitive returns (string, number, boolean) | `@Scope` | Lightweight caching |
| Simple array operations (map, filter, sort) | `@Scope` | Fine for maintaining identity |
| Creating new objects in getter | `@Computed` | Object reuse via `StoreSync` |
| Expensive computations | `@Computed` | Caching + object reuse |
| Async operations | `@ComputedAsync` | Async with caching |

### @Scope Example

```typescript
import { Scope, Value, State } from "j-templates/Utils";

class UserProfile extends Component {
  @Value()
  firstName: string = "John";
  
  @Value()
  lastName: string = "Doe";
  
  @Scope()
  get fullName(): string {
    // Cheap string concatenation - @Scope is perfect
    return `${this.firstName} ${this.lastName}`;
  }
  
  @State()
  tags: string[] = [];
  
  @Scope()
  get tagCount(): number {
    // Simple primitive return
    return this.tags.length;
  }
  
  @Scope()
  get uppercaseName(): string {
    // String operations - fine with @Scope
    return this.fullName.toUpperCase();
  }
  
  Template() {
    return div({}, () => [
      div({}, () => this.fullName),
      div({}, () => `Tags: ${this.tagCount}`),
      div({}, () => `Uppercase: ${this.uppercaseName}`)
    ]);
  }
}
```

### Array Operations with @Scope

```typescript
@State()
items: Product[] = [];

@Scope()
get sortedItems(): Product[] {
  // Returns new array reference each time - @Scope is fine
  // for operations that naturally create new arrays
  return [...this.items].sort((a, b) => a.price - b.price);
}

@Scope()
get itemNames(): string[] {
  // Array.map() creates new array - @Scope handles this
  return this.items.map(item => item.name);
}

Template() {
  return div({ data: () => this.sortedItems }, (item) =>
    div({}, () => item.name)
  );
}
```

**Note:** For array operations that create new arrays (map, filter, sort), `@Scope` is perfectly fine. It caches the result and only recalculates when dependencies change. Use `@Computed` when you need the additional object reuse benefits for complex nested objects.

---

## Step 4: The @Watch Decorator

The `@Watch` decorator lets you execute side effects when specific properties change. This is useful for:

- Logging changes
- Tracking analytics
- Making API calls
- Updating external systems
- Console debugging

### Basic Syntax

```typescript
import { Watch, State, Value } from "j-templates/Utils";

class ShoppingCart extends Component {
  @State()
  items: CartItem[] = [];
  
  @Watch((comp) => comp.items.length)
  onItemsChanged(length: number) {
    console.log(`Cart now has ${length} item(s)`);
  }
  
  Template() {
    // ...
  }
}
```

### How @Watch Works

1. **Immediate Invocation:** The handler is called immediately with the current value when `Bound()` is called
2. **Change Detection:** The handler is called again whenever the watched property changes
3. **Automatic Cleanup:** Subscription is automatically removed when the component is destroyed
4. **Batched Updates:** Watched values are computed in greedy scopes (batched updates)

### Watching Multiple Properties

```typescript
@State()
user: User = { name: "", email: "" };

@Value()
isLoggedIn: boolean = false;

@Watch((comp) => comp.user.name)
onNameChange(newName: string) {
  console.log(`Name changed to ${newName}`);
  this.analytics.track('name_updated', { name: newName });
}

@Watch((comp) => comp.isLoggedIn)
onLoginStatusChanged(loggedIn: boolean) {
  if (loggedIn) {
    console.log("User logged in");
    this.loadUserData();
  } else {
    console.log("User logged out");
    this.clearUserData();
  }
}

Bound() {
  super.Bound();
  // Watch handlers are now active
  console.log("Component bound, watchers initialized");
}
```

### Practical Example: Analytics Tracking

```typescript
class ProductList extends Component {
  @State()
  products: Product[] = [];
  
  @Value()
  filter: string = "all";
  
  @Watch((comp) => comp.products.length)
  onProductCountChanged(count: number) {
    this.analytics.track('products_loaded', { count });
  }
  
  @Watch((comp) => comp.filter)
  onFilterChanged(newFilter: string) {
    this.analytics.track('filter_changed', { filter: newFilter });
  }
  
  Template() {
    // ...
  }
}
```

**Important:** `@Watch` is for side effects only. Never modify state inside a watch handler based on the same property you're watching - this creates infinite loops.

---

## Step 5: The @Destroy Decorator

The `@Destroy` decorator automatically calls `.Destroy()` on marked properties when the component is destroyed. This prevents memory leaks from:

- Timers and intervals
- Event subscriptions
- WebSocket connections
- Animations
- External service instances

### Basic Syntax

```typescript
import { Destroy, Value } from "j-templates/Utils";
import { Animation, AnimationType } from "j-templates/Utils/animation";

class AnimatedCounter extends Component {
  @Value()
  count: number = 0;
  
  @Destroy()
  animation = new Animation(AnimationType.Linear, 300, (value) => {
    this.animateValue = Math.floor(value);
  });
  
  private animateValue: number = 0;
  
  private updateCount(newCount: number) {
    this.animation.Animate(this.animateValue, newCount);
    this.count = newCount;
  }
  
  Destroy() {
    super.Destroy();  // Calls Destroy.All(this)
    // All @Destroy()-marked properties have .Destroy() called
  }
  
  Template() {
    return div({}, () => this.animateValue);
  }
}
```

### How @Destroy Works

1. **Mark Properties:** Use `@Destroy()` on properties that need cleanup
2. **Implement IDestroyable:** Property must have a `.Destroy()` method or implement `IDestroyable` interface
3. **Automatic Cleanup:** During component destruction, all marked properties have `.Destroy()` called
4. **Order Matters:** `@Destroy` properties are cleaned up before observable scopes are destroyed

### Common @Destroy Use Cases

```typescript
class DataComponent extends Component {
  // Timer cleanup
  @Destroy()
  refreshTimer = new RefreshTimer(() => this.refresh(), 5000);
  
  // Subscription cleanup
  @Destroy()
  subscription = someObservable.subscribe(this.handleData);
  
  // Animation cleanup
  @Destroy()
  animation = new Animation(AnimationType.EaseIn, 500, (value) => {
    this.progress = value;
  });
  
  // Service cleanup (if service implements IDestroyable)
  @Destroy()
  dataService = new DataService();
  
  Bound() {
    super.Bound();
    this.refreshTimer.start();
  }
}
```

### Creating IDestroyable Services

#### Basic IDestroyable Service

```typescript
import { IDestroyable } from "j-templates/Utils/utils.types";

class RefreshTimer implements IDestroyable {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: () => void;
  private milliseconds: number;
  
  constructor(callback: () => void, milliseconds: number) {
    this.callback = callback;
    this.milliseconds = milliseconds;
  }
  
  start() {
    this.intervalId = setInterval(() => {
      this.callback();
    }, this.milliseconds);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  Destroy() {
    this.stop();
  }
}
```

#### Reactive Service with ObservableScope

For services that need to expose reactive data to components:

```typescript
import { ObservableScope } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";

class ReactiveLogger implements IDestroyable {
  // Create reactive scope for logs array
  private logsScope = ObservableScope.Create<string[]>(() => this.logs);
  private logs: string[] = [];
  
  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs = [...this.logs, `[${timestamp}] ${message}`];
    // Manually trigger scope update
    ObservableScope.Update(this.logsScope);
    console.log(`[${timestamp}] ${message}`);
  }
  
  getLogs(): string[] {
    // Read through scope for reactivity
    return ObservableScope.Value(this.logsScope);
  }
  
  Destroy() {
    ObservableScope.Destroy(this.logsScope);
    this.logs = [];
  }
}

// Usage in component - logs update reactively!
class ShoppingCart extends Component {
  @Destroy()
  logger = new ReactiveLogger();
  
  @Watch((comp) => comp.items.length)
  onItemCountChanged(count: number) {
    this.logger.log(`Cart now has ${count} item(s)`);
  }
  
  Template() {
    return div({ data: () => this.logger.getLogs() }, (log: string) =>
      div({}, () => log)
    );
  }
}
```

**Key Benefits:**
- Service manages its own reactive state
- Components read through `ObservableScope.Value()` for automatic updates
- Manual `ObservableScope.Update()` triggers re-evaluation
- Proper cleanup with `ObservableScope.Destroy()`

---

## Step 6: @Inject with @Destroy

You can combine `@Inject` with `@Destroy` to automatically clean up injected services.

```typescript
import { Inject, Destroy } from "j-templates/Utils";

abstract class DataService implements IDestroyable {
  abstract GetData(): Data[];
  abstract Save(data: Data): Promise<void>;
  Destroy(): void;
}

class AppComponent extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new ApiService();  // Provider pattern
  
  Bound() {
    super.Bound();
    // Service is available and will be cleaned up
    const data = this.dataService.GetData();
  }
}

class ChildComponent extends Component {
  @Destroy()
  @Inject(DataService)
  dataService!: DataService;  // Consumer pattern - retrieved from parent
  
  Template() {
    return div({}, () => this.dataService.GetData().length);
  }
}
```

---

## Step 7: Complete Example - Shopping Cart

Let's build a complete shopping cart that demonstrates all the decorators we've learned.

### Component 1: CartItem

```typescript
import { Component } from "j-templates";
import { div, button, span } from "j-templates/DOM";
import { State } from "j-templates/Utils";

export interface CartItemData {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartItemEvents {
  increment: void;
  decrement: void;
  remove: void;
}

class CartItem extends Component<CartItemData, {}, CartItemEvents> {
  Template() {
    return div({
      props: { className: "cart-item" }
    }, [
      span({ props: { className: "item-name" } }, () => this.Data.name),
      div({ props: { className: "item-controls" } }, [
        button({
          on: { click: () => this.Fire("decrement") }
        }, () => "-"),
        span({ props: { className: "item-quantity" } }, () => this.Data.quantity),
        button({
          on: { click: () => this.Fire("increment") }
        }, () => "+"),
        button({
          props: { className: "remove-btn" },
          on: { click: () => this.Fire("remove") }
        }, () => "×")
      ]),
      span({ props: { className: "item-price" } }, 
        () => `$${(this.Data.price * this.Data.quantity).toFixed(2)}`
      )
    ]);
  }
}

export const cartItem = Component.ToFunction("cart-item", CartItem);
```

### Component 2: ShoppingCart

```typescript
import { Component } from "j-templates";
import { div, button, select, option, input, span, label } from "j-templates/DOM";
import { Value, State, Scope, Watch, Destroy } from "j-templates/Utils";
import { ObservableScope } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";
import { cartItem, CartItemData } from "./cart-item";

// Reactive logger service using ObservableScope
class ReactiveLogger implements IDestroyable {
  // Create reactive scope for logs array
  private logsScope = ObservableScope.Create<string[]>(() => this.logs);
  private logs: string[] = [];
  
  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs = [...this.logs, `[${timestamp}] ${message}`];
    // Manually trigger scope update
    ObservableScope.Update(this.logsScope);
    console.log(`[${timestamp}] ${message}`);
  }
  
  getLogs(): string[] {
    // Read through scope for reactivity
    return ObservableScope.Value(this.logsScope);
  }
  
  Destroy() {
    ObservableScope.Destroy(this.logsScope);
    this.logs = [];
  }
}

class ShoppingCart extends Component {
  @Value()
  private selectedProduct: string = "laptop";

  @State()
  items: CartItemData[] = [];

  @Value()
  discount: number = 0;

  // @Destroy for automatic cleanup
  @Destroy()
  logger: ReactiveLogger = new ReactiveLogger();

  // @Watch for logging item count changes
  @Watch((comp) => comp.items.length)
  onItemCountChanged(count: number) {
    this.logger.log(`Cart now has ${count} item(s)`);
  }

  // @Watch for discount changes
  @Watch((comp) => comp.discount)
  onDiscountChanged(newDiscount: number) {
    this.logger.log(`Discount changed to ${newDiscount}%`);
  }

  // @Scope for primitive derived calculations
  @Scope()
  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  @Scope()
  get discountAmount(): number {
    return this.subtotal * (this.discount / 100);
  }

  @Scope()
  get total(): number {
    return this.subtotal - this.discountAmount;
  }

  @Scope()
  get itemCount(): number {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  private get availableProducts(): { id: string; name: string; price: number }[] {
    return [
      { id: "laptop", name: "Laptop", price: 999.99 },
      { id: "mouse", name: "Wireless Mouse", price: 29.99 },
      { id: "keyboard", name: "Mechanical Keyboard", price: 149.99 },
      { id: "monitor", name: "27\" Monitor", price: 399.99 }
    ];
  }

  private addItem() {
    const product = this.availableProducts.find(p => p.id === this.selectedProduct);
    if (!product) return;

    const existingItem = this.items.find(item => item.name === product.name);
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.items.push({
        id: Date.now(),
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
    
    this.logger.log(`Added ${product.name} to cart`);
  }

  private incrementQuantity(itemId: number) {
    const item = this.items.find(item => item.id === itemId);
    if (item) {
      item.quantity++;
      this.logger.log(`Increased quantity of ${item.name}`);
    }
  }

  private decrementQuantity(itemId: number) {
    const item = this.items.find(item => item.id === itemId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        this.logger.log(`Decreased quantity of ${item.name}`);
      } else {
        this.removeItem(itemId);
      }
    }
  }

  private removeItem(itemId: number) {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index > -1) {
      const itemName = this.items[index].name;
      this.items.splice(index, 1);
      this.logger.log(`Removed ${itemName} from cart`);
    }
  }

  Template() {
    return div({ props: { className: "shopping-cart" } }, () => [
      // Add item section
      div({ props: { className: "add-section" } }, () => [
        select({
          props: () => ({ value: this.selectedProduct }),
          on: {
            change: (e: Event) => {
              const target = e.target as HTMLSelectElement;
              this.selectedProduct = target.value;
            }
          }
        }, () =>
          this.availableProducts.map(product =>
            option({ props: { value: product.id } }, () => product.name)
          )
        ),
        button({ on: { click: () => this.addItem() } }, () => "Add to Cart")
      ]),

      // Cart items - use data prop for list rendering
      div({ props: { className: "cart-items" } }, () =>
        this.items.length > 0
          ? div({ data: () => this.items }, (item: CartItemData) =>
              cartItem({
                data: () => item,
                on: {
                  increment: () => this.incrementQuantity(item.id),
                  decrement: () => this.decrementQuantity(item.id),
                  remove: () => this.removeItem(item.id)
                }
              })
            )
          : div({}, () => "Your cart is empty")
      ),

      // Summary with @Scope computed values
      div({ props: { className: "cart-summary" } }, () => [
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Subtotal:"),
          span({}, () => `$${this.subtotal.toFixed(2)}`)
        ]),
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => `Discount (${this.discount}%):`),
          span({}, () => `-$${this.discountAmount.toFixed(2)}`)
        ]),
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Total:"),
          span({}, () => `$${this.total.toFixed(2)}`)
        ]),
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Items:"),
          span({}, () => `${this.itemCount}`)
        ])
      ]),

      // Logs from @Watch handlers - use data prop for list rendering
      div({ props: { className: "log-section" } }, () =>
        this.logger.getLogs().length > 0
          ? div({ data: () => this.logger.getLogs() }, (log: string) =>
              div({ props: { className: "log-entry" } }, () => log)
            )
          : div({}, () => "No logs yet")
      )
    ]);
  }
}

export const shoppingCart = Component.ToFunction("shopping-cart", ShoppingCart);
```

**Key Improvements:**
1. **ReactiveLogger with ObservableScope** - Service exposes reactive state
2. **@Scope for primitives** - Correct decorator for number return types
3. **data prop for lists** - No `.map()` in children functions
4. **Reactive log updates** - Logs appear automatically when added

---

## Try It Yourself

### Exercise 1: Add High Value Alert

Add a `@Watch` that logs an alert when the total exceeds $1000:

```typescript
@Watch((comp) => comp.total)
onTotalExceedsThousand(total: number) {
  if (total > 1000) {
    this.logger.log("⚠️ High value cart: $" + total.toFixed(2));
  }
}
```

### Exercise 2: Add Average Price Computation

Add a `@Computed` that calculates the average item price:

```typescript
@Computed(0)
get averagePrice(): number {
  if (this.itemCount === 0) return 0;
  return this.subtotal / this.itemCount;
}
```

### Exercise 3: Create a Reset Button

Add a button that clears all items and the discount:

```typescript
private resetCart() {
  this.items = [];
  this.discount = 0;
  this.logger.log("Cart reset");
}

// In Template:
button({ on: { click: () => this.resetCart() } }, () => "Reset Cart")
```

### Exercise 4: Create an Analytics Service

Create a custom `IDestroyable` service for tracking analytics:

```typescript
class AnalyticsService implements IDestroyable {
  private events: string[] = [];
  
  track(event: string, data: Record<string, any>) {
    const log = `${event}: ${JSON.stringify(data)}`;
    this.events.push(log);
    console.log(`[Analytics] ${log}`);
  }
  
  getEvents(): string[] {
    return this.events;
  }
  
  Destroy() {
    this.events = [];
    console.log("[Analytics] Service destroyed");
  }
}

// Use in ShoppingCart:
@Destroy()
private analytics = new AnalyticsService();

@Watch((comp) => comp.items.length)
onItemCountChanged(count: number) {
  this.analytics.track('cart_updated', { count });
}
```

---

## Troubleshooting

### Issue: @Computed Not Updating

**Problem:** Computed value doesn't update when dependencies change

**Solution:** Make sure you're accessing the computed property (not caching it):

```typescript
// ❌ Wrong - caching the value
Template() {
  const total = this.total;  // Cached!
  return div({}, () => `$${total}`);
}

// ✅ Correct - accessing directly
Template() {
  return div({}, () => `$${this.total}`);
}
```

### Issue: @Watch Called Multiple Times

**Problem:** Watch handler fires more than expected

**Solution:** Watch the specific property, not the whole object:

```typescript
// ❌ Might fire on any nested change
@Watch((comp) => comp.items)
onItemsChanged(items: CartItem[]) { ... }

// ✅ Fires only when array reference changes
@Watch((comp) => comp.items.length)
onItemCountChanged(count: number) { ... }
```

### Issue: Memory Leak

**Problem:** Component destroyed but timers/subscriptions still running

**Solution:** Mark resources with `@Destroy`:

```typescript
// ❌ Won't be cleaned up
private timer = setInterval(...);

// ✅ Will be cleaned up automatically
@Destroy()
private timer = setInterval(...);
```

### Issue: @Scope vs @Computed Confusion

**Problem:** Not sure which decorator to use

**Solution:** Use this decision guide:

| Your Use Case | Use |
|---------------|-----|
| Simple primitive (string, number) | `@Scope` |
| Array map/filter/sort | `@Scope` (or `@Computed`) |
| Creating new object in getter | `@Computed` |
| Expensive computation | `@Computed` |
| Async operation | `@ComputedAsync` |

---

## References

### Patterns Documentation
- [Reactivity](../../patterns/02-reactivity.md) - Complete decorator API reference and reactive state patterns
- [Templates & Data](../../patterns/03-templates-and-data.md) - Animation with @Destroy

### Source Code
- `src/Utils/decorators.ts` - Decorator implementations
- `src/Utils/utils.types.ts` - IDestroyable interface
- `src/Store/Store/storeSync.ts` - StoreSync for @Computed object reuse

### Example Projects
- `examples/tutorial_project/tutorial-5/` - Complete shopping cart example

---

## Summary

In this tutorial, you learned:

1. **@Computed** - Creates cached, reactive computed values with object reuse
2. **@Scope** - Lightweight cached getters for simple computations
3. **@Watch** - Execute side effects when properties change
4. **@Destroy** - Automatic cleanup to prevent memory leaks
5. **IDestroyable** - Interface for custom cleanup logic

### When to Use Each

| Decorator | Use When |
|-----------|----------|
| `@Value` | Primitive state (number, string, boolean) |
| `@State` | Complex state (objects, arrays) |
| `@Computed` | Derived values creating new objects |
| `@Scope` | Simple cached getters |
| `@Watch` | Side effects on state changes |
| `@Destroy` | Resources needing cleanup |

### Next Steps

Continue to **Tutorial 6: Component Composition** to learn about:
- Generic components with TypeScript generics
- Template functions for custom rendering
- Parent-child component communication
- Container/Presentational patterns
