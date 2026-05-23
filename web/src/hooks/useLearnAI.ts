import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIConfig {
  ai_enabled: boolean;
  daily_count: number;
  topics: string[];
  difficulty: string;
  last_generated_at: string | null;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string;
}

export interface SubjectQuiz {
  id: string;
  subject_mod_id: string;
  questions: { items: QuizQuestion[] };
  answers: Record<string, string> | null;
  score: number | null;
  ai_feedback: {
    score: number;
    correct: number;
    total: number;
    summary: string;
    strong_areas: string[];
    weak_areas: string[];
    next_plan: string;
    per_question: { id: number; correct: boolean; note: string }[];
  } | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  created_at: string;
}

// ── AI Config ─────────────────────────────────────────────────────────────────

export function useAIConfig(subjectId: string, moduleId: string) {
  return useQuery<AIConfig>({
    queryKey: ["ai-config", subjectId, moduleId],
    queryFn: () =>
      api
        .get(`/learn/subjects/${subjectId}/modules/${moduleId}/ai/config`)
        .then((r: AxiosResponse) => r.data),
    enabled: !!subjectId && !!moduleId,
  });
}

export function useUpdateAIConfig(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation<AIConfig, unknown, Partial<AIConfig>>({
    mutationFn: (data) =>
      api
        .patch(`/learn/subjects/${subjectId}/modules/${moduleId}/ai/config`, data)
        .then((r: AxiosResponse) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["ai-config", subjectId, moduleId] }),
  });
}

// ── AI Generate / Confirm ────────────────────────────────────────────────────

export function useAIGenerate(subjectId: string, moduleId: string) {
  return useMutation<{ items: Record<string, unknown>[]; block_type: string }>({
    mutationFn: () =>
      api
        .post(`/learn/subjects/${subjectId}/modules/${moduleId}/ai/generate`)
        .then((r: AxiosResponse) => r.data),
  });
}

export function useAIConfirm(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, unknown, Record<string, unknown>[]>({
    mutationFn: (items) =>
      api
        .post(`/learn/subjects/${subjectId}/modules/${moduleId}/ai/confirm`, { items })
        .then((r: AxiosResponse) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["module-items", subjectId, moduleId] }),
  });
}

// ── Quiz ─────────────────────────────────────────────────────────────────────

export function useAIGenerateQuiz(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation<SubjectQuiz>({
    mutationFn: () =>
      api
        .post(`/learn/subjects/${subjectId}/modules/${moduleId}/ai/quiz`, {})
        .then((r: AxiosResponse) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["quizzes", subjectId, moduleId] }),
  });
}

export function useQuizzes(subjectId: string, moduleId: string) {
  return useQuery<SubjectQuiz[]>({
    queryKey: ["quizzes", subjectId, moduleId],
    queryFn: () =>
      api
        .get(`/learn/subjects/${subjectId}/modules/${moduleId}/quizzes`)
        .then((r: AxiosResponse) => r.data),
    enabled: !!subjectId && !!moduleId,
  });
}

export function useSubmitQuiz(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation<
    SubjectQuiz,
    unknown,
    { quiz_id: string; answers: Record<string, string> }
  >({
    mutationFn: ({ quiz_id, answers }) =>
      api
        .post(
          `/learn/subjects/${subjectId}/modules/${moduleId}/quizzes/${quiz_id}/submit`,
          { quiz_id, answers }
        )
        .then((r: AxiosResponse) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["quizzes", subjectId, moduleId] }),
  });
}
