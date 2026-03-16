# Tutorial 8: Building a Complete App - Real-Time Dashboard

**Duration:** 90 minutes  
**What You'll Build:** A complete real-time dashboard application combining all concepts from previous tutorials

---

## What You'll Learn

By the end of this tutorial, you'll understand how to:

- Structure a multi-file application with components, services, and data models
- Implement a service layer with dependency injection
- Build reusable generic components (DataTable)
- Create specialized components that compose generic ones
- Implement auto-refresh functionality with cleanup
- Use computed properties for derived statistics
- Create animated UI elements with the Animation system
- Manage complex reactive state with StoreAsync

---

## Prerequisites

- Completed Tutorials 1-7
- Node.js installed (v16+)
- Basic understanding of TypeScript
- Familiarity with component decorators (@Value, @State, @Computed, @Inject, @Destroy)

---

## Reference Implementation

This tutorial references the existing `examples/real_time_dashboard/` project which demonstrates all the concepts in a working application.

**Location:** `examples/real_time_dashboard/`

The project includes:
- Complete source code with detailed comments
- Working build and dev server
- Sample data generation
- SCSS styling

---

## Project Structure

```
examples/real_time_dashboard/
├── index.html                 # Entry HTML file
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.js             # Vite build configuration
├── sample_data/
│   └── generateActivities.ts  # Sample data generator
└── src/
    ├── index.ts               # Application entry point
    ├── app.ts                 # Main dashboard component
    ├── app.scss               # Styles
    ├── data/
    │   ├── activity.ts        # Activity domain model
    │   └── user.ts            # User domain model
    ├── services/
    │   ├── dataService.ts     # DataService with StoreAsync
    │   └── refreshTimer.ts    # Timer utility (IDestroyable)
    └── components/
        ├── activity-data-table.ts      # Specialized table component
        ├── activity-data-table.types.ts # Service interface
        ├── data-table.ts               # Generic table component
        ├── number-card.ts              # Animated card component
        └── number-card.scss            # Card styles
```

---

## Step 1: Project Setup and Architecture

### Understanding the Architecture

The dashboard follows a layered architecture:

1. **Domain Models** (`data/`) - Pure data structures
2. **Services** (`services/`) - Business logic and data management
3. **Components** (`components/`) - UI presentation layer
4. **Main App** (`app.ts`) - Orchestrates components and services

### Why This Structure?

- **Separation of concerns**: Each layer has a single responsibility
- **Testability**: Services can be tested independently of UI
- **Reusability**: Generic components work with any data type
- **Maintainability**: Clear boundaries make changes predictable

---

## Step 2: Data Models

### Activity Domain Model

File: `src/data/activity.ts`

```typescript
import { User } from "./user";

export interface Activity {
  id: string;
  timestamp: string;
  url: string;
  time_spent: number;
  user: User;
}
```

**Key Points:**
- Pure TypeScript interface - no framework dependencies
- Nested object relationship (Activity has User)
- Used as the domain model throughout the application

### User Domain Model

File: `src/data/user.ts`

```typescript
export interface User {
  id: string;
  name: string;
}
```

**Why Separate Files?**
- Clear domain boundaries
- Easy to extend with additional fields
- Reusable across services and components

---

## Step 3: Service Layer with StoreAsync

File: `src/services/dataService.ts`

### The DataService Class

```typescript
export class DataService implements ActivityDataService, IDestroyable {
  private store = new StoreAsync((value) => value.id);
  
  constructor() {
    this.store.Write(generateActivities(2), "activities");
  }
}
```

### StoreAsync with Key Function

```typescript
private store = new StoreAsync((value) => value.id);
```

**What This Does:**
1. Creates an async store for managing activity data
2. Key function `(value) => value.id` enables **object sharing**
3. Objects with the same ID reference the same instance internally

**Object Sharing Example:**
```typescript
const activity1 = { id: "act-1", user: { id: "u1", name: "John" } };
const activity2 = { id: "act-2", user: { id: "u1", name: "John" } };

store.Write(activity1);
store.Write(activity2);

// activity1.user === activity2.user (same instance!)
```

### Reactive Computations with ObservableScope

```typescript
private activityData = ObservableScope.Create(() => {
  const activities = this.store.Get<Activity[]>("activities", []);
  const data = ObservableNode.Unwrap(activities).slice();
  
  // Sort by timestamp (newest first)
  data.sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp === b.timestamp ? 0 : -1,
  );
  return data;
});

get ActivityData() {
  return ObservableScope.Value(this.activityData);
}
```

**How It Works:**
1. `ObservableScope.Create()` creates a reactive computation
2. It automatically tracks dependencies (accessing `store.Get()`)
3. When activities change, the scope re-computes
4. `ObservableScope.Value()` returns the cached result
5. Only re-computes when dependencies actually change

### Derived Statistics

```typescript
private totalVisits = ObservableScope.Create(() => 
  this.ActivityData.length
);

get TotalVisits() {
  return ObservableScope.Value(this.totalVisits);
}
```

**Why This Pattern?**
- Automatic re-computation when source data changes
- No manual subscriptions needed
- Efficient - only computes when necessary
- Cached between updates

### Complex Report Computation

```typescript
private report = ObservableScope.Create(() => {
  const data = ObservableScope.Value(this.activityData);
  
  // Object maps for efficient counting
  const userCounts: { [userId: string]: number } = {};
  const urlCounts: { [url: string]: number } = {};
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    userCounts[row.user.id] ??= 0;
    userCounts[row.user.id]++;
    
    urlCounts[row.url] ??= 0;
    urlCounts[row.url]++;
  }
  
  return {
    topUser: userCounts[topUserId],
    topUrl: urlCounts[topUrlId],
    // ... more statistics
  };
});
```

**Complexity:** O(n) - single pass through data  
**Optimization:** Object maps for efficient counting vs. repeated array operations

### Refresh Data

```typescript
RefreshData() {
  const nextActivities = generateActivities();
  this.store.Push("activities", ...nextActivities);
}
```

**What Push Does:**
1. Adds new items to the activities array
2. Automatically triggers all dependent scopes
3. UI updates reactively without manual intervention

### IDestroyable Pattern

```typescript
Destroy(): void {
  this.store.Destroy();
}
```

**Why?**
- Cleans up observable scopes and subscriptions
- Prevents memory leaks
- Called automatically via @Destroy decorator

---

## Step 4: Generic DataTable Component

File: `src/components/data-table.ts`

### Component Design

```typescript
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  Template() {
    return [
      thead({ data: () => this.Data.columns }, (column) =>
        th({}, () => column.name),
      ),
      tbody({ data: () => calc(() => this.Data.data) }, (data) =>
        tr({ data: () => this.Data.columns }, (column) =>
          td({ props: () => ({ className: column.class }) }, () =>
            this.Templates.cell(data, column),
          ),
        ),
      ),
    ];
  }
}
```

### Key Concepts

#### Generic Type Parameter `<D>`

```typescript
class DataTable<D> extends Component<Data<D>, CellTemplate<D>>
```

**Benefits:**
- Type-safe data handling
- IDE autocomplete for data properties
- Compile-time error checking

#### Template Functions for Custom Rendering

```typescript
interface CellTemplate<D> {
  cell: (data: D, column: Column) => vNode | vNode[];
}
```

**Why Template Functions?**
- Separates data from presentation
- Allows customization without modifying component
- Enables domain-specific rendering logic

#### calc() for Optimization

```typescript
tbody({ data: () => calc(() => this.Data.data) }, (data) => ...)
```

**What calc() Does:**
- Prevents unnecessary emissions when array reference hasn't changed
- Important when parent scope aggregates multiple values
- Optional for direct @State access (arrays are reactive by default)

**See:** `SYNTAX_BEST_PRACTICES.md` - "calc() - Gatekeeper for Derived Values"

---

## Step 5: Specialized ActivityDataTable Component

File: `src/components/activity-data-table.ts`

### Component Composition Pattern

```typescript
class ActivityDataTable extends Component {
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  Template() {
    return dataTable(
      {
        data: () => ({
          data: this.service.GetActivityData(),
          columns: columns,
        }),
      },
      cellTemplate,
    );
  }
}
```

**Why This Pattern?**
- Reuses generic DataTable implementation
- Provides domain-specific configuration
- Maintains clean separation of concerns

### Dependency Injection

```typescript
@Inject(ActivityDataService)
service!: ActivityDataService;
```

**How It Works:**
1. Parent component (App) provides the service instance
2. Child component requests it via @Inject
3. Framework resolves through injector hierarchy
4. Same instance available to all descendants

**Benefits:**
- No tight coupling to concrete implementation
- Easy to swap implementations (e.g., mock for testing)
- Follows dependency inversion principle

### Custom Cell Rendering

```typescript
const cellTemplate = {
  cell: function (data: ActivityRow, column: Column) {
    switch (column.key) {
      case "timestamp":
        return span(
          {},
          () => `${new Date(Date.parse(data.timestamp)).toLocaleString()}`,
        );
      case "username":
        return span({}, () => data.user.name);
      case "url":
        return span({}, () => data.url);
      case "timespent":
        return span({}, () => `${data.time_spent}s`);
    }
    return [];
  },
};
```

**Key Points:**
- Domain-specific formatting logic
- Handles nested data (user.name)
- Formats timestamps for display
- Returns vNodes (not raw strings)

---

## Step 6: NumberCard with Animation

File: `src/components/number-card.ts`

### Animation System

```typescript
@Destroy()
animateCardValue = new Animation(AnimationType.Linear, 500, (next) => {
  this.cardValue = Math.floor(next);
});

@Value()
cardValue = 0;
```

**How Animation Works:**
1. Creates interpolated values between start and end
2. Calls callback with each interpolated value
3. Updates displayed value smoothly over duration
4. Returns Promise for async/await support

### @Watch for Data Changes

```typescript
@Watch((comp) => comp.Data.value)
setCardValue(value: number) {
  // Start animation from current value to new value
  this.animateCardValue.Animate(this.cardValue, value);
}
```

**@Watch Decorator:**
- Creates a scope watching the specified property
- Calls handler with new value when it changes
- Handler is also called immediately with initial value on Bound()
- Automatic cleanup when component is destroyed

### Complete Component Flow

1. Parent passes `{ title, value }` as data
2. @Watch detects value change
3. Animation starts from current to new value
4. Animation callback updates cardValue
5. Template reacts to cardValue changes
6. User sees smooth animated transition

**See:** `docs/patterns/06-animation-system.md` - Animation patterns

---

## Step 7: Main App Component

File: `src/app.ts`

### Component Structure

```typescript
export class App extends Component {
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();

  @Computed({
    topUrl: "",
    topUser: "",
    totalActivities: 0,
    // ... more fields
  })
  get Report() {
    return this.dataService.GetReport();
  }

  @Destroy()
  refreshTimer = new RefreshTimer(() => this.dataService.RefreshData(), 500);
}
```

### Combining @Inject with @Destroy

```typescript
@Destroy()
@Inject(ActivityDataService)
dataService = new DataService();
```

**Why Both Decorators?**
- `@Inject` - Provides the service instance via DI
- `@Destroy` - Calls `dataService.Destroy()` when component is destroyed
- Prevents memory leaks from service subscriptions

Order matters: `@Destroy` must come before `@Inject`

### @Computed for Derived State

```typescript
@Computed({
  topUrl: "",
  topUser: "",
  totalActivities: 0,
  // ...
})
get Report() {
  return this.dataService.GetReport();
}
```

**@Computed vs @Scope:**
- `@Computed` - For creating new objects (filtering, aggregating)
- `@Scope` - For cheap primitive calculations
- Both cache results and re-evaluate on dependency changes

**See:** `SYNTAX_BEST_PRACTICES.md` - "@Computed vs @Scope" table

### @Computed Async Alternative

```typescript
@ComputedAsync(null)
async getUserData(): Promise<User | null> {
  const response = await fetch(`/api/users/${this.userId}`);
  return response.json();
}
```

**When to Use:**
- API calls that depend on other state
- Automatic loading state handling
- Returns default value while pending

### Auto-Refresh Timer

```typescript
@Destroy()
refreshTimer = new RefreshTimer(() => this.dataService.RefreshData(), 500);

Bound(): void {
  this.refreshTimer.start();
}
```

**Lifecycle:**
1. `Bound()` called after component attaches to DOM
2. Timer starts, calling `RefreshData()` every 500ms
3. `RefreshData()` pushes new activities to store
4. All reactive computations update automatically
5. UI updates without manual intervention

**Why 500ms?**
- Fast enough to see real-time updates
- Slow enough to not overwhelm the browser
- Adjustable based on use case

---

## Step 8: Entry Point

File: `src/index.ts`

```typescript
import { Component } from "j-templates";
import { app } from "./app";

declare const root: HTMLElement;
Component.Attach(root, app({}));
```

**What Happens:**
1. Imports Component framework and app factory
2. Declares root element (defined in index.html)
3. Calls `Component.Attach()` to mount the application

### Component.Attach() Lifecycle

1. Initializes virtual node (vNode.Init)
2. Creates DOM node structure
3. Instantiates App component
4. Calls `Bound()` lifecycle method
5. Renders `Template()`
6. Attaches DOM to root element
7. Sets up reactive bindings

**See:** `SYNTAX_BEST_PRACTICES.md` - "Component lifecycle"

---

## Step 9: Template Composition

### App Template

```typescript
Template() {
  return [
    // Metrics row with animated number cards
    div({ props: { className: "card-row" } }, () => [
      numberCard({
        data: () => ({
          title: "Total Visits",
          value: this.dataService.GetTotalVisits(),
        }),
      }),
      numberCard({
        data: () => ({
          title: "Total Time (s)",
          value: this.dataService.GetTotalTime(),
        }),
      }),
    ]),
    
    // Report statistics row
    div(
      {
        props: { className: "report-row" },
        data: () => this.Report
      },
      (report) => [
        div({}, () => `Top User (Visits): ${report.topUser} (${report.topUserByVisits})`),
        div({}, () => `Top URL (Visits): ${report.topUrl} (${report.topUrlByVisits})`),
        // ... more stats
      ],
    ),
    
    // Activity data table component
    activityDataTable({}),
  ];
}
```

### Key Patterns

#### Reactive Data Binding

```typescript
div({ data: () => this.Report }, (report) => [
  div({}, () => `Top User: ${report.topUser}`)
])
```

**How It Works:**
- `data: () => this.Report` creates reactive binding
- When Report changes, the div and all children re-render
- Framework tracks dependencies automatically
- No manual update calls needed

#### Component Composition

```typescript
numberCard({
  data: () => ({ title: "Total Visits", value: this.dataService.GetTotalVisits() })
})
```

**Benefits:**
- Reusable components
- Clear data flow (parent → child)
- Type-safe through interfaces

#### Array Children

```typescript
return [
  div({}, () => "First"),
  div({}, () => "Second")
]
```

**Why Arrays Work:**
- Template() can return single vNode or array
- Array children are rendered in order
- Framework handles array iteration internally

---

## Step 10: Data Flow Architecture

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Opens Dashboard                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  index.ts: Component.Attach(root, app({}))                  │
│  - Initializes App component                                │
│  - Calls Bound()                                            │
│  - Starts refresh timer                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  App.Bound()                                                │
│  - refreshTimer.start()                                     │
│  - refreshTimer calls dataService.RefreshData() every 500ms │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DataService.RefreshData()                                  │
│  - Generates new activities                                 │
│  - store.Push("activities", ...)                            │
│  - Triggers all reactive scopes                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Reactive Updates (Automatic)                               │
│  - activityData scope re-computes (sorted activities)       │
│  - totalVisits scope re-computes (count)                    │
│  - totalTime scope re-computes (sum)                        │
│  - report scope re-computes (statistics)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  UI Updates (Automatic)                                     │
│  - numberCard components detect value changes via @Watch    │
│  - NumberCard starts animations to new values               │
│  - activityDataTable detects data changes                   │
│  - Table re-renders with new rows                           │
│  - Report div re-renders with new stats                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Takeaways

1. **No manual updates**: All UI updates happen automatically through reactivity
2. **Single source of truth**: DataService is the only data source
3. **Derived state**: All statistics computed reactively from source data
4. **Cleanup awareness**: All resources properly destroyed on component teardown

---

## Try It Yourself: Exercises

### Exercise 1: Add a New Metric Card

**Goal:** Add a card displaying "Unique Users" count

**Steps:**
1. Add `GetUniqueUsers()` method to DataService
2. Add `@Scope()` property for unique user count computation
3. Add new `numberCard()` call in App Template
4. Run `npm run dev` to see it in action

**Hint:** Use the same pattern as `GetTotalVisits()`

---

### Exercise 2: Change Refresh Interval

**Goal:** Adjust the auto-refresh speed

**Steps:**
1. Find `RefreshTimer` instantiation in App component
2. Change interval from `500` to `2000` (2 seconds)
3. Observe the slower update frequency
4. Try `10000` (10 seconds) for even slower updates

**Question:** What refresh interval would be appropriate for production use?

---

### Exercise 3: Add Sorting to DataTable

**Goal:** Allow sorting table by any column

**Steps:**
1. Add sort state to DataTable component: `@Value() sortColumn: string | null = null`
2. Add sort direction state: `@Value() sortAscending: boolean = true`
3. Modify `tbody` data to sort based on these values
4. Add click handlers to column headers to toggle sort

**Hint:** You'll need to modify the generic DataTable component, not just ActivityDataTable

---

### Exercise 4: Add Loading State

**Goal:** Show "Loading..." while data fetches

**Steps:**
1. Add `@Value() isLoading: boolean = true` to App component
2. Set `isLoading = false` after initial data loads in DataService
3. Add conditional rendering in Template to show loading spinner
4. Use ternary: `isLoading ? span({}, () => "Loading...") : actualContent`

**Bonus:** Show loading state when refresh timer is fetching new data

---

### Exercise 5: Create a Chart Component

**Goal:** Visualize activity data with a simple bar chart

**Steps:**
1. Create `src/components/activity-chart.ts`
2. Create `ActivityChart` class extending `Component`
3. Inject `ActivityDataService` via `@Inject`
4. Compute activity counts per URL in Template
5. Render horizontal bars with height proportional to counts

**Hint:** Use `@Scope()` to compute the aggregated data, then map to div elements with dynamic heights

---

## Troubleshooting

### Issue: Build Fails with "jsdom external" Error

**Symptoms:**
```
'jsdom' is imported from external module 'j-templates' but never used
```

**Solution:**
Ensure `vite.config.js` has:
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["jsdom"],
    },
  },
});
```

This is needed when running inside the j-templates repo.

---

### Issue: LSP Shows Import Errors

**Symptoms:**
Red squiggles on `import { Component } from "j-templates"`

**Solution:**
Run `npm install` in the project directory. LSP errors will disappear after dependencies are installed.

---

### Issue: Animations Don't Smoothly Transition

**Symptoms:**
Numbers jump directly to new value instead of animating

**Possible Causes:**
1. @Watch not detecting changes (check decorator syntax)
2. Animation not started properly
3. @Destroy decorator order wrong

**Solution:**
Verify this pattern:
```typescript
@Destroy()  // Must come FIRST
@Watch((comp) => comp.Data.value)
updateValue(newValue: number) {
  this.animation.Animate(this.currentValue, newValue);
}
```

---

### Issue: Table Doesn't Update When Data Changes

**Symptoms:**
DataService returns new data, but table still shows old rows

**Possible Causes:**
1. Not using `calc()` or reactive binding in tbody data
2. Array mutation instead of store.Push
3. Missing reactive data binding in component

**Solution:**
Check this pattern:
```typescript
tbody({ data: () => calc(() => this.Data.data) }, (data) => ...)
```

---

### Issue: Memory Leaks (Timer Keeps Running After Component Removed)

**Symptoms:**
Console logs continue after component should be destroyed

**Solution:**
Ensure all timers use @Destroy decorator:
```typescript
@Destroy()
refreshTimer = new RefreshTimer(...);
```

And RefreshTimer implements IDestroyable:
```typescript
Destroy(): void {
  this.stop();
}
```

---

## References

### Patterns Documentation
- [Component Architecture](./patterns/01-component-architecture.md)
- [Reactive State Management](./patterns/02-reactive-state-management.md)
- [Decorators](./patterns/03-decorators.md)
- [Dependency Injection](./patterns/04-dependency-injection.md)
- [Component Composition](./patterns/05-component-composition.md)
- [Animation System](./patterns/06-animation-system.md)
- [Template System](./patterns/07-template-system.md)
- [Data Modeling](./patterns/08-data-modeling.md)

### Syntax Best Practices
- [Complete Reference](./SYNTAX_BEST_PRACTICES.md)

### Source Code
- `examples/real_time_dashboard/` - Working reference implementation
- `src/Utils/decorators.ts` - All decorator implementations
- `src/Store/Store/storeAsync.ts` - StoreAsync class
- `src/Store/Tree/observableScope.ts` - ObservableScope class
- `src/Utils/animation.ts` - Animation class
- `src/Utils/injector.ts` - Injector class

### Previous Tutorials
- [Tutorial 1: Getting Started](./tutorials/01-getting-started.md)
- [Tutorial 2: Your First Component](./tutorials/02-your-first-component.md)
- [Tutorial 3: Reactive State Basics](./tutorials/03-reactive-state-basics.md)
- [Tutorial 4: Template System Deep Dive](./tutorials/04-template-system-deep-dive.md)
- [Tutorial 5: Decorators Deep Dive](./tutorials/05-decorators-deep-dive.md)
- [Tutorial 6: Component Composition](./tutorials/06-component-composition.md)
- [Tutorial 7: Dependency Injection](./tutorials/07-dependency-injection.md)

---

## Success Checklist

Before moving on, verify you understand:

- [ ] How StoreAsync with key function enables object sharing
- [ ] Why ObservableScope automatically re-computes on dependency changes
- [ ] When to use @Computed vs @Scope for derived state
- [ ] How @Inject works with parent component injector
- [ ] Why @Destroy is needed for timers and subscriptions
- [ ] How generic components enable type-safe reusability
- [ ] How template functions enable custom rendering
- [ ] How animation system provides smooth value transitions
- [ ] How @Watch detects and handles property changes
- [ ] How reactive data binding propagates through templates

---

## What's Next?

Congratulations! You've completed Tutorial 8 and built a complete application that combines all concepts from the previous tutorials.

**You Now Understand:**
- Complete application architecture with services and components
- Reactive data management with StoreAsync
- Generic component patterns with TypeScript
- Dependency injection and inversion of control
- Animation and smooth UI transitions
- Automatic cleanup and memory leak prevention

**Next Steps:**
1. Experiment with the exercises above
2. Build your own dashboard features
3. Explore advanced patterns in the source code
4. Contribute improvements back to the framework

Happy coding!
