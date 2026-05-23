"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateEditor } from "@/components/learn/TemplateEditor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCatalogBlocks,
  type LearningTemplate,
} from "@/hooks/useLearn";

const BLOCK_TYPE_ICONS: Record<string, string> = {
  FLASHCARD: "🗂️",
  VOCABULARY: "📖",
  NOTES: "📝",
  CODE_SNIPPET: "💻",
  QUIZ: "❓",
  EXERCISE: "🏋️",
};

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useTemplates();
  const { data: blocks = [] } = useCatalogBlocks();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LearningTemplate | undefined>();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openCreate() { setEditing(undefined); setEditorOpen(true); }
  function openEdit(t: LearningTemplate) { setEditing(t); setEditorOpen(true); }

  async function handleSubmit(data: { name: string; description: string; block_ids: string[] }) {
    try {
      if (editing) {
        await updateTemplate.mutateAsync({ id: editing.id, ...data });
        toast.success("Đã cập nhật template");
      } else {
        await createTemplate.mutateAsync(data);
        toast.success("Đã tạo template");
      }
    } catch {
      toast.error("Thao tác thất bại");
    }
  }

  async function handleDelete(id: string) {
    setConfirmId(id);
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setConfirmId(null);
    try {
      await deleteTemplate.mutateAsync(confirmId);
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Định nghĩa cấu trúc cho môn học — chọn các block phù hợp
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo template
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="font-medium">Chưa có template nào</p>
          <p className="text-sm mt-1">Tạo template để dùng lại khi tạo môn học</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />Tạo template
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {t.template_blocks.map((tb) => (
                  <Badge key={tb.id} variant="secondary" className="text-xs gap-1">
                    <span>{BLOCK_TYPE_ICONS[tb.block.block_type] ?? "📦"}</span>
                    {tb.block.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t.template_blocks.length} block{t.template_blocks.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa template này? Các môn học đã tạo từ template không bị ảnh hưởng."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        blocks={blocks}
        template={editing}
        onSubmit={handleSubmit}
        loading={createTemplate.isPending || updateTemplate.isPending}
      />
    </div>
  );
}
