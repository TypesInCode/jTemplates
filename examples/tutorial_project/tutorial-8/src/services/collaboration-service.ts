import { ObservableNode, ObservableScope } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils";
import { Member } from "../data/types";

// Service contract for collaboration/presence features.
export abstract class CollaborationService implements IDestroyable {
  abstract GetOnlineMembers(): Member[];
  abstract GetMemberPresence(memberId: string): boolean;
  abstract Destroy(): void;
}

// Real implementation simulates presence with ObservableScope signaling.
export class RealCollaborationService extends CollaborationService {
  private tick = ObservableNode.Create({ value: 0 });

  // Simulated online state — toggles periodically to demonstrate reactivity.
  private _onlineIds = new Set<string>(["m1", "m2"]);

  private onlineIdsScope = ObservableScope.Create(() => {
    this.tick.value;
    return this._onlineIds;
  });

  private onlineTickTimeout = setInterval(() => this.refreshPresence(), 30000);

  get onlineIds() {
    return ObservableScope.Value(this.onlineIdsScope);
  }

  get onlineMembers() {
    return this.allMembers().filter((member) => this.onlineIds.has(member.id));
  }

  constructor(private readonly allMembers: () => Member[]) {
    super();
  }

  GetOnlineMembers(): Member[] {
    return this.onlineMembers;
  }

  GetMemberPresence(memberId: string): boolean {
    return this.onlineIds.has(memberId);
  }

  Destroy(): void {
    ObservableScope.Destroy(this.onlineIdsScope);
    clearInterval(this.onlineTickTimeout);
  }

  // Trigger a presence refresh — used by @Watch in member-presence component.
  private refreshPresence() {
    // Simulate members coming online/offline.
    const members = this.allMembers();
    members.forEach((m) => {
      if (Math.random() > 0.6) {
        this.onlineIds.add(m.id);
      } else {
        this.onlineIds.delete(m.id);
      }
    });
    this.tick.value++;
  }
}

// Mock implementation for testing.
export class MockCollaborationService extends CollaborationService {
  private online = new Set<string>(["m1", "m2"]);

  GetOnlineMembers(): Member[] {
    return [];
  }
  GetMemberPresence(_memberId: string): boolean {
    return false;
  }
  refreshPresence(): void {}
  Destroy(): void {}
}
