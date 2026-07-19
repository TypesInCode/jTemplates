import { Component } from "j-templates";
import { Scope, Computed } from "j-templates/Utils";
import { div, span } from "j-templates/DOM";
import { Task } from "./types";

interface StatsBarData {
  tasks: Task[];
}

class StatsBar extends Component<StatsBarData> {
  @Scope()
  get total(): number {
    return this.Data.tasks.length;
  }

  @Scope()
  get activeCount(): number {
    return this.Data.tasks.filter((t) => !t.completed).length;
  }

  @Scope()
  get completedCount(): number {
    return this.Data.tasks.filter((t) => t.completed).length;
  }

  @Computed()
  get summary(): {
    active: number;
    completed: number;
    total: number;
    pct: string;
  } {
    const t = this.total;
    const c = this.completedCount;
    return {
      total: t,
      active: this.activeCount,
      completed: c,
      pct: t === 0 ? "0%" : `${Math.round((c / t) * 100)}%`,
    };
  }

  Template() {
    return div({ props: { className: "stats-bar" } }, () => [
      span({}, () => `${this.activeCount} active`),
      span({}, () => `${this.completedCount} completed`),
      span({}, () => `${this.summary.pct} done`),
    ]);
  }
}

const statsBar = Component.ToFunction("stats-bar", StatsBar);

export { statsBar };
