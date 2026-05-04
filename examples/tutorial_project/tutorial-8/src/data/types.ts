export interface Member {
  id: string;
  name: string;
  role: string;
  online: boolean;
  lastSeen: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assigneeId: string | null;
  projectId: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  type: "task-created" | "task-updated" | "task-completed" | "member-joined" | "comment-added";
  actorId: string;
  description: string;
  timestamp: number;
  projectId: string;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  highPriorityCount: number;
  completionRate: number;
}

export interface TaskFilter {
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  search: string;
}
