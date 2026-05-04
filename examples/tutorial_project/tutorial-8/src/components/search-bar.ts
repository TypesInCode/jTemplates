import { Component } from "j-templates";
import { div, input, span, text, select, option } from "j-templates/DOM";
import { Value, Scope, Inject } from "j-templates/Utils";
import { ProjectService } from "../services/project-service";
import type { TaskFilter } from "../data/types";

interface SearchBarEvents {
  filterChanged: { filter: TaskFilter };
}

class SearchBar extends Component<void, void, SearchBarEvents> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  @Value()
  query = "";

  @Value()
  statusFilter = "";

  @Value()
  priorityFilter = "";

  @Scope()
  get resultCount(): number {
    if (!this.query) return 0;
    const tasks = this.projectService.GetTasks();
    return tasks.filter(t =>
      t.title.toLowerCase().includes(this.query.toLowerCase())
    ).length;
  }

  @Scope()
  get combinedFilter(): TaskFilter {
    return {
      status: this.statusFilter || null,
      priority: this.priorityFilter || null,
      assigneeId: null,
      search: this.query,
    };
  }

  private fireFilter(): void {
    this.Fire("filterChanged", { filter: this.combinedFilter });
  }

  private handleInput(e: Event): void {
    this.query = (e.target as HTMLInputElement).value;
    this.fireFilter();
  }

  private handleClear(): void {
    this.query = "";
    this.fireFilter();
  }

  private handleStatusChange(e: Event): void {
    this.statusFilter = (e.target as HTMLSelectElement).value;
    this.fireFilter();
  }

  private handlePriorityChange(e: Event): void {
    this.priorityFilter = (e.target as HTMLSelectElement).value;
    this.fireFilter();
  }

  Template() {
    return div({ props: { className: "search-bar" } }, () => [
      input({
        props: () => ({
          type: "text",
          placeholder: "Search tasks...",
          value: this.query,
        }),
        on: { input: (e: Event) => this.handleInput(e) },
      }),
      this.query ? span({
        props: { className: "search-clear" },
        on: { click: () => this.handleClear() },
      }, () => "✕") : text(() => ""),
      span({ props: { className: "result-count" } }, () =>
        this.query ? `${this.resultCount} result${this.resultCount !== 1 ? "s" : ""}` : ""
      ),
      div({ props: { className: "filter-group" } }, () => [
        select({
          props: () => ({ value: this.statusFilter }),
          on: { change: (e: Event) => this.handleStatusChange(e) },
        }, () => [
          option({ props: { value: "" } }, () => "All Status"),
          option({ props: { value: "todo" } }, () => "Todo"),
          option({ props: { value: "in-progress" } }, () => "In Progress"),
          option({ props: { value: "done" } }, () => "Done"),
        ]),
      ]),
      div({ props: { className: "filter-group" } }, () => [
        select({
          props: () => ({ value: this.priorityFilter }),
          on: { change: (e: Event) => this.handlePriorityChange(e) },
        }, () => [
          option({ props: { value: "" } }, () => "All Priority"),
          option({ props: { value: "high" } }, () => "High"),
          option({ props: { value: "medium" } }, () => "Medium"),
          option({ props: { value: "low" } }, () => "Low"),
        ]),
      ]),
    ]);
  }
}

export const searchBar = Component.ToFunction("search-bar", SearchBar);
