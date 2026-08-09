import { Component } from "j-templates";
import { Scope, Computed } from "j-templates/Utils";
import { div, span } from "j-templates/DOM";
import { Task } from "./types";
import "./stats-bar.scss";

export interface StatsBarData {
  tasks: Task[];
}

class StatsBar extends Component<StatsBarData> {
  // @Scope — cheap derived values, new reference each update.
  @Scope() get total(): number {
    return this.Data.tasks.length;
  }
  @Scope() get activeCount(): number {
    return this.Data.tasks.filter((t) => !t.completed).length;
  }
  @Scope() get completedCount(): number {
    return this.Data.tasks.filter((t) => t.completed).length;
  }

  // @Computed — composite object, SAME reference preserved via ApplyDiff.
  @Computed()
  get summary(): { active: number; completed: number; total: number; pct: string } {
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
      div({ props: { className: "stats-bar__stat" } }, () => [
        span({ props: { className: "stats-bar__value" } }, () => `${this.activeCount}`),
        span({ props: { className: "stats-bar__label" } }, () => "active"),
      ]),
      div({ props: { className: "stats-bar__stat" } }, () => [
        span({ props: { className: "stats-bar__value" } }, () => `${this.completedCount}`),
        span({ props: { className: "stats-bar__label" } }, () => "completed"),
      ]),
      div({ props: { className: "stats-bar__stat" } }, () => [
        span({ props: { className: "stats-bar__value" } }, () => `${this.summary.pct}`),
        span({ props: { className: "stats-bar__label" } }, () => "done"),
      ]),
    ]);
  }
}

const statsBar = Component.ToFunction("stats-bar", StatsBar);
export { statsBar };
