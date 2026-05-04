# SYNTAX_PRIMER Recommended Enhancements

Changes derived from tutorial-8 capstone project. Each entry includes the gap, the recommended addition, and the target section.

---

## 1. @Scope Granularity — One Scope Per Independent UI Region

**Gap:** The primer states `@Scope` returns a new reference on update, but doesn't warn that a single `@Scope` returning a composite object (e.g., `{ todo, inProgress, done }`) will emit a new reference whenever *any* of its properties changes. This defeats downstream `gate()` and causes all consuming UI regions to re-render.

**Add to "State Decorators" section, after `@Scope` description:**

```
IMPORTANT: Each @Scope getter creates a single cached value. When that value
changes, ALL downstream consumers re-evaluate. If different UI regions consume
different slices of the data, use separate @Scope getters per region.

Anti-pattern — single scope for multiple regions:
  @Scope()
  get columns() {
    return {
      todo: tasks.filter(t => t.status === "todo"),
      inProgress: tasks.filter(t => t.status === "in-progress"),
      done: tasks.filter(t => t.status === "done"),
    };
  }
  // Changing one column's content creates a new { todo, inProgress, done }
  // object, causing all three columns to re-render.

Correct — one scope per independent region:
  @Scope() get todoTasks() { return tasks.filter(t => t.status === "todo"); }
  @Scope() get inProgressTasks() { return tasks.filter(t => t.status === "in-progress"); }
  @Scope() get doneTasks() { return tasks.filter(t => t.status === "done"); }
  // Each column reads its own scope. Only affected columns re-render.
```

---

## 2. @Scope and gate() Are Incompatible for Composite Objects

**Gap:** The primer describes `gate()` as preventing emissions when `===` comparison fails to detect change. It doesn't explain that `@Scope` always returns a new reference, so `gate()` wrapping a `@Scope` getter is always ineffective.

**Add to "Inline Computed Scopes: scope(), gate(), peek()" section, under "When to Use gate()":**

New row in the "When to Use gate()" table:

| Scenario | Use gate()? | Why |
|----------|-------------|-----|
| Wrapping `@Scope` getter | No | `@Scope` always returns new reference; `===` always differs |

New paragraph after the table:

```
gate() and @Scope are incompatible for the same reason: @Scope returns a new
reference on every update, so gate()'s === comparison always sees a change.
If you need both caching and reference stability, use @Computed() instead,
which preserves object identity via ApplyDiff.
```

---

## 3. @Computed as Alternative for Composite Objects

**Gap:** The primer says use `@Computed` for "creating new objects", but doesn't explain that it preserves object identity across updates via `ApplyDiff`. This means a `@Computed` returning `{ todo, inProgress, done }` would actually work with `gate()` — the reference stays the same even when sub-properties change.

**Add to "@Computed vs @Scope vs @ComputedAsync" comparison table:**

New row:

| Aspect | `@Computed()` | `@Scope()` |
|--------|------------|------------|
| Composite object for multiple consumers | Yes — same reference, sub-property mutations tracked | No — new reference invalidates all consumers |

**Add to "@Computed" description:**

```
@Computed uses ApplyDiff to merge changes into the existing object reference.
This means downstream consumers using === comparison (like gate() or data:
bindings) only see a change when the actual structure differs, not when the
getter re-runs. Use @Computed when returning composite objects consumed by
multiple UI regions. Prefer per-region @Scope when you need granular updates.
```

---

## 4. data: Binding Stability Across Renders

**Gap:** The primer explains that `data: () => this.items` creates a reactive scope, but doesn't explain that the function reference itself must be stable across `Template()` calls. Functions created inline within helper methods called from `Template()` create new closures each render, preventing scope reuse.

**Add to "Key Template Rules" section, as a new rule:**

```
6. **Keep data: bindings in Template() directly** — helper functions called
   from Template() that return elements with data: bindings create new
   closures each render, preventing the framework from reusing reactive
   scopes. Inline column/row definitions in Template() or use @Scope getters
   for the data source.

Anti-pattern — helper function with data: binding:
  private renderColumn = (title: string, items: Item[]) =>
    div({ data: () => items }, (item) => renderItem(item));
  Template() {
    return div({}, () => [
      this.renderColumn("A", groupA),  // New closure each render
      this.renderColumn("B", groupB),
    ]);
  }

Correct — inline with @Scope data source:
  @Scope() get groupA() { return items.filter(...); }
  Template() {
    return div({}, () => [
      div({ data: () => this.groupA }, (item) => renderItem(item)),
      div({ data: () => this.groupB }, (item) => renderItem(item)),
    ]);
  }
```

---

## 5. Component Composition Over Render Callbacks

**Gap:** The primer describes template callbacks (`Templates.render(item)`) as a pattern. This works for simple cases but doesn't scale — callbacks can't have their own state, lifecycle, or events. No guidance on when to prefer a dedicated component instead.

**Add to "Template Callbacks" section, after the example:**

```
Template callbacks are suitable for simple rendering logic with no internal
state. When the rendered item needs its own state, lifecycle, or events,
use a dedicated component instead:

  // Callback — no state, no events, no lifecycle
  table({ data: () => items }, (item) => div({}, () => item.name));

  // Component — full reactivity, events, lifecycle
  table({ data: () => items }, (item) =>
    itemCard({ data: () => ({ item }), on: { deleted: (p) => handleDelete(p) } })
  );

Prefer dedicated components when:
  - The item needs internal state (@Value, @State)
  - The item fires events back to the parent
  - The item needs Bound() or Destroy() lifecycle
  - The item injects services
```

---

## 6. @Watch for Syncing Child @Value State with Parent Data

**Gap:** The primer describes `@Watch` for detecting property changes, but doesn't show the pattern of using it to keep child `@Value` state in sync with parent `this.Data` when the parent updates externally.

**Add to "@Watch — Property Change Handler" section, as a new example:**

```typescript
// Syncing child @Value state with parent Data.
// When the parent updates the filter externally (e.g., from another component),
// @Watch ensures the child's form controls reflect the new values.

@Watch((self) => self.Data.currentFilter)
syncFromParent(newFilter: TaskFilter): void {
  this.statusFilter = newFilter.status || "";
  this.priorityFilter = newFilter.priority || "";
}
```

---

## 7. Conditional Rendering with Ternary (Not .filter(Boolean))

**Gap:** The primer mentions `.filter(Boolean)` as a way to handle conditionals, but this is an anti-pattern — it creates new arrays and triggers unnecessary re-renders. The ternary with `text(() => "")` fallback is the recommended approach, but it's not emphasized enough for structural conditionals (entire component trees).

**Add to "Key Template Rules" section, as a new rule (or enhance rule 4):**

```
4. **Conditional rendering** — Use ternary with text(() => "") fallback for
   single elements. For larger component trees, use ternary directly:

   // Single element
   this.isLoading ? div({}, () => "Loading") : text(() => ""),

   // Component tree — ternary at the point of use
   this.activeTab === "board"
     ? kanbanBoard({ data: () => ({ filter: this.filter }) })
     : taskTable({ data: () => ({ filter: this.filter }) }),

   // Anti-pattern: .filter(Boolean) creates new arrays and loses scope reuse
   [this.showA ? componentA({}) : null, this.showB ? componentB({}) : null].filter(Boolean)
```

---

## 8. New Anti-Patterns Table Entries

**Add to "Anti-Patterns & Common Mistakes" table:**

| Mistake | Fix |
|---------|-----|
| Single `@Scope` for multiple independent UI regions | One `@Scope` per region |
| `gate()` wrapping `@Scope` getter | Use `@Computed` or remove `gate()` |
| `data:` binding inside helper function called from `Template()` | Inline in `Template()` with `@Scope` data source |
| `@Scope` read at top of `Template()` | Read inside children function or `data:` binding |
| Render callback for items needing state/events | Use dedicated component |
| Child `@Value` not synced with parent `Data` | Use `@Watch((self) => self.Data.prop)` |
| `.filter(Boolean)` for conditional rendering | Use ternary with `text(() => "")` |
| `.map()` inside children function | Pass array as `data:`, framework iterates |

---

## 9. New Debugging Symptom

**Add to "Debugging Reactivity" table:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Entire Template re-runs on small change | `@Scope` read at top of `Template()` | Read scope inside children function or `data:` binding |
| Entire section re-renders on small change | Single `@Scope` feeds multiple regions | Split into per-region `@Scope` getters |
| `gate()` doesn't prevent re-renders | Wrapping `@Scope` getter (always new ref) | Read `@Scope` directly or use `@Computed` |
| `data:` binding re-renders every time | Function created in helper, not `Template()` | Inline element in `Template()` |
| Child form controls don't reflect parent changes | No sync from `this.Data` to `@Value` | Add `@Watch((self) => self.Data.prop)` |

---

## 10. Scope Read Location Determines Subscription Boundary

**Gap:** The primer explains that `@Scope` creates a reactive subscription when its getter is read, but doesn't explain that *where* the getter is read in `Template()` determines the subscription boundary. Reading a `@Scope` at the top of `Template()` (e.g., `const x = this.myScope`) registers the scope as a dependency of the entire Template, so any change triggers a full Template re-run. Reading the `@Scope` inside a children function or `data:` binding keeps the subscription scoped to that subtree.

**Add to "Key Template Rules" section, as a new rule:**

```
7. **Read @Scope getters at the point of use** — reading a @Scope at the top
   of Template() registers it as a dependency of the entire Template. Reading
   it inside a children function or data: binding keeps the subscription scoped
   to that subtree.

 Anti-pattern — scope read at top of Template:
   Template() {
     const stats = this.completionStats;  // Subscribes entire Template
     return div({}, () => [
       div({}, () => `${stats.rate}%`),   // Any stats change re-runs ALL
       div({}, () => "other static content"),
     ]);
   }

 Correct — scope read inside children function:
   Template() {
     return div({}, () => [
       div({}, () => {                     // Subscription scoped to this subtree
         const stats = this.completionStats;
         return `${stats.rate}%`;
       }),
       div({}, () => "other static content"),  // Unaffected by stats changes
     ]);
   }
```

---

## 11. Quick Reference — Scope Selection Decision Tree

**Add new section after "Decorator Selection" table:**

```
### Scope Selection Decision Tree

Need derived data?
  └─ Is it consumed by one UI region?
     ├─ Yes → @Scope() per region, read inside children function
     └─ No, multiple regions need different slices?
        ├─ Cheap, same reference (filter/sort of existing array) → @Scope() per region
        └─ Creating new composite object?
           ├─ Need reference stability across updates → @Computed()
           └─ Each region independent → @Scope() per region

Need to prevent unnecessary emissions?
  └─ Source is @State or store proxy → gate() helps (=== comparison)
  └─ Source is @Scope getter → gate() does NOT help (always new ref)
  └─ Source is plain property → gate() may help for primitives

Where to read a scope in Template()?
  └─ Top of Template() → subscribes entire Template (avoids unless unavoidable)
  └─ Inside children function → subscribes only that subtree (preferred)
  └─ Inside data: binding → subscribes only that iteration (preferred)
```

---

## 12. No vNode Diffing — Scope Emission Rebuilds the Entire Subtree

**Gap:** The primer describes "surgical reactivity" and "vNode re-renders" but never states that the framework does **not** diff vNode trees. When a reactive scope emits, the children function for that scope re-runs, producing a brand-new vNode tree. The framework then patches the DOM from the old vNodes to the new vNodes. There is no vNode-to-vNode reconciliation like React's diffing algorithm.

This is critical context: the optimization goal is to minimize **how often** children functions re-run (via fine-grained scoping), not to make the re-run itself cheap. A scope that emits frequently will rebuild its entire vNode subtree every time.

**Add new section after "Reactivity Model" (or "How Reactivity Works"):**

```
### How Updates Propagate

When a reactive scope emits, the framework:

1. Re-runs the children function that read the scope, producing a new vNode tree.
2. Patches the DOM from the old vNode tree to the new vNode tree.

The framework does NOT diff two vNode trees against each other. There is no
vNode reconciliation. The "surgical" aspect comes from scoping — only the
children functions that subscribed to the changed scope re-run. Everything else
is untouched.

This means:
- A scope read at the top of Template() rebuilds the entire component vNode tree.
- A scope read inside a children function rebuilds only that subtree.
- A scope read inside a data: binding rebuilds only that iteration's vNode.

The optimization is minimizing emission frequency through fine-grained scopes,
not making the rebuild cheap.
```

**Add to "Debugging Reactivity" table, new row:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Expensive Template re-runs on every change | Large vNode subtree subscribed to frequently-changing scope | Split into smaller scopes to reduce rebuild surface |

**Add to "Anti-Patterns & Common Mistakes" table, new row:**

| Mistake | Fix |
|---------|-----|
| Assuming framework diffs vNode trees | It doesn't — optimize by minimizing scope emission frequency |
