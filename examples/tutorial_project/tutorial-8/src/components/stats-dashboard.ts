import { Component } from "j-templates";
import { div, span, table, thead, tbody, tr, th, td } from "j-templates/DOM";
import { Inject, Computed } from "j-templates/Utils";
import { Task, Member } from "../data/types";
import { ProjectService } from "../services/project-service";

interface StatsDashboardData {
  filter: {
    priority: string | null;
    search: string;
  };
}

class StatsDashboard extends Component<StatsDashboardData, void, void> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // Each section has its own @Computed so changes only re-render the
  // affected section. @Computed preserves object identity via ApplyDiff,
  // preventing unnecessary Template re-runs when values haven't changed.

  // Completion overview — @Computed for reference stability.
  @Computed()
  get completionStats(): { total: number; done: number; completionRate: number } {
    const tasks = this.projectService.GetTasks();
    const { priority, search } = this.Data.filter;
    const filtered = tasks.filter(task => {
      if (priority && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const total = filtered.length;
    const done = filtered.filter(t => t.status === "done").length;
    return {
      total,
      done,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  // Priority breakdown — @Computed preserves array identity via ApplyDiff.
  @Computed()
  get priorityBreakdown(): { label: string; count: number; color: string; barWidth: number }[] {
    const tasks = this.projectService.GetTasks();
    const { priority, search } = this.Data.filter;
    const filtered = tasks.filter(task => {
      if (priority && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const total = filtered.length || 1;
    return [
      { label: "High", count: filtered.filter(t => t.priority === "high").length, color: "#e74c3c", barWidth: Math.round(filtered.filter(t => t.priority === "high").length / total * 100) },
      { label: "Medium", count: filtered.filter(t => t.priority === "medium").length, color: "#f39c12", barWidth: Math.round(filtered.filter(t => t.priority === "medium").length / total * 100) },
      { label: "Low", count: filtered.filter(t => t.priority === "low").length, color: "#95a5a6", barWidth: Math.round(filtered.filter(t => t.priority === "low").length / total * 100) },
    ];
  }

  // Status breakdown — @Computed preserves array identity via ApplyDiff.
  @Computed()
  get statusBreakdown(): { label: string; count: number; color: string; barWidth: number }[] {
    const tasks = this.projectService.GetTasks();
    const { priority, search } = this.Data.filter;
    const filtered = tasks.filter(task => {
      if (priority && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const total = filtered.length || 1;
    return [
      { label: "Done", count: filtered.filter(t => t.status === "done").length, color: "#2ecc71", barWidth: Math.round(filtered.filter(t => t.status === "done").length / total * 100) },
      { label: "In Progress", count: filtered.filter(t => t.status === "in-progress").length, color: "#3498db", barWidth: Math.round(filtered.filter(t => t.status === "in-progress").length / total * 100) },
      { label: "Todo", count: filtered.filter(t => t.status === "todo").length, color: "#95a5a6", barWidth: Math.round(filtered.filter(t => t.status === "todo").length / total * 100) },
    ];
  }

  // Per-member stats — @Computed preserves array identity via ApplyDiff.
  @Computed()
  get memberStats(): { member: Member; total: number; done: number; inProgress: number; todo: number; completionRate: number }[] {
    const tasks = this.projectService.GetTasks();
    const { priority, search } = this.Data.filter;
    const filtered = tasks.filter(task => {
      if (priority && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const members = this.projectService.GetMembers();
    return members.map(member => {
      const memberTasks = filtered.filter(t => t.assigneeId === member.id);
      const total = memberTasks.length;
      const done = memberTasks.filter(t => t.status === "done").length;
      const inProgress = memberTasks.filter(t => t.status === "in-progress").length;
      const todo = memberTasks.filter(t => t.status === "todo").length;
      return {
        member,
        total,
        done,
        inProgress,
        todo,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }

  Template() {
    return div({ props: { className: "stats-dashboard" } }, () => [
      // Completion overview — reads @Computed directly in section (like kanban columns).
      div({ props: { className: "stats-section" } }, () => {
        const comp = this.completionStats;
        return [
          span({ props: { className: "section-title" } }, () => "Completion"),
          div({ props: { className: "completion-ring" } }, () => [
            span({ props: { className: "completion-rate" } }, () => `${comp.completionRate}%`),
            span({ props: { className: "completion-subtitle" } }, () => `${comp.done} of ${comp.total} tasks done`),
          ]),
          div({ props: { className: "completion-bar-track" } }, () =>
            div({
              props: {
                className: "completion-bar-fill",
                style: `width: ${comp.completionRate}%;`,
              },
            })
          ),
        ];
      }),

      // Priority breakdown — @Computed data: binding.
      div({ props: { className: "stats-section" } }, () => [
        span({ props: { className: "section-title" } }, () => "Priority Breakdown"),
        div({
          props: { className: "breakdown-list" },
          data: () => this.priorityBreakdown,
        }, (item: { label: string; count: number; color: string; barWidth: number }) =>
          div({ props: { className: "breakdown-row" } }, () => [
            span({ props: { className: "breakdown-label" } }, () => item.label),
            div({ props: { className: "breakdown-bar-track" } }, () =>
              div({
                props: {
                  className: "breakdown-bar-fill",
                  style: `width: ${item.barWidth}%; background: ${item.color};`,
                },
              })
            ),
            span({ props: { className: "breakdown-count" } }, () => String(item.count)),
          ])
        ),
      ]),

      // Status breakdown — @Computed data: binding.
      div({ props: { className: "stats-section" } }, () => [
        span({ props: { className: "section-title" } }, () => "Status Breakdown"),
        div({
          props: { className: "breakdown-list" },
          data: () => this.statusBreakdown,
        }, (item: { label: string; count: number; color: string; barWidth: number }) =>
          div({ props: { className: "breakdown-row" } }, () => [
            span({ props: { className: "breakdown-label" } }, () => item.label),
            div({ props: { className: "breakdown-bar-track" } }, () =>
              div({
                props: {
                  className: "breakdown-bar-fill",
                  style: `width: ${item.barWidth}%; background: ${item.color};`,
                },
              })
            ),
            span({ props: { className: "breakdown-count" } }, () => String(item.count)),
          ])
        ),
      ]),

      // Per-member stats — @Computed data: binding.
      div({ props: { className: "stats-section" } }, () => [
        span({ props: { className: "section-title" } }, () => "Per-Member Workload"),
        table({ props: { className: "stats-table" } }, () => [
          thead({}, () =>
            tr({}, () => [
              th({}, () => "Member"),
              th({}, () => "Role"),
              th({}, () => "Total"),
              th({}, () => "Done"),
              th({}, () => "In Progress"),
              th({}, () => "Todo"),
              th({}, () => "Rate"),
            ])
          ),
          tbody({
            data: () => this.memberStats,
          }, (stat: { member: Member; total: number; done: number; inProgress: number; todo: number; completionRate: number }) =>
            tr({}, () => [
              td({}, () => stat.member.name),
              td({}, () => stat.member.role),
              td({}, () => String(stat.total)),
              td({ props: { className: "stat-done" } }, () => String(stat.done)),
              td({ props: { className: "stat-inprogress" } }, () => String(stat.inProgress)),
              td({ props: { className: "stat-todo" } }, () => String(stat.todo)),
              td({}, () => `${stat.completionRate}%`),
            ])
          ),
        ]),
      ]),
    ]);
  }
}

export const statsDashboard = Component.ToFunction("stats-dashboard", StatsDashboard);
