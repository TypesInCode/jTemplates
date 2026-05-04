import { Component } from "j-templates";
import { div, ul, li, span, small } from "j-templates/DOM";
import { Inject, Computed } from "j-templates/Utils";
import { Activity } from "../data/types";
import { ProjectService } from "../services/project-service";

// @Computed preserves object identity — the same object reference is returned
// when the structure hasn't changed. This is critical for downstream consumers
// that depend on reference stability (===) to avoid unnecessary re-renders.
interface GroupedActivities {
  today: Activity[];
  earlier: Activity[];
  total: number;
}

class ActivityFeed extends Component<void, void, void> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // @Computed creates a new object but preserves identity via ApplyDiff.
  // Downstream scopes only re-evaluate when the grouped structure actually changes.
  @Computed()
  get grouped(): GroupedActivities {
    const activities = this.projectService.GetActivities();
    const today = Date.now() - 86400000;
    return {
      today: activities.filter((a) => a.timestamp >= today),
      earlier: activities.filter((a) => a.timestamp < today),
      total: activities.length,
    };
  }

  private activityIcons: Record<Activity["type"], string> = {
    "task-created": "+",
    "task-updated": "~",
    "task-completed": "✓",
    "member-joined": "★",
    "comment-added": "💬",
  };

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  Template() {
    const grouped = this.grouped;

    const renderActivity = (activity: Activity) =>
      li({ props: { className: "activity-item" } }, () => [
        span(
          { props: { className: "activity-icon" } },
          () => this.activityIcons[activity.type],
        ),
        span(
          { props: { className: "activity-description" } },
          () => activity.description,
        ),
        small({ props: { className: "activity-time" } }, () =>
          this.formatTime(activity.timestamp),
        ),
      ]);

    return div({ props: { className: "activity-feed" } }, () => [
      div({ props: { className: "feed-section" } }, () => [
        span(
          { props: { className: "section-title" } },
          () => `Today (${grouped.today.length})`,
        ),
        ul(
          {
            props: { className: "activity-list" },
            data: () => grouped.today,
          },
          renderActivity,
        ),
      ]),
      div({ props: { className: "feed-section" } }, () => [
        span(
          { props: { className: "section-title" } },
          () => `Earlier (${grouped.earlier.length})`,
        ),
        ul(
          {
            props: { className: "activity-list" },
            data: () => grouped.earlier,
          },
          renderActivity,
        ),
      ]),
    ]);
  }
}

export const activityFeed = Component.ToFunction("activity-feed", ActivityFeed);
