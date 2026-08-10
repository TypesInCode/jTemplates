import { Component } from "j-templates";
import { div, span } from "j-templates/DOM";
import { Inject, Scope } from "j-templates/Utils";
import { Task } from "../data/types";
import { ProjectService } from "../services/project-service";
import { taskCard } from "./task-card";

interface KanbanBoardData {
  filter: {
    status: string | null;
    priority: string | null;
    search: string;
  };
}

interface KanbanBoardEvents {
  statusChange: { taskId: string; status: Task["status"] };
}

class KanbanBoard extends Component<KanbanBoardData, void, KanbanBoardEvents> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // @Scope caches the filtered task list — new reference is fine for iteration.
  @Scope()
  get filteredTasks(): Task[] {
    const tasks = this.projectService.GetTasks();
    const { status, priority, search } = this.Data.filter;
    return tasks.filter(task => {
      if (status && task.status !== status) return false;
      if (priority && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }

  // Each column has its own @Scope so changes only re-render the affected column.
  // Reading each scope at the point of use (data: binding) keeps reactive
  // subscriptions granular — moving a card only touches two column scopes.
  @Scope()
  get todoTasks(): Task[] {
    return this.filteredTasks.filter((t: Task) => t.status === "todo");
  }

  @Scope()
  get inProgressTasks(): Task[] {
    return this.filteredTasks.filter((t: Task) => t.status === "in-progress");
  }

  @Scope()
  get doneTasks(): Task[] {
    return this.filteredTasks.filter((t: Task) => t.status === "done");
  }

  Template() {
    return div({ props: { className: "kanban-board" } }, () => [
      // Each column reads its own @Scope directly in the data: binding.
      // Only the columns whose arrays change will re-render.
      div({ props: { className: "kanban-column" } }, () => [
        div({ props: { className: "kanban-column-header" } }, () => [
          span({ props: { className: "kanban-column-title" } }, () => "To Do"),
          span({ props: { className: "kanban-column-count" } }, () => String(this.todoTasks.length)),
        ]),
        div({
          props: { className: "kanban-card-list" },
          data: () => this.todoTasks,
        }, (task: Task) =>
          taskCard({
            data: () => ({ task }),
            on: { statusChange: (p) => this.Fire("statusChange", p) },
          })
        ),
      ]),
      div({ props: { className: "kanban-column" } }, () => [
        div({ props: { className: "kanban-column-header" } }, () => [
          span({ props: { className: "kanban-column-title" } }, () => "In Progress"),
          span({ props: { className: "kanban-column-count" } }, () => String(this.inProgressTasks.length)),
        ]),
        div({
          props: { className: "kanban-card-list" },
          data: () => this.inProgressTasks,
        }, (task: Task) =>
          taskCard({
            data: () => ({ task }),
            on: { statusChange: (p) => this.Fire("statusChange", p) },
          })
        ),
      ]),
      div({ props: { className: "kanban-column" } }, () => [
        div({ props: { className: "kanban-column-header" } }, () => [
          span({ props: { className: "kanban-column-title" } }, () => "Done"),
          span({ props: { className: "kanban-column-count" } }, () => String(this.doneTasks.length)),
        ]),
        div({
          props: { className: "kanban-card-list" },
          data: () => this.doneTasks,
        }, (task: Task) =>
          taskCard({
            data: () => ({ task }),
            on: { statusChange: (p) => this.Fire("statusChange", p) },
          })
        ),
      ]),
    ]);
  }
}

export const kanbanBoard = Component.ToFunction("kanban-board", KanbanBoard);
