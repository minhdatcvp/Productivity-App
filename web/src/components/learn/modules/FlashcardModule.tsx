"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useModuleItems, useCreateItem, useDeleteItem, type FlashCard } from "@/hooks/useLearn";

interface Props {
  subjectId: string;
  moduleId: string;
}

export function FlashcardModule({ subjectId, moduleId }: Props) {
  const { data: items = [], isLoading } = useModuleItems(subjectId, moduleId);
  const createItem = useCreateItem(subjectId, moduleId);
  const deleteItem = useDeleteItem(subjectId, moduleId);
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    try {
      await createItem.mutateAsync({ front: front.trim(), back: back.trim() });
      toast.success("Đã thêm flashcard");
      setOpen(false);
      setFront(""); setBack("");
    } catch {
      toast.error("Thêm flashcard thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Thêm thẻ
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có flashcard nào.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(items as FlashCard[]).map((item) => (
          <div key={item.id} className="border rounded-lg p-3 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmId(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <p className="font-medium text-sm pr-8">{item.front}</p>
            <p className="text-sm text-muted-foreground mt-1 border-t pt-1">{item.back}</p>
            <p className="text-xs text-muted-foreground mt-1">⏱ next: {new Date(item.next_review).toLocaleDateString("vi-VN")}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa flashcard này? Dữ liệu SRS sẽ mất."
        onConfirm={() => { if (confirmId) deleteItem.mutate(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm Flashcard</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Mặt trước *</Label>
              <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Câu hỏi hoặc từ..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Mặt sau *</Label>
              <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Câu trả lời hoặc nghĩa..." className="mt-1" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!front.trim() || !back.trim() || createItem.isPending}>Thêm</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
