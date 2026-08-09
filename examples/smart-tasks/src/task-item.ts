import { Component } from "j-templates";
import { div, span } from "j-templates/DOM";
import { Task } from "./types";
import "./task-item.scss";

export interface TaskItemEvents {
  toggle: { id: string };
  delete: { id: string };
}

class TaskItem extends Component<Task, void, TaskItemEvents> {
  Template() {
    return div({
      props: () => ({
        className: this.Data.completed ? "task-item completed" : "task-item",
      }),
    }, () => [
      div({
        props: () => ({
          className: this.Data.completed ? "task-check checked" : "task-check",
        }),
        on: { click: () => this.Fire("toggle", { id: this.Data.id }) },
      }, () => this.Data.completed ? "\u2713" : ""),
      span({ props: { className: "task-text" } }, () => this.Data.text),
      div({
        props: { className: "task-delete" },
        on: { click: () => this.Fire("delete", { id: this.Data.id }) },
      }, () => "\u00d7"),
    ]);
  }
}

const taskItem = Component.ToFunction("task-item", TaskItem);
export { taskItem };
