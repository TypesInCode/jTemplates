# Smart Tasks — Requirements

A task manager demo app whose primary goal is to showcase the j-templates
framework's reactivity model and component patterns. It is a teaching/example
artifact, not a production app — every feature is chosen to demonstrate a
specific framework capability.

## Purpose

Demonstrate, in one cohesive example:

- Component decomposition and composition
- Fine-grained / isolated reactivity
- Reactive state decorators (`@Value`, `@State`, `@Scope`, `@Computed`)
- Component events (`Fire` / `on`)
- Data passing (`data: () => ...`)
- Reactive props and children
- List rendering with per-item reactive scopes
- Per-component SCSS styling

## Functional Requirements

### Task management

1. **Add a task** — type text into an input and submit via the "Add" button or
   the Enter key. Empty/whitespace-only input is ignored. The input clears
   after a successful add.
2. **Toggle completion** — click a circular check control on a task to flip its
   `completed` state.
3. **Delete a task** — click a "×" control on a task to remove it.
4. **Filter tasks** — a filter bar with three states: **All**, **Active**,
   **Completed**. The visible list reflects the active filter.

### Stats bar

5. Show three derived metrics that update reactively: **active count**,
   **completed count**, and **% done** (completed/total, rendered as `0%` when
   there are no tasks).

### Empty states

6. When there are **no tasks at all**: show "No tasks yet — Add one above to
   get started."
7. When tasks exist but **none match the active filter**: show "No tasks match
   the *{filter}* filter."

## Data Model

- `Task`: `{ id: string, text: string, completed: boolean }`
- `FilterType`: `"all" | "active" | "completed"`
- IDs are generated monotonically (incrementing counter) at add time.

## Framework Capabilities to Demonstrate

The rewrite must exercise these j-templates features, since they are the point
of the example:

1. **Component decomposition** — the app is composed of child components:
   `TaskInput`, `TaskItem`, `FilterBar`, `StatsBar`, plus a root `App`. Each is
   a class extending `Component` and registered/exported via the framework's
   component factory API.
2. **Reactive state decorators** — `@State` for the deep-reactive `tasks`
   array; `@Value` for primitive state (`filter`, input `text`);
   `@Scope`/`@Computed` for derived values (stats, filtered list).
3. **Component events** — children communicate upward via `this.Fire(...)` and
   the parent subscribes through the `on: { ... }` config (`add`, `toggle`,
   `delete`, `filterChange`).
4. **Data passing** — parent passes data to children via the `data: () => ...`
   prop.
5. **Reactive props & children** — DOM element configs use function-valued
   `props: () => ({...})` and function-valued children so they re-evaluate only
   when their dependencies change.
6. **List rendering** — the task list uses `data: () => this.filteredTasks`
   with a per-item callback, giving each item its own reactive scope (toggling
   one task must not re-render the others).
7. **Fine-grained / isolated reactivity** — conditional sections (empty states)
   and the stats bar must live in isolated scopes so unrelated siblings don't
   re-render when one piece of state changes.
8. **Lifecycle hook** — `Bound()` is used (e.g. to log app readiness after
   mount).

## Styling

- **Per-component SCSS files** — each component has its own `.scss` file,
  imported at the top of its component module (e.g. `task-item.ts` begins with
  `import "./task-item.scss";`).
- **Component-scoped selectors** — the SCSS root selector targets the
  component's root element (the custom element / component tag), e.g.:

  ```scss
  task-item {
    .task-text { color: blue; }
  }
  ```

  Nested selectors live inside that root block so styles are scoped to the
  component.
- **Vite handles SCSS** — the build pipeline compiles and bundles the SCSS
  imports automatically. Requires `sass` as a dev dependency in `package.json`.
- **Global/layout styles** (page background, body typography, `#app` layout)
  may live in a shared root stylesheet (e.g. `src/styles.scss` imported by
  `app.ts` or `index.html`), but all component-specific styling belongs in the
  component's own SCSS file.
- Components should be registered as **custom elements** (via the framework's
  Web Component registration API) so the SCSS root selector matches the actual
  DOM tag — or otherwise each component's root node must carry the component
  name as its tag/class for the SCSS root selector to target.

## Technical / Build Requirements

- TypeScript with `experimentalDecorators` enabled (per framework requirement).
- Vite as the dev/build tool with `dev`, `build`, and `preview` scripts.
- `sass` as a dev dependency for SCSS compilation.
- Single-page app mounting into `#app` via `Component.Attach`.
- Clean, minimal, modern visual design.

## Suggested Structure

```
index.html          — markup + global styles + #app mount point
src/app.ts          — root App component: owns tasks + filter state, wires children
src/types.ts        — Task, FilterType
src/task-input.ts   — input + Add button, fires "add"
src/task-item.ts    — single task row, fires "toggle"/"delete"
src/filter-bar.ts   — All/Active/Completed buttons, fires "filterChange"
src/stats-bar.ts    — derived counts + % done
src/*.scss          — per-component styles (one per component)
```

## Non-Goals (out of scope)

- No persistence (localStorage/backend) — state is in-memory only.
- No drag-and-drop, reordering, editing, or due dates.
- No routing, no accessibility-heavy features beyond basic semantics, no tests.
