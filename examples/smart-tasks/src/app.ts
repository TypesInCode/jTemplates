import { Component } from "j-templates";
import { Value, State, Computed } from "j-templates/Utils";
import { div, h1, span, text } from "j-templates/DOM";
import { taskInput } from "./task-input";
import { taskItem } from "./task-item";
import { filterBar } from "./filter-bar";
import { statsBar } from "./stats-bar";
import { Task, FilterType } from "./types";

let nextId = 1;

class App extends Component {
  @State() tasks: Task[] = [];
  @Value() filter: FilterType = "all";

  get filteredTasks(): Task[] {
    switch (this.filter) {
      case "active":
        return this.tasks.filter((t) => !t.completed);
      case "completed":
        return this.tasks.filter((t) => t.completed);
      default:
        return this.tasks;
    }
  }

  private handleAdd(payload: { text: string }): void {
    this.tasks.push({
      id: String(nextId++),
      text: payload.text,
      completed: false,
    });
  }

  private handleToggle(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.completed = !task.completed;
  }

  private handleDelete(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) this.tasks.splice(idx, 1);
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      h1({}, () => [
        span({}, () => "Smart Tasks"),
        span(
          {
            props: {
              style:
                "font-size: 0.85rem; color: #888; font-weight: 400; display: block;",
            },
          },
          () => "j-templates reactivity demo",
        ),
      ]),

      statsBar({ data: () => ({ tasks: this.tasks }) }),

      taskInput({ on: { add: (p) => this.handleAdd(p) } }),

      filterBar({
        data: () => ({ activeFilter: this.filter }),
        on: {
          filterChange: (p) => {
            this.filter = p.filter;
          },
        },
      }),

      // Conditional area — isolated from always-present siblings above.
      // Each child has its own scoped children function so reactivity is
      // fine-grained: the outer function reads nothing and never re-runs.

      // Empty state — isolated scope. Only this div re-evaluates when
      // tasks/filteredTasks/filter changes. Siblings are unaffected.
      div({}, () => {
        if (this.tasks.length === 0) {
          return div({ props: { className: "empty-state" } }, () => [
            span(
              { props: { style: "font-weight: 600" } },
              () => "No tasks yet",
            ),
            text(() => " Add one above to get started."),
          ]);
        }
        if (this.filteredTasks.length === 0) {
          return div({ props: { className: "empty-state" } }, () => [
            text(() => "No tasks match the "),
            span({ props: { style: "font-weight: 600" } }, () => this.filter),
            text(() => " filter."),
          ]);
        }
        return text(() => "");
      }),

      // Task list — isolated data: binding.
      // Each item gets its own reactive scope — toggling one doesn't
      // re-render others.
      div(
        {
          props: { className: "task-list" },
          data: () => this.filteredTasks,
        },
        (task: Task) =>
          taskItem({
            data: () => task,
            on: {
              toggle: () => this.handleToggle(task.id),
              delete: () => this.handleDelete(task.id),
            },
          }),
      ),
    ]);
  }

  Bound() {
    super.Bound();
    console.log(
      "Smart Tasks ready — try adding, toggling, and filtering tasks.",
    );
  }
}

const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));
