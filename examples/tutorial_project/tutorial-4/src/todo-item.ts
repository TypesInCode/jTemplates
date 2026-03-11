/**
 * Tutorial 4: Template System Deep Dive - TodoItem Component
 *
 * This file demonstrates:
 * - Component with data props
 * - Callback functions for parent communication
 * - Conditional class binding
 * - Event handling patterns
 */

import { Component } from "j-templates";
import { div, input, span, button } from "j-templates/DOM";

/**
 * Todo item data interface
 */
export interface TodoItemData {
  id: number;
  text: string;
  completed: boolean;
}

/**
 * TodoItem component displays a single todo with toggle and delete
 *
 * Features:
 * - Checkbox to toggle completion
 * - Text display with conditional styling
 * - Delete button
 * - Events for parent communication
 */
interface TodoItemEvents {
  onToggle: number;
  onDelete: number;
}

class TodoItem extends Component<TodoItemData, {}, TodoItemEvents> {
  Template() {
    return div({
      props: () => ({
        className: this.Data.completed ? "todo-item completed" : "todo-item",
      }),
    }, () => [
      // Checkbox to toggle completion
      input({
        props: () => ({
          type: "checkbox" as const,
          checked: this.Data.completed,
        }),
        on: {
          change: () => this.Fire("onToggle", this.Data.id),
        },
      }),

      // Todo text
      span({}, () => this.Data.text),

      // Delete button
      button({
        on: {
          click: () => this.Fire("onDelete", this.Data.id),
        },
      }, () => "Delete"),
    ]);
  }
}

// Create factory function
const todoItemFunc = Component.ToFunction<
  TodoItemData,
  {},
  TodoItemEvents,
  void
>("todo-item", TodoItem);

/**
 * TodoItem factory function
 *
 * @param data - Todo item data
 * @param on - Event handlers
 */
export function todoItem(
  data: TodoItemData,
  on?: {
    onToggle?: (payload: number) => void;
    onDelete?: (payload: number) => void;
  }
) {
  return todoItemFunc({
    data: () => data,
    on,
  });
}