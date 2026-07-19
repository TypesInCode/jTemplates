import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, input, button } from "j-templates/DOM";

export interface TaskInputEvents {
  add: { text: string };
}

class TaskInput extends Component<void, void, TaskInputEvents> {
  @Value() text: string = "";

  private handleAdd(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.Fire("add", { text: trimmed });
    this.text = "";
  }

  Template() {
    return div({ props: { className: "task-input" } }, () => [
      input({
        props: () => ({
          value: this.text,
          placeholder: "What needs doing?",
          type: "text" as const,
        }),
        on: {
          input: (e: Event) => {
            this.text = (e.target as HTMLInputElement).value;
          },
          keydown: (e: KeyboardEvent) => {
            if (e.key === "Enter") this.handleAdd();
          },
        },
      }),
      button({
        props: () => ({ disabled: this.text.trim() === "" }),
        on: { click: () => this.handleAdd() },
      }, () => "Add"),
    ]);
  }
}

const taskInput = Component.ToFunction("task-input", TaskInput);

export { taskInput };
