import { useQuery } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";
import type { TaskPriority, TaskStatus } from "./useTasks";

export interface NotificationTask {
  id: string;
  title: string;
  goal_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface ActiveGoalNotification {
  goal_id: string;
  goal_title: string;
  timeline: "WEEKLY" | "MONTHLY";
  period: string;
  progress: number;
  days_remaining: number;
}

export interface TaskNotificationsResponse {
  overdue: NotificationTask[];
  due_today: NotificationTask[];
  due_soon: NotificationTask[];
  active_goals: ActiveGoalNotification[];
  total: number;
}

export function useTaskNotifications(enabled = true) {
  return useQuery<TaskNotificationsResponse>({
    queryKey: ["task-notifications"],
    queryFn: () => api.get("/notifications").then((r: AxiosResponse) => r.data),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
