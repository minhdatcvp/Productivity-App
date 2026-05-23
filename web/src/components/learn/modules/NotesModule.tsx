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
import { useModuleItems, useCreateItem, useDeleteItem, type Note } from "@/hooks/useLearn";

interface Props {
  subjectId: string;
  moduleId: string;
}

export function NotesModule({ subjectId, moduleId }: Props) {
  const { data: items = [], isLoading } = useModuleItems(subjectId, moduleId);
  const createItem = useCreateItem(subjectId, moduleId);
  const deleteItem = useDeleteItem(subjectId, moduleId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createItem.mutateAsync({ title: title.trim(), content, tags: [] });
      toast.success("Đã tạo ghi chú");
      setOpen(false);
      setTitle(""); setContent("");
    } catch {
      toast.error("Tạo ghi chú thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Tạo ghi chú
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có ghi chú nào.</p>
      )}

      <div className="space-y-2">
        {(items as Note[]).map((item) => (
          <div key={item.id} className="border rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                {item.content && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                    {item.content}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setConfirmId(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa ghi chú này?"
        onConfirm={() => { if (confirmId) deleteItem.mutate(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo ghi chú</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề ghi chú..." className="mt-1" />
            </div>
            <div>
              <Label>Nội dung</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung (markdown)..." className="mt-1" rows={5} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!title.trim() || createItem.isPending}>Tạo</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
