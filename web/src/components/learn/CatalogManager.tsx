"use client";

import { useState } from "react";
import { Trash2, Sparkles, Plus, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCatalogBlocks,
  useDeleteCatalogBlock,
  useSuggestBlocks,
  useCreateCatalogBlocks,
  type BlockSuggestion,
  type BlockType,
} from "@/hooks/useLearn";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  FLASHCARD: "Flashcard SRS",
  VOCABULARY: "Từ vựng",
  NOTES: "Ghi chú",
  CODE_SNIPPET: "Code Snippet",
  QUIZ: "Quiz",
  EXERCISE: "Bài tập",
};

export function CatalogManager() {
  const { data: blocks = [], isLoading } = useCatalogBlocks();
  const deleteMut = useDeleteCatalogBlock();
  const suggestMut = useSuggestBlocks();
  const createMut = useCreateCatalogBlocks();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BlockSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualType, setManualType] = useState<BlockType>("NOTES");
  const [manualDesc, setManualDesc] = useState("");

  const systemBlocks = blocks.filter((b) => b.is_system);
  const userBlocks = blocks.filter((b) => !b.is_system);

  async function handleSuggest() {
    if (!query.trim()) return;
    try {
      const res = await suggestMut.mutateAsync(query.trim());
      setSuggestions(res.suggestions);
      setSelected(new Set(res.suggestions.map((_, i) => i).filter((i) => !res.suggestions[i].is_duplicate)));
    } catch {
      toast.error("Không thể gợi ý, thử lại sau");
    }
  }

  async function handleConfirm() {
    const toCreate = suggestions
      .filter((_, i) => selected.has(i) && !suggestions[i].is_duplicate)
      .map((s) => ({ name: s.name, description: s.description, icon: s.icon, block_type: s.block_type }));
    if (!toCreate.length) return;
    try {
      await createMut.mutateAsync(toCreate);
      toast.success(`Đã thêm ${toCreate.length} block`);
      setSuggestions([]);
      setQuery("");
      setSelected(new Set());
    } catch {
      toast.error("Tạo block thất bại");
    }
  }

  async function handleManualCreate() {
    if (!manualName.trim()) return;
    try {
      await createMut.mutateAsync([{ name: manualName.trim(), block_type: manualType, description: manualDesc.trim(), icon: "square" }]);
      toast.success("Đã thêm block");
      setManualName("");
      setManualDesc("");
      setManualType("NOTES");
      setShowManual(false);
    } catch {
      toast.error("Tạo block thất bại");
    }
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* AI Suggest */}
      <div className="space-y-3">
        <h3 className="font-medium">AI Gợi ý blocks</h3>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="vd: tôi muốn học Python..."
            onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
          />
          <Button onClick={handleSuggest} disabled={suggestMut.isPending || !query.trim()}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            {suggestMut.isPending ? "Đang gợi ý..." : "Gợi ý"}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-2 rounded ${
                  s.is_duplicate
                    ? "cursor-not-allowed bg-muted/20"
                    : selected.has(i)
                    ? "bg-primary/10 cursor-pointer"
                    : "hover:bg-muted cursor-pointer"
                }`}
                onClick={() => !s.is_duplicate && toggleSelect(i)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  disabled={s.is_duplicate}
                  onChange={() => !s.is_duplicate && toggleSelect(i)}
                  onClick={(e) => e.stopPropagation()}
                  className="disabled:cursor-not-allowed"
                />
                <span className="text-base leading-none">
                  {s.is_duplicate ? (
                    <span className="text-muted-foreground text-sm">✓</span>
                  ) : (
                    <Plus className="h-4 w-4 text-primary" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.is_duplicate ? "line-through text-muted-foreground" : ""}`}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.is_duplicate && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                      Đã có
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {BLOCK_TYPE_LABELS[s.block_type]}
                  </Badge>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={createMut.isPending || selected.size === 0}
              className="w-full mt-1"
            >
              Thêm {selected.size} block đã chọn
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Manual create */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Thêm block thủ công</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-muted-foreground"
            onClick={() => setShowManual((v) => !v)}
          >
            <PenLine className="h-3.5 w-3.5" />
            {showManual ? "Đóng" : "Thêm mới"}
          </Button>
        </div>

        {showManual && (
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Tên block, vd: Grammar Notes"
                onKeyDown={(e) => e.key === "Enter" && handleManualCreate()}
                className="flex-1"
              />
              <Select value={manualType} onValueChange={(v) => setManualType(v as BlockType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Mô tả ngắn (tùy chọn)"
            />
            <Button
              size="sm"
              onClick={handleManualCreate}
              disabled={createMut.isPending || !manualName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm block
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* System blocks */}
      <div>
        <h3 className="font-medium mb-2 text-sm text-muted-foreground">System blocks</h3>
        <div className="space-y-1.5">
          {systemBlocks.map((b) => (
            <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40">
              <span className="text-base">📦</span>
              <span className="text-sm flex-1">{b.name}</span>
              <Badge variant="outline" className="text-xs">{BLOCK_TYPE_LABELS[b.block_type]}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* User blocks */}
      {userBlocks.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 text-sm text-muted-foreground">Blocks của bạn</h3>
          <div className="space-y-1.5">
            {userBlocks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-md border">
                <span className="text-base">✨</span>
                <span className="text-sm flex-1">{b.name}</span>
                <Badge variant="secondary" className="text-xs">{BLOCK_TYPE_LABELS[b.block_type]}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmId(b.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa block này sẽ xóa luôn tất cả dữ liệu liên quan trong các môn học và template."
        onConfirm={() => {
          if (confirmId) deleteMut.mutate(confirmId, {
            onError: (err: unknown) => {
              const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
              toast.error(msg ?? "Xóa block thất bại");
            },
          });
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
