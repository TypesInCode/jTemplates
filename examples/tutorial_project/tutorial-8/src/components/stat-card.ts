import { Component } from "j-templates";
import { div, h2, button } from "j-templates/DOM";
import { Value, Scope, Inject, Destroy, Watch, Animation, AnimationType } from "j-templates/Utils";
import { ProjectService } from "../services/project-service";

interface StatCardData {
  label: string;
  statKey: keyof ReturnType<ProjectService["GetStats"]>;
  color: string;
}

interface StatCardEvents {
  clicked: { label: string };
}

class StatCard extends Component<StatCardData, void, StatCardEvents> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // @Value for primitive animated display value.
  @Value()
  displayValue = 0;

  // @Destroy ensures the Animation timer is cleaned up when component is destroyed.
  @Destroy()
  animator = new Animation(AnimationType.EaseIn, 600, (next: number) => {
    this.displayValue = Math.round(next);
  });

  // @Scope caches the current stat value — returns new reference on change,
  // which is fine for primitives.
  @Scope()
  get currentValue(): number {
    const stats = this.projectService.GetStats();
    return (stats[this.Data.statKey] as number) ?? 0;
  }

  // @Watch detects when the stat value changes and triggers animation.
  // Fires immediately with initial value when Bound() runs.
  @Watch((self) => self.currentValue)
  animateChange(newValue: number): void {
    this.animator.Animate(this.displayValue, newValue);
  }

  Template() {
    return div({
      props: () => ({
        className: "stat-card",
        style: `border-top: 3px solid ${this.Data.color}`,
      }),
      on: { click: () => this.Fire("clicked", { label: this.Data.label }) },
    }, () => [
      h2({ props: { className: "stat-value" } }, () => String(this.displayValue)),
      div({ props: { className: "stat-label" } }, () => this.Data.label),
    ]);
  }

  Bound(): void {
    super.Bound();
  }

  Destroy(): void {
    super.Destroy();
  }
}

export const statCard = Component.ToFunction("stat-card", StatCard);
