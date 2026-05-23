"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSuggestTemplateBlocks, type CatalogBlock, type LearningTemplate } from "@/hooks/useLearn";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blocks: CatalogBlock[];
  template?: LearningTemplate;
  onSubmit: (data: { name: string; description: string; block_ids: string[] }) => void;
  loading?: boolean;
}

const BLOCK_TYPE_ICONS: Record<string, string> = {
  FLASHCARD: "🗂️",
  VOCABULARY: "📖",
  NOTES: "📝",
  CODE_SNIPPET: "💻",
  QUIZ: "❓",
  EXERCISE: "🏋️",
};

export function TemplateEditor({ open, onOpenChange, blocks, template, onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const suggestMut = useSuggestTemplateBlocks();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setSelectedIds(template.template_blocks.map((tb) => tb.block_id));
    } else {
      setName(""); setDescription(""); setSelectedIds([]);
    }
    setAiQuery(""); setHighlightedIds(new Set());
  }, [template, open]);

  function toggleBlock(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleAISuggest() {
    if (!aiQuery.trim()) return;
    try {
      const res = await suggestMut.mutateAsync(aiQuery.trim());
      const ids = res.block_ids;
      setHighlightedIds(new Set(ids));
      setSelectedIds(ids);
      toast.success(`AI đề xuất ${ids.length} block`);
    } catch {
      toast.error("Không thể gợi ý, thử lại sau");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedIds.length === 0) return;
    onSubmit({ name: name.trim(), description, block_ids: selectedIds });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? "Sửa template" : "Tạo template mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tên template</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Ngôn ngữ, Lập trình..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Mô tả (tùy chọn)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về template này..."
              className="mt-1"
            />
          </div>

          {/* AI suggest for blocks */}
          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">🤖 AI gợi ý blocks</p>
            <div className="flex gap-2">
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="vd: học lập trình Python..."
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAISuggest())}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAISuggest}
                disabled={suggestMut.isPending || !aiQuery.trim()}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {suggestMut.isPending ? "..." : "Gợi ý"}
              </Button>
            </div>
            {highlightedIds.size > 0 && (
              <p className="text-xs text-primary">
                AI đã chọn {highlightedIds.size} block phù hợp — bạn có thể điều chỉnh bên dưới
              </p>
            )}
          </div>

          <div>
            <Label>Chọn blocks ({selectedIds.length} đã chọn)</Label>
            <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
              {blocks.map((b) => {
                const checked = selectedIds.includes(b.id);
                const highlighted = highlightedIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${
                      checked
                        ? highlighted
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted"
                    }`}
                    onClick={() => toggleBlock(b.id)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBlock(b.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{BLOCK_TYPE_ICONS[b.block_type] ?? "📦"}</span>
                    <span className="text-sm flex-1">{b.name}</span>
                    {highlighted && <span className="text-xs text-primary">✨ AI</span>}
                    {b.is_system && (
                      <Badge variant="outline" className="text-xs">system</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || selectedIds.length === 0 || loading}>
              {template ? "Lưu" : "Tạo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
