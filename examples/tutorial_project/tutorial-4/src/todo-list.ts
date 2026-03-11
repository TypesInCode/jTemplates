/**
 * Tutorial 4: Template System Deep Dive - TodoList Component
 *
 * This file demonstrates:
 * - Reactive state with @Value and @State
 * - Conditional rendering
 * - List rendering with map()
 * - Event handling
 * - Two-way data binding
 * - Computed properties
 */

import { Component } from "j-templates";
import { Value, State } from "j-templates/Utils";
import { div, h1, input, button, span } from "j-templates/DOM";
import { todoItem, TodoItemData } from "./todo-item.js";

/**
 * Todo interface
 */
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type FilterType = "all" | "active" | "completed";

/**
 * TodoList component - main component for the todo application
 *
 * Features:
 * - Add, toggle, and delete todos
 * - Filter by status (all, active, completed)
 * - Two-way data binding on input
 * - Conditional rendering
 * - List rendering with components
 */
class TodoList extends Component<void> {
  // Reactive primitive state - todo input value
  @Value()
  newInput: string = "";

  // Reactive array state - list of todos
  @State()
  todos: Todo[] = [];

  // Reactive filter state
  @Value()
  filter: FilterType = "all";

  // Unique ID counter for new todos
  @Value()
  nextId: number = 1;

  /**
   * Computed property: Filter todos based on current filter
   */
  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case "active":
        return this.todos.filter((todo) => !todo.completed);
      case "completed":
        return this.todos.filter((todo) => todo.completed);
      default:
        return this.todos;
    }
  }

  /**
   * Computed property: Count of active (incomplete) todos
   */
  get activeCount(): number {
    return this.todos.filter((todo) => !todo.completed).length;
  }

  /**
   * Computed property: Count of completed todos
   */
  get completedCount(): number {
    return this.todos.filter((todo) => todo.completed).length;
  }

  /**
   * Handle adding a new todo
   * With @State, we can use .push() directly - deep reactivity tracks mutations
   */
  private addTodo(): void {
    if (this.newInput.trim() === "") {
      return;
    }

    this.todos.push({
      id: this.nextId,
      text: this.newInput.trim(),
      completed: false,
    });

    this.nextId++;
    this.newInput = "";
  }

  /**
   * Handle toggling todo completion
   * For object properties in @State, direct mutation works
   */
  private toggleTodo(id: number): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  /**
   * Handle deleting a todo
   * Use splice for array mutations with @State
   */
  private deleteTodo(id: number): void {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.todos.splice(index, 1);
    }
  }

  /**
   * Handle clearing completed todos
   * Reassign filtered array works with @State
   */
  private clearCompleted(): void {
    this.todos = this.todos.filter((todo) => !todo.completed);
  }

  /**
   * Handle filter change
   */
  private setFilter(newFilter: FilterType): void {
    this.filter = newFilter;
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      // Header
      h1({}, () => "Tutorial 4: Todo List"),

      // Input section with two-way data binding
      div({ props: { className: "input-section" } }, () => [
        input({
          props: () => ({
            value: this.newInput,
            placeholder: "What needs to be done?",
            type: "text" as const,
          }),
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newInput = target.value;
            },
          },
        }),
        button({
          on: { click: () => this.addTodo() },
          props: () => ({ disabled: this.newInput.trim() === "" }),
        }, () => "Add"),
      ]),

      // Filter buttons with conditional active state
      div({ props: { className: "filters" } }, () => [
        button({
          props: () => ({
            className: this.filter === "all" ? "active" : "",
          }),
          on: { click: () => this.setFilter("all") },
        }, () => "All"),
        button({
          props: () => ({
            className: this.filter === "active" ? "active" : "",
          }),
          on: { click: () => this.setFilter("active") },
        }, () => "Active"),
        button({
          props: () => ({
            className: this.filter === "completed" ? "active" : "",
          }),
          on: { click: () => this.setFilter("completed") },
        }, () => "Completed"),
      ]),

      // Todo list - use data prop for list rendering (framework handles iteration)
      // Each todo item gets its own scope via children function
      this.todos.length === 0
        ? div({ props: { className: "empty-state" } }, () =>
            "No todos yet. Add one above!"
          )
        : div(
            {
              props: { className: "todo-list" },
              data: () => this.filteredTodos,
            },
            (todo) =>
              todoItem(todo, {
                onToggle: (id) => this.toggleTodo(id),
                onDelete: (id) => this.deleteTodo(id),
              })
          ),

      // Stats footer - wrapped in function for separate scope
      div({ props: { className: "stats" } }, () => [
        span({}, () =>
          this.activeCount === 1 ? "1 item left" : `${this.activeCount} items left`
        ),
        this.completedCount > 0
          ? button({
              on: { click: () => this.clearCompleted() },
            }, () => "Clear Completed")
          : span({}, () => ""),
      ]),
    ]);
  }
}

// Create factory function
const todoListFunc = Component.ToFunction("todo-list", TodoList);

/**
 * TodoList factory function
 */
export function todoList() {
  return todoListFunc({});
}