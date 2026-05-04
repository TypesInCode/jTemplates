import { Component } from "j-templates";
import { div, span, button, text } from "j-templates/DOM";
import { Inject } from "j-templates/Utils";
import { Task } from "../data/types";
import { ProjectService } from "../services/project-service";

interface TaskCardData {
  task: Task;
}

interface TaskCardEvents {
  statusChange: { taskId: string; status: Task["status"] };
}

class TaskCard extends Component<TaskCardData, void, TaskCardEvents> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  private priorityColors: Record<Task["priority"], string> = {
    low: "#95a5a6",
    medium: "#f39c12",
    high: "#e74c3c",
  };

  private getMemberName(memberId: string | null): string {
    if (!memberId) return "Unassigned";
    const members = this.projectService.GetMembers();
    const member = members.find(m => m.id === memberId);
    return member ? member.name : "Unknown";
  }

  Template() {
    const task = this.Data.task;
    return div({ props: { className: "kanban-card" } }, () => [
      div({ props: { className: "kanban-card-header" } }, () => [
        span({ props: { className: "kanban-card-title" } }, () => task.title),
        span({
          props: {
            className: "priority-dot",
            style: `background: ${this.priorityColors[task.priority]};`,
          },
        }),
      ]),
      div({ props: { className: "kanban-card-desc" } }, () => task.description),
      div({ props: { className: "kanban-card-footer" } }, () => [
        span({ props: { className: "kanban-card-assignee" } }, () => this.getMemberName(task.assigneeId)),
        div({ props: { className: "kanban-card-actions" } }, () => [
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
      ]),
    ]);
  }
}

export const taskCard = Component.ToFunction("task-card", TaskCard);
