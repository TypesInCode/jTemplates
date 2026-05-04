import { Component, scope } from "j-templates";
import { div } from "j-templates/DOM";
import { Value, Scope, Inject, Destroy, ComputedAsync, State } from "j-templates/Utils";
import { TaskFilter, Task } from "./data/types";
import { ProjectService, RealProjectService } from "./services/project-service";
import { CollaborationService, RealCollaborationService } from "./services/collaboration-service";
import { projectHeader } from "./components/project-header";
import { viewTabs } from "./components/view-tabs";
import { taskTable } from "./components/task-table";
import { kanbanBoard } from "./components/kanban-board";
import { statsDashboard } from "./components/stats-dashboard";
import { activityFeed } from "./components/activity-feed";
import { memberPresence } from "./components/member-presence";
import { searchBar } from "./components/search-bar";

// Root component provides services via @Inject + @Destroy.
// Child components consume services without knowing the concrete type.
class App extends Component {
  // @Inject registers the service at this injector scope.
  // @Destroy ensures the service's Destroy() is called on component teardown.
  // This is the provider pattern: parent provides, children consume.
  @Destroy()
  @Inject(ProjectService)
  projectService = new RealProjectService();

  // CollaborationService depends on GetMembers from ProjectService.
  // We pass a function to avoid circular dependency issues.
  @Destroy()
  @Inject(CollaborationService)
  collaborationService = new RealCollaborationService(() => this.projectService.GetMembers());

  // @Value for primitive state — lightweight, no proxy overhead.
  @Value()
  activeTab = "board";

  // @State for complex filter object — deep reactivity via proxy.
  // @Value is only for primitives; objects with nested properties need @State.
  @State()
  filter = { status: null as string | null, priority: null as string | null, assigneeId: null as string | null, search: "" as string };

  // @ComputedAsync demonstrates async diff computation with a default value.
  // The getter is synchronous, but the StoreAsync backend computes diffs off
  // the main thread. This is useful for expensive aggregations.
  @ComputedAsync({ summary: "", avgPriority: 0 })
  get projectSummary(): { summary: string; avgPriority: number } {
    const tasks = this.projectService.GetTasks();
    const stats = this.projectService.GetStats();
    const priorityMap: Record<Task["priority"], number> = { low: 1, medium: 2, high: 3 };
    const avgPriority = tasks.length > 0
      ? tasks.reduce((sum, t) => sum + priorityMap[t.priority], 0) / tasks.length
      : 0;
    return {
      summary: `${stats.completedTasks}/${stats.totalTasks} tasks done (${stats.completionRate}%)`,
      avgPriority: Math.round(avgPriority * 10) / 10,
    };
  }

  // Async data fetching pattern: @Scope + scope(async).
  // The async function reads reactive values before the first await.
  // scope() creates an inline computed scope that resolves the Promise
  // and emits the resolved value (string), not the Promise itself.
  @Scope()
  get projectHealth(): string {
    return scope(async () => {
      const stats = this.projectService.GetStats();
      // Simulate async health check — reactive reads before await.
      await new Promise(resolve => setTimeout(resolve, 50));
      return stats.completionRate > 75 ? "Healthy" : stats.completionRate > 50 ? "Moderate" : "Needs Attention";
    });
  }

  private handleFilterChange(payload: { filter: TaskFilter }): void {
    this.filter = payload.filter;
  }

  private handleStatusChange(payload: { taskId: string; status: Task["status"] }): void {
    this.projectService.UpdateTaskStatus(payload.taskId, payload.status);
  }

  private handleTabChange(payload: { tab: string }): void {
    this.activeTab = payload.tab;
  }

  Template() {
    return div({ props: { className: "app" } }, () => [
      // Header doesn't depend on local reactive state — separate scope.
      projectHeader({ data: () => ({ title: "Project Dashboard", subtitle: "Tutorial 8: Capstone" }) }),

      div({ props: { className: "app-layout" } }, () => [
        // Main content area — split into independent reactive scopes so that
        // changing this.filter only re-evaluates the sections that depend on it,
        // not the entire main-content subtree.
        div({ props: { className: "main-content" } }, () => [
          // Search bar + filters consolidated: emits filterChanged with full filter.
          searchBar({ on: { filterChanged: (p) => this.handleFilterChange(p) } }),

          // View tabs: depend on this.activeTab only.
          viewTabs({
            data: () => ({ activeTab: this.activeTab }),
            on: { tabChanged: (p) => this.handleTabChange(p) },
          }),

          // Conditional rendering: board or list view.
          this.activeTab === "board"
            ? kanbanBoard({
                data: () => ({ filter: this.filter }),
                on: { statusChange: (p) => this.handleStatusChange(p) },
              })
            : taskTable({
                data: () => ({ filter: this.filter }),
                on: { statusChange: (p) => this.handleStatusChange(p) },
              }),

          // Stats dashboard: always visible below board/list.
          // Independent scope so it doesn't re-render with filter changes above.
          statsDashboard({ data: () => ({ filter: this.filter }) }),

          div({ props: { className: "summary-section" } }, () => [
            div({ props: { className: "summary-item" } }, () => `Summary: ${this.projectSummary.summary}`),
            div({ props: { className: "summary-item" } }, () => `Avg Priority: ${this.projectSummary.avgPriority}`),
            div({ props: { className: "summary-item" } }, () => `Health: ${this.projectHealth ?? "Loading..."}`),
          ]),
        ]),

        // Sidebar: independent of main content reactive state.
        div({ props: { className: "sidebar" } }, () => [
          activityFeed({}),
          memberPresence({}),
        ]),
      ]),
    ]);
  }

  Bound(): void {
    super.Bound();
    // Initialize async service data — fire-and-forget is acceptable in Bound()
    // since the template handles undefined state gracefully. However, for
    // critical data, you should await: async Bound() { await service.init(); }
    this.projectService.init();
  }

  Destroy(): void {
    super.Destroy();
  }
}

// Attach the app.
const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));
