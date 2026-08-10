import { Component } from "j-templates";
import { div, span, ul, li } from "j-templates/DOM";
import { Inject, Destroy, Watch } from "j-templates/Utils";
import { Member } from "../data/types";
import { CollaborationService } from "../services/collaboration-service";
import { ProjectService } from "../services/project-service";

class MemberPresence extends Component<void, void, void> {
  @Inject(ProjectService)
  projectService!: ProjectService;

  @Inject(CollaborationService)
  collaborationService!: CollaborationService;

  // @Watch detects when online members change — useful for triggering side effects
  // like updating a notification badge or logging presence changes.
  @Watch((self) => self.collaborationService.GetOnlineMembers())
  onPresenceChange(onlineMembers: Member[]): void {
    // Side effect: could log, update analytics, etc.
    // The handler fires immediately with current value when Bound() runs,
    // then on each change. Uses greedy (batched) scope internally.
    console.log("Online members", onlineMembers);
  }

  get Members() {
    return this.projectService
      .GetMembers()
      .slice()
      .sort((a, b) => {
        const aPresence = this.collaborationService.GetMemberPresence(a.id);
        const bPresence = this.collaborationService.GetMemberPresence(b.id);

        if (aPresence !== bPresence) return aPresence ? -1 : 1;

        return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
      });
  }

  Template() {
    return div({ props: { className: "member-presence" } }, () => [
      span({ props: { className: "presence-title" } }, () => "Team Presence"),
      ul(
        {
          props: { className: "member-list" },
          data: () => this.Members,
        },
        (member: Member) =>
          li(
            {
              props: () => ({
                className: `member-item ${this.collaborationService.GetMemberPresence(member.id) ? "online" : "offline"}`,
              }),
            },
            () => [
              span({
                props: () => ({
                  className: "presence-dot",
                  style: `background: ${this.collaborationService.GetMemberPresence(member.id) ? "#2ecc71" : "#95a5a6"};`,
                }),
              }),
              span({ props: { className: "member-name" } }, () => member.name),
              span({ props: { className: "member-role" } }, () => member.role),
            ],
          ),
      ),
    ]);
  }

  Destroy(): void {
    super.Destroy();
  }
}

export const memberPresence = Component.ToFunction(
  "member-presence",
  MemberPresence,
);
