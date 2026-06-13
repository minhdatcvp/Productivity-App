import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type BlockType = "FLASHCARD" | "VOCABULARY" | "NOTES" | "CODE_SNIPPET" | "QUIZ" | "EXERCISE";
export type QuizStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface CatalogBlock {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  icon: string;
  block_type: BlockType;
  is_system: boolean;
  created_at: string;
}

export interface TemplateBlock {
  id: string;
  block_id: string;
  block: CatalogBlock;
  order: number;
}

export interface LearningTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  template_blocks: TemplateBlock[];
}

export interface SubjectModule {
  id: string;
  subject_id: string;
  block_id: string;
  block: CatalogBlock;
  order: number;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  modules: SubjectModule[];
}

export interface FlashCard {
  id: string;
  subject_mod_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_review: string | null;
}

export interface VocabItem {
  id: string;
  subject_mod_id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  tags: string[];
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_review: string | null;
}

export interface Note {
  id: string;
  subject_mod_id: string;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
}

export interface CodeSnippet {
  id: string;
  subject_mod_id: string;
  title: string;
  language: string;
  code: string;
  explanation: string | null;
  tags: string[];
}

export interface BlockSuggestion {
  name: string;
  block_type: BlockType;
  description: string;
  icon: string;
  is_duplicate: boolean;
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export function useCatalogBlocks() {
  return useQuery<CatalogBlock[]>({
    queryKey: ["catalog"],
    queryFn: () => api.get("/settings/catalog").then((r: AxiosResponse) => r.data),
  });
}

export function useSuggestBlocks() {
  return useMutation<{ suggestions: BlockSuggestion[] }, unknown, string>({
    mutationFn: (query: string) =>
      api.post("/settings/catalog/suggest", { query }).then((r: AxiosResponse) => r.data),
  });
}

export function useCreateCatalogBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blocks: { name: string; description: string; icon: string; block_type: BlockType }[]) =>
      api.post("/settings/catalog", blocks).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useDeleteCatalogBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/settings/catalog/${id}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function useSuggestTemplateBlocks() {
  return useMutation<{ block_ids: string[] }, unknown, string>({
    mutationFn: (query: string) =>
      api.post("/templates/suggest", { query }).then((r: AxiosResponse) => r.data),
  });
}

export function useTemplates() {
  return useQuery<LearningTemplate[]>({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((r: AxiosResponse) => r.data),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; block_ids: string[] }) =>
      api.post("/templates", data).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; block_ids?: string[] }) =>
      api.put(`/templates/${id}`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: () => api.get("/learn/subjects").then((r: AxiosResponse) => r.data),
  });
}

export function useSubject(id: string) {
  return useQuery<Subject>({
    queryKey: ["subject", id],
    queryFn: () => api.get(`/learn/subjects/${id}`).then((r: AxiosResponse) => r.data),
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; icon: string; color: string; template_id?: string }) =>
      api.post("/learn/subjects", data).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/learn/subjects/${id}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

// ── Module Items ──────────────────────────────────────────────────────────────

export function useModuleItems(subjectId: string, moduleId: string) {
  return useQuery({
    queryKey: ["module-items", subjectId, moduleId],
    queryFn: () =>
      api.get(`/learn/subjects/${subjectId}/modules/${moduleId}/items`).then((r: AxiosResponse) => r.data),
    enabled: !!subjectId && !!moduleId,
  });
}

export function useCreateItem(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/learn/subjects/${subjectId}/modules/${moduleId}/items`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["module-items", subjectId, moduleId] }),
  });
}

export function useDeleteItem(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api
        .delete(`/learn/subjects/${subjectId}/modules/${moduleId}/items/${itemId}`)
        .then((r: AxiosResponse) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["module-items", subjectId, moduleId] }),
  });
}

// ── SRS ───────────────────────────────────────────────────────────────────────

export function useDueItems(subjectId: string, moduleId: string) {
  return useQuery<{ due: { type: string; item: FlashCard | VocabItem }[]; count: number }>({
    queryKey: ["due", subjectId, moduleId],
    queryFn: () =>
      api.get(`/learn/subjects/${subjectId}/modules/${moduleId}/due`).then((r: AxiosResponse) => r.data),
    enabled: !!subjectId && !!moduleId,
  });
}

export function useSubmitReview(subjectId: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { item_id: string; quality: number }) =>
      api
        .post(`/learn/subjects/${subjectId}/modules/${moduleId}/review`, data)
        .then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["due", subjectId, moduleId] });
      qc.invalidateQueries({ queryKey: ["module-items", subjectId, moduleId] });
    },
  });
}
