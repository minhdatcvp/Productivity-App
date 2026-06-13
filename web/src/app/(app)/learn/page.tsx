"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubjectCard } from "@/components/learn/SubjectCard";
import { CreateSubjectDialog } from "@/components/learn/CreateSubjectDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSubjects, useCreateSubject, useDeleteSubject, useTemplates, useLearnReminders } from "@/hooks/useLearn";

export default function LearnPage() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: templates = [] } = useTemplates();
  const { data: reminders } = useLearnReminders();

  const dueBySubject = new Map((reminders?.srs ?? []).map((r) => [r.subject_id, r.due_count]));
  const assessmentDue = new Set((reminders?.assessments ?? []).map((r) => r.subject_id));
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleCreate(data: { name: string; icon: string; color: string; template_id?: string }) {
    try {
      await createSubject.mutateAsync(data);
      toast.success("Đã tạo môn học");
    } catch {
      toast.error("Tạo môn học thất bại");
    }
  }

  async function handleDelete(id: string) {
    setConfirmId(id);
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setConfirmId(null);
    try {
      await deleteSubject.mutateAsync(confirmId);
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Học tập</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subjects.length} môn học · Tạo chủ đề học tập của bạn
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo môn học
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && subjects.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">Chưa có môn học nào</p>
          <p className="text-sm mt-1">Tạo môn học đầu tiên để bắt đầu!</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Tạo môn học
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            onDelete={handleDelete}
            dueCount={dueBySubject.get(s.id) ?? 0}
            assessmentDue={assessmentDue.has(s.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa môn học này? Toàn bộ dữ liệu bên trong sẽ mất."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <CreateSubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templates={templates}
        onSubmit={handleCreate}
        loading={createSubject.isPending}
      />
    </div>
  );
}
