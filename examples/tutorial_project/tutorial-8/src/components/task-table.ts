import { Component } from "j-templates";
import { div, table, thead, tbody, tr, th, td, button, span, text } from "j-templates/DOM";
import { Inject, Scope } from "j-templates/Utils";
import { Task } from "../data/types";
import { ProjectService } from "../services/project-service";

interface TaskTableData {
  filter: {
    status: string | null;
    priority: string | null;
    search: string;
  };
}

interface TaskTableEvents {
  statusChange: { taskId: string; status: Task["status"] };
}

class TaskTable extends Component<TaskTableData, void, TaskTableEvents> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // @Scope caches the filtered task list — returns new reference on change.
  // This is appropriate because filter() creates a new array each time,
  // and we don't need identity preservation for the iteration.
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

  private getMemberName(memberId: string | null): string {
    if (!memberId) return "Unassigned";
    const members = this.projectService.GetMembers();
    const member = members.find(m => m.id === memberId);
    return member ? member.name : "Unknown";
  }

  private statusColors: Record<Task["status"], string> = {
    "todo": "#95a5a6",
    "in-progress": "#3498db",
    "done": "#2ecc71",
  };

  private priorityLabels: Record<Task["priority"], string> = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
  };

  Template() {
    return div({ props: { className: "task-table-wrapper" } }, () => [
      span({ props: { className: "task-count" } }, () =>
        `Showing ${this.filteredTasks.length} task${this.filteredTasks.length !== 1 ? "s" : ""}`
      ),
      table({ props: { className: "task-table" } }, () => [
        thead({}, () =>
          tr({}, () => [
            th({}, () => "Task"),
            th({}, () => "Status"),
            th({}, () => "Priority"),
            th({}, () => "Assignee"),
            th({}, () => "Actions"),
          ])
        ),
        // filteredTasks is a @Scope getter that returns a NEW array from .filter(),
        // so gate()'s === check would never gate anything — read it directly.
        tbody({ data: () => this.filteredTasks }, (task: Task) =>
          tr({
            props: () => ({
              className: `task-row status-${task.status}`,
            }),
          }, () => [
            td({ props: { className: "task-title" } }, () => task.title),
            td({}, () =>
              span({
                props: () => ({
                  className: "status-badge",
                  style: `background: ${this.statusColors[task.status]};`,
                }),
              }, () => task.status.replace("-", " "))
            ),
            td({}, () => this.priorityLabels[task.priority]),
            td({}, () => this.getMemberName(task.assigneeId)),
            td({ props: { className: "task-actions" } }, () => [
              task.status !== "todo" ? button({
                props: { className: "btn-move" },
                on: { click: () => this.Fire("statusChange", { taskId: task.id, status: "todo" }) },
              }, () => "← Todo") : text(() => ""),
              task.status !== "in-progress" ? button({
                props: { className: "btn-move" },
                on: { click: () => this.Fire("statusChange", { taskId: task.id, status: "in-progress" }) },
              }, () => "← WIP →") : text(() => ""),
              task.status !== "done" ? button({
                props: { className: "btn-move" },
                on: { click: () => this.Fire("statusChange", { taskId: task.id, status: "done" }) },
              }, () => "Done →") : text(() => ""),
            ]),
          ])
        ),
      ]),
    ]);
  }
}

export const taskTable = Component.ToFunction("task-table", TaskTable);
