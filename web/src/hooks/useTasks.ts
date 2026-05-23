import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { api } from "@/lib/api";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface Task {
  id: string;
  goal_id: string | null;
  parent_id: string | null;
  title: string;
  priority: TaskPriority;
  completion_type: "CHECKBOX" | "PERCENTAGE";
  completed_value: number | null;
  status: TaskStatus;
  notes: string | null;
  due_date: string | null;
  order: number;
  created_at: string;
  subtasks: Task[];
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  timeline: "DAILY" | "WEEKLY" | "MONTHLY";
  period: string;
  target_value: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "ARCHIVED";
  created_at: string;
  progress: number;
  task_count: number;
  completed_task_count: number;
  tasks: Task[];
}

export interface Streak {
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  current: number;
  longest: number;
  last_success: string | null;
}

// Goals
export function useGoals(timeline: string, period: string, options?: { enabled?: boolean }) {
  return useQuery<Goal[]>({
    queryKey: ["goals", timeline, period],
    queryFn: () =>
      api.get(`/goals?timeline=${timeline}&period=${period}`).then((r: AxiosResponse) => r.data),
    enabled: options?.enabled ?? true,
  });
}

export function useGoal(id: string) {
  return useQuery<Goal>({
    queryKey: ["goal", id],
    queryFn: () => api.get(`/goals/${id}`).then((r: AxiosResponse) => r.data),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      timeline: string;
      period: string;
      target_value?: number;
    }) => api.post("/goals", data).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; description?: string; status?: string }) =>
      api.put(`/goals/${goalId}`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goal", goalId] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.delete(`/goals/${goalId}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      qc.invalidateQueries({ queryKey: ["streak-history"] });
    },
  });
}

// Tasks
export function useDailyTasks(period: string) {
  return useQuery<Task[]>({
    queryKey: ["daily-tasks", period],
    queryFn: () =>
      api.get(`/tasks?period=${period}`).then((r: AxiosResponse) => r.data),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      goal_id?: string;
      parent_id?: string;
      title: string;
      completion_type?: "CHECKBOX" | "PERCENTAGE";
      due_date?: string;
      order?: number;
    }) => api.post("/tasks", data).then((r: AxiosResponse) => r.data),
    onSuccess: (_data, vars) => {
      if (vars.goal_id) qc.invalidateQueries({ queryKey: ["goal", vars.goal_id] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
    },
  });
}

export function useCompleteTask(goalId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, completed_value }: { taskId: string; completed_value: number | null }) =>
      api.patch(`/tasks/${taskId}/complete`, { completed_value }).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      if (goalId) qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
    },
  });
}

export function useUpdateTask(goalId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string;
      title?: string;
      notes?: string | null;
      status?: TaskStatus;
      order?: number;
    }) => api.patch(`/tasks/${taskId}`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      if (goalId) qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
    },
  });
}

export function useDeleteTask(goalId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      if (goalId) qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      qc.invalidateQueries({ queryKey: ["streak-history"] });
    },
  });
}

// AI
export interface BreakdownTask {
  title: string;
  priority: string;
  description?: string | null;
}

export interface BreakdownResponse {
  tasks: BreakdownTask[];
}

export interface AISummaryContent {
  summary: string;
  score: number;
  strengths: string[];
  improvements: string[];
  next_suggestions: string[];
}

export interface AISummary {
  id: string;
  goal_id: string;
  content: AISummaryContent;
  created_at: string;
}

export interface JobStatus {
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
  result?: AISummaryContent;
}

export function useAIDailyBreakdown() {
  return useMutation<BreakdownResponse, Error, { period: string; title: string; detail?: string; refinement?: string }>({
    mutationFn: (data) => api.post("/ai/daily/breakdown", data).then((r: AxiosResponse) => r.data),
  });
}

export function useConfirmDailyTasks() {
  const qc = useQueryClient();
  return useMutation<BreakdownResponse, Error, { period: string; tasks: BreakdownTask[] }>({
    mutationFn: (data) => api.post("/ai/daily/confirm", data).then((r: AxiosResponse) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["daily-tasks", vars.period] });
    },
  });
}

export function useAIBreakdown(goalId: string) {
  return useMutation<BreakdownResponse, Error, { refinement?: string } | undefined>({
    mutationFn: (data) =>
      api.post(`/ai/goals/${goalId}/breakdown`, data ?? {}).then((r: AxiosResponse) => r.data),
  });
}

export function useConfirmGoalTasks(goalId: string) {
  const qc = useQueryClient();
  return useMutation<BreakdownResponse, Error, { tasks: BreakdownTask[] }>({
    mutationFn: (data) =>
      api.post(`/ai/goals/${goalId}/confirm`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useTriggerSummary(goalId: string) {
  return useMutation<{ job_id: string }>({
    mutationFn: () => api.post(`/ai/goals/${goalId}/summarize`).then((r: AxiosResponse) => r.data),
  });
}

export function useJobStatus(jobId: string | null) {
  return useQuery<JobStatus>({
    queryKey: ["job", jobId],
    queryFn: () => api.get(`/ai/jobs/${jobId}`).then((r: AxiosResponse) => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "SUCCESS" || data?.status === "FAILURE") return false;
      return 2000;
    },
  });
}

export function useGoalAISummary(goalId: string) {
  return useQuery<AISummary | null>({
    queryKey: ["ai-summary", goalId],
    queryFn: () => api.get(`/ai/goals/${goalId}/summary`).then((r: AxiosResponse) => r.data),
  });
}

// Rollover
export interface RolloverPreviewTask {
  id: string;
  title: string;
  priority: TaskPriority;
}

export interface RolloverPreviewGoal {
  goal_id: string;
  goal_title: string;
  tasks: RolloverPreviewTask[];
}

export function useRolloverPreview(timeline: string, period: string, enabled = true) {
  return useQuery<RolloverPreviewGoal[]>({
    queryKey: ["rollover-preview", timeline, period],
    queryFn: () =>
      api
        .get(`/goals/rollover-preview?timeline=${timeline}&period=${period}`)
        .then((r: AxiosResponse) => r.data),
    enabled,
  });
}

export function useRolloverGoalTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      timeline: string;
      to_period: string;
      task_ids: string[];
      to_goal_id?: string;
    }) => api.post("/goals/rollover", data).then((r: AxiosResponse) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["rollover-preview"] });
      if (vars.to_goal_id) qc.invalidateQueries({ queryKey: ["goal", vars.to_goal_id] });
    },
  });
}

// Streaks
export function useStreaks() {
  return useQuery<Streak[]>({
    queryKey: ["streaks"],
    queryFn: () => api.get("/streaks").then((r: AxiosResponse) => r.data),
  });
}

export function useStreakHistory(timeline: string) {
  return useQuery<string[]>({
    queryKey: ["streak-history", timeline],
    queryFn: () =>
      api.get(`/streaks/history?timeline=${timeline}`).then((r: AxiosResponse) => r.data),
  });
}
