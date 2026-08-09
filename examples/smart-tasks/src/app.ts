import { Component, gate } from "j-templates";
import { Value, State } from "j-templates/Utils";
import { div, h1, header, text } from "j-templates/DOM";
import { taskInput } from "./task-input";
import { taskItem } from "./task-item";
import { filterBar } from "./filter-bar";
import { statsBar } from "./stats-bar";
import { Task, FilterType } from "./types";
import "./styles.scss";
import "./app.scss";

let nextId = 1;

class App extends Component {
  @State() tasks: Task[] = [];
  @Value() filter: FilterType = "all";

  // Plain getter — reactive because it reads @State/@Value values.
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
    this.tasks.push({ id: String(nextId++), text: payload.text, completed: false });
  }

  private handleToggle(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.completed = !task.completed;
  }

  private handleDelete(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) this.tasks.splice(idx, 1);
  }

  Bound() {
    super.Bound();
    console.log("[smart-tasks] App mounted and ready.");
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      header({ props: { className: "app-header" } }, () => [
        h1({}, () => "Smart Tasks"),
        text(() => "A reactive task manager built with j-templates"),
      ]),

      // Parent → child data (read-only in child)
      statsBar({ data: () => ({ tasks: this.tasks }) }),

      // Child → parent event
      taskInput({ on: { add: (p) => this.handleAdd(p) } }),

      filterBar({
        data: () => ({ activeFilter: this.filter }),
        on: { filterChange: (p) => { this.filter = p.filter; } },
      }),

      // Either the task list or the empty state is rendered — never both.
      // gate() only re-evaluates this ternary when the boolean flips, so
      // upstream emissions that keep the list non-empty don't rebuild this
      // subtree. The task-list still updates via its own data: binding scope.
      div({}, () =>
        gate(() => this.filteredTasks.length === 0)
          ? div({ props: { className: "empty-state" } }, () => {
              if (this.tasks.length === 0)
                return "No tasks yet — Add one above to get started.";
              return `No tasks match the ${this.filter} filter.`;
            })
          : div({ props: { className: "task-list" }, data: () => this.filteredTasks },
              (task: Task) =>
                taskItem({
                  data: () => task,
                  on: {
                    toggle: () => this.handleToggle(task.id),
                    delete: () => this.handleDelete(task.id),
                  },
                }),
            ),
      ),
    ]);
  }
}

const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));
