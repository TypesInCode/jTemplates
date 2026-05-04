import { Component, peek, scope } from "j-templates";
import { div, h1, span, small } from "j-templates/DOM";
import { ProjectService } from "../services/project-service";
import { Inject, Scope } from "j-templates/Utils";

interface ProjectHeaderData {
  title: string;
  subtitle: string;
}

class ProjectHeader extends Component<ProjectHeaderData> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  // @Scope + scope(async) pattern: async data fetching.
  // scope() only works inside a watch context — the @Scope getter provides that context.
  // The async function reads reactive values before the first await.
  // scope() creates an inline computed scope that resolves the Promise
  // and emits the resolved string value, not the Promise itself.
  @Scope()
  get avatarUrl(): string {
    return scope(async () => {
      const members = this.projectService.GetMembers();
      const lead = members.find(m => m.role === "Lead");
      if (!lead) return "";
      // Simulate async avatar fetch — reactive reads must come before await.
      await new Promise(resolve => setTimeout(resolve, 100));
      return `https://api.example.com/avatar/${lead.id}`;
    });
  }

  Template() {
    return div({ props: { className: "project-header" } }, () => [
      h1({}, () => this.Data.title),
      div({ props: { className: "header-meta" } }, () => [
        // peek() reads the current timestamp without subscribing to changes.
        // This is useful for display-only values that don't need to drive reactivity.
        span({}, () => `Last updated: ${peek(() => new Date().toLocaleTimeString())}`),
        // The @Scope getter already caches and gates the async value.
        // Reading this.avatarUrl directly is sufficient — no need for gate().
        small({}, () => this.avatarUrl ? `Lead avatar: ${this.avatarUrl}` : "Loading lead..."),
      ]),
    ]);
  }
}

export const projectHeader = Component.ToFunction("project-header", ProjectHeader);
