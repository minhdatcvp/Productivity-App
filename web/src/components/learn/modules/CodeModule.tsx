"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useModuleItems, useCreateItem, useDeleteItem, type CodeSnippet } from "@/hooks/useLearn";

const LANGUAGES = ["python", "javascript", "typescript", "java", "go", "rust", "sql", "bash", "other"];

interface Props {
  subjectId: string;
  moduleId: string;
}

export function CodeModule({ subjectId, moduleId }: Props) {
  const { data: items = [], isLoading } = useModuleItems(subjectId, moduleId);
  const createItem = useCreateItem(subjectId, moduleId);
  const deleteItem = useDeleteItem(subjectId, moduleId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    try {
      await createItem.mutateAsync({ title: title.trim(), language, code: code.trim(), explanation: explanation || null, tags: [] });
      toast.success("Đã thêm snippet");
      setOpen(false);
      setTitle(""); setCode(""); setExplanation(""); setLanguage("python");
    } catch {
      toast.error("Thêm snippet thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Thêm snippet
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có code snippet nào.</p>
      )}

      <div className="space-y-3">
        {(items as CodeSnippet[]).map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant="secondary" className="text-xs">{item.language}</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmId(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto bg-zinc-950 text-zinc-100 max-h-40">
              <code>{item.code}</code>
            </pre>
            {item.explanation && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{item.explanation}</p>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa code snippet này?"
        onConfirm={() => { if (confirmId) deleteItem.mutate(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm Code Snippet</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên snippet..." className="mt-1" />
            </div>
            <div>
              <Label>Ngôn ngữ</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v ?? "python")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code *</Label>
              <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// code here..." className="mt-1 font-mono text-sm" rows={6} />
            </div>
            <div>
              <Label>Giải thích</Label>
              <Input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Giải thích ngắn gọn..." className="mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!title.trim() || !code.trim() || createItem.isPending}>Thêm</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
