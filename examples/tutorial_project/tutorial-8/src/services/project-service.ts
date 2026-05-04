import { StoreAsync, ObservableScope } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils";
import { Task, Member, Activity, ProjectStats } from "../data/types";

// Service contract — abstract class defines the interface children depend on.
// Note: Destroy() is declared here so consumers know the service is cleanable.
export abstract class ProjectService implements IDestroyable {
  abstract GetTasks(): Task[];
  abstract GetMembers(): Member[];
  abstract GetActivities(): Activity[];
  abstract GetStats(): ProjectStats;
  abstract AddTask(task: Omit<Task, "id" | "createdAt">): Promise<void>;
  abstract UpdateTaskStatus(id: string, status: Task["status"]): Promise<void>;
  abstract Destroy(): void;
}

// Real implementation uses StoreAsync for off-main-thread diff computation.
export class RealProjectService extends ProjectService {
  private store = new StoreAsync((value: any) => value.id);

  // Derived stats computed from tasks — updates reactively when tasks change.
  private statsScope = ObservableScope.Create((): ProjectStats => {
    const tasks = this.store.Get<Task[]>("tasks", []);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const highPriority = tasks.filter((t) => t.priority === "high").length;
    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      todoTasks: todo,
      highPriorityCount: highPriority,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  async init(): Promise<void> {
    // Seed data — always await StoreAsync operations.
    await this.store.Write(
      [
        {
          id: "m1",
          name: "Alice Chen",
          role: "Lead",
          online: true,
          lastSeen: Date.now(),
        },
        {
          id: "m2",
          name: "Bob Park",
          role: "Developer",
          online: true,
          lastSeen: Date.now(),
        },
        {
          id: "m3",
          name: "Carol Diaz",
          role: "Designer",
          online: false,
          lastSeen: Date.now() - 3600000,
        },
        {
          id: "m4",
          name: "David Kim",
          role: "Developer",
          online: false,
          lastSeen: Date.now() - 7200000,
        },
        {
          id: "m5",
          name: "Stephen Spielberg",
          role: "PM",
          online: false,
          lastSeen: Date.now() - 7200000,
        },
        {
          id: "m6",
          name: "Carole Danvers",
          role: "Achitect",
          online: true,
          lastSeen: Date.now() - 7200000,
        },
      ],
      "members",
    );

    await this.store.Write(
      [
        {
          id: "t1",
          title: "Design system update",
          description: "Refresh color tokens and typography scale",
          status: "in-progress",
          priority: "high",
          assigneeId: "m3",
          projectId: "p1",
          createdAt: Date.now() - 86400000,
        },
        {
          id: "t2",
          title: "API rate limiting",
          description: "Implement token bucket rate limiter on auth endpoints",
          status: "todo",
          priority: "high",
          assigneeId: "m2",
          projectId: "p1",
          createdAt: Date.now() - 72000000,
        },
        {
          id: "t3",
          title: "Unit test coverage",
          description: "Bring auth module coverage above 80%",
          status: "todo",
          priority: "medium",
          assigneeId: "m1",
          projectId: "p1",
          createdAt: Date.now() - 50000000,
        },
        {
          id: "t4",
          title: "Dashboard analytics",
          description: "Add real-time visitor metrics chart",
          status: "in-progress",
          priority: "medium",
          assigneeId: "m4",
          projectId: "p1",
          createdAt: Date.now() - 36000000,
        },
        {
          id: "t5",
          title: "Fix login redirect",
          description: "Users redirected to 404 after SSO login on Safari",
          status: "done",
          priority: "high",
          assigneeId: "m2",
          projectId: "p1",
          createdAt: Date.now() - 100000000,
        },
        {
          id: "t6",
          title: "Update README",
          description: "Add setup instructions for new contributors",
          status: "done",
          priority: "low",
          assigneeId: "m1",
          projectId: "p1",
          createdAt: Date.now() - 120000000,
        },
        {
          id: "t7",
          title: "Performance audit",
          description: "Run Lighthouse CI and fix critical issues",
          status: "todo",
          priority: "medium",
          assigneeId: null,
          projectId: "p1",
          createdAt: Date.now() - 20000000,
        },
        {
          id: "t8",
          title: "Accessibility review",
          description: "WCAG 2.1 AA compliance check on forms",
          status: "todo",
          priority: "low",
          assigneeId: "m3",
          projectId: "p1",
          createdAt: Date.now() - 10000000,
        },
      ],
      "tasks",
    );

    await this.store.Write(
      [
        {
          id: "a1",
          type: "task-created",
          actorId: "m1",
          description: "Alice created Fix login redirect",
          timestamp: Date.now() - 100000000,
          projectId: "p1",
        },
        {
          id: "a2",
          type: "task-completed",
          actorId: "m2",
          description: "Bob completed Fix login redirect",
          timestamp: Date.now() - 90000000,
          projectId: "p1",
        },
        {
          id: "a3",
          type: "task-created",
          actorId: "m3",
          description: "Carol created Design system update",
          timestamp: Date.now() - 86400000,
          projectId: "p1",
        },
        {
          id: "a4",
          type: "task-updated",
          actorId: "m2",
          description: "Bob started working on API rate limiting",
          timestamp: Date.now() - 72000000,
          projectId: "p1",
        },
        {
          id: "a5",
          type: "member-joined",
          actorId: "m4",
          description: "David joined the project",
          timestamp: Date.now() - 50000000,
          projectId: "p1",
        },
        {
          id: "a6",
          type: "task-updated",
          actorId: "m4",
          description: "David started working on Dashboard analytics",
          timestamp: Date.now() - 36000000,
          projectId: "p1",
        },
        {
          id: "a7",
          type: "task-created",
          actorId: "m1",
          description: "Alice created Performance audit",
          timestamp: Date.now() - 20000000,
          projectId: "p1",
        },
      ],
      "activities",
    );
  }

  GetTasks(): Task[] {
    return this.store.Get<Task[]>("tasks", []);
  }

  GetMembers(): Member[] {
    return this.store.Get<Member[]>("members", []);
  }

  GetActivities(): Activity[] {
    return this.store.Get<Activity[]>("activities", []);
  }

  GetStats(): ProjectStats {
    return ObservableScope.Value(this.statsScope);
  }

  async AddTask(task: Omit<Task, "id" | "createdAt">): Promise<void> {
    const newTask: Task = {
      ...task,
      id: `t${Date.now()}`,
      createdAt: Date.now(),
    };
    await this.store.Push("tasks", newTask);
    await this.store.Push("activities", {
      id: `a${Date.now()}`,
      type: "task-created",
      actorId: "m1",
      description: `New task created: ${newTask.title}`,
      timestamp: Date.now(),
      projectId: task.projectId,
    });
  }

  async UpdateTaskStatus(id: string, status: Task["status"]): Promise<void> {
    const tasks = this.store.Get<Task[]>("tasks", []);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updated = { ...task, status };
    await this.store.Write(updated);

    const type =
      status === "done" ? "task-completed" : ("task-updated" as const);
    await this.store.Push("activities", {
      id: `a${Date.now()}`,
      type,
      actorId: "m1",
      description: `Task "${task.title}" moved to ${status}`,
      timestamp: Date.now(),
      projectId: task.projectId,
    });
  }

  Destroy(): void {
    this.store.Destroy();
    ObservableScope.Destroy(this.statsScope);
  }
}

// Mock implementation for offline/demo use.
export class MockProjectService extends ProjectService {
  private tasks: Task[] = [];
  private members: Member[] = [];
  private activities: Activity[] = [];

  private statsScope = ObservableScope.Create((): ProjectStats => {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.status === "done").length;
    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: this.tasks.filter((t) => t.status === "in-progress")
        .length,
      todoTasks: this.tasks.filter((t) => t.status === "todo").length,
      highPriorityCount: this.tasks.filter((t) => t.priority === "high").length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  GetTasks(): Task[] {
    return this.tasks;
  }
  GetMembers(): Member[] {
    return this.members;
  }
  GetActivities(): Activity[] {
    return this.activities;
  }
  GetStats(): ProjectStats {
    return ObservableScope.Value(this.statsScope);
  }

  async AddTask(task: Omit<Task, "id" | "createdAt">): Promise<void> {
    this.tasks.push({ ...task, id: `t${Date.now()}`, createdAt: Date.now() });
  }

  async UpdateTaskStatus(id: string, status: Task["status"]): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.status = status;
  }

  Destroy(): void {
    ObservableScope.Destroy(this.statsScope);
  }
}
