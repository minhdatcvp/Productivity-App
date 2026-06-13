"use client";

import { useState, useEffect } from "react";
import { Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BlockType } from "@/hooks/useLearn";
import {
  useAIConfig,
  useUpdateAIConfig,
  useAIGenerate,
  useAIConfirm,
  type AIConfig,
} from "@/hooks/useLearnAI";

interface Props {
  subjectId: string;
  moduleId: string;
  blockType: BlockType;
}

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

// ── Config Dialog ─────────────────────────────────────────────────────────────

function ConfigDialog({
  open,
  onClose,
  subjectId,
  moduleId,
  blockType,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  moduleId: string;
  blockType: BlockType;
}) {
  const { data: config } = useAIConfig(subjectId, moduleId);
  const update = useUpdateAIConfig(subjectId, moduleId);

  const [enabled, setEnabled] = useState(false);
  const [dailyCount, setDailyCount] = useState(10);
  const [topicsRaw, setTopicsRaw] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");

  // Sync from fetched config
  useEffect(() => {
    if (config) {
      setEnabled(config.ai_enabled);
      setDailyCount(config.daily_count);
      setTopicsRaw(config.topics.join(", "));
      setDifficulty(config.difficulty);
    }
  }, [config]);

  async function handleSave() {
    const payload: Partial<AIConfig> = {
      ai_enabled: enabled,
      daily_count: dailyCount,
      topics: topicsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      difficulty,
    };
    try {
      await update.mutateAsync(payload);
      toast.success("Đã lưu cấu hình AI");
      onClose();
    } catch {
      toast.error("Lưu cấu hình thất bại");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cấu hình AI</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <Label>Bật AI hỗ trợ</Label>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                enabled ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {enabled && (
            <>
              {/* Daily count */}
              <div>
                <Label>Số lượng mỗi lần tạo</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={dailyCount}
                  onChange={(e) => setDailyCount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              {/* Topics */}
              <div>
                <Label>Keywords gợi ý</Label>
                <Input
                  value={topicsRaw}
                  onChange={(e) => setTopicsRaw(e.target.value)}
                  placeholder="vd: business, đường cong, ngữ pháp..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Phân cách bởi dấu phẩy. AI sẽ ưu tiên tạo nội dung theo hướng này.
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <Label>Độ khó</Label>
                <div className="mt-1 flex gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        difficulty === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Generate Dialog ───────────────────────────────────────────────────────────

type GeneratedItem = Record<string, unknown>;

function itemLabel(item: GeneratedItem, blockType: BlockType) {
  if (blockType === "VOCABULARY") {
    const word = String(item.word ?? "");
    const meaning = String(item.meaning ?? "");
    const extra: string[] = [];
    if (item.pronunciation) extra.push(`[${item.pronunciation}]`);
    if (item.example) extra.push(`"${item.example}"`);
    return { primary: word, secondary: [meaning, ...extra].filter(Boolean).join(" · ") };
  }
  if (blockType === "FLASHCARD") {
    return {
      primary: String(item.front ?? ""),
      secondary: String(item.back ?? ""),
    };
  }
  // NOTES / EXERCISE
  const content = String(item.content ?? "");
  return {
    primary: String(item.title ?? ""),
    secondary: content.length > 120 ? content.slice(0, 120) + "…" : content,
  };
}

function GenerateDialog({
  open,
  onClose,
  subjectId,
  moduleId,
  blockType,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  moduleId: string;
  blockType: BlockType;
}) {
  const generate = useAIGenerate(subjectId, moduleId);
  const confirm = useAIConfirm(subjectId, moduleId);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Auto-generate when dialog opens
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setSelected(new Set());
    generate.mutate(undefined, {
      onSuccess: (data) => {
        setItems(data.items);
        setSelected(new Set(data.items.map((_, i) => i)));
      },
      onError: () => toast.error("Tạo nội dung thất bại"),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleItem(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleConfirm() {
    const toConfirm = items.filter((_, i) => selected.has(i));
    if (toConfirm.length === 0) return;
    try {
      await confirm.mutateAsync(toConfirm);
      toast.success(`Đã thêm ${toConfirm.length} items`);
      onClose();
    } catch {
      toast.error("Thêm items thất bại");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Tạo nội dung</DialogTitle>
        </DialogHeader>

        {generate.isPending && (
          <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
            <p className="text-sm">Đang tạo nội dung...</p>
          </div>
        )}

        {!generate.isPending && items.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              Chọn items muốn thêm ({selected.size}/{items.length})
            </p>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {items.map((item, i) => {
                const { primary, secondary } = itemLabel(item, blockType);
                const checked = selected.has(i);
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(i)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{primary}</p>
                      {secondary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {secondary}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {!generate.isPending && items.length === 0 && !generate.isIdle && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Không có items nào được tạo.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0 || confirm.isPending || generate.isPending}
          >
            Thêm {selected.size > 0 ? `${selected.size} items` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AIModulePanel ─────────────────────────────────────────────────────────────

export function AIModulePanel({ subjectId, moduleId, blockType }: Props) {
  const [configOpen, setConfigOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const { data: config } = useAIConfig(subjectId, moduleId);

  // This generic AI panel is offered only on the Vocabulary inbox.
  // Flashcards come from triaging vocab; Notes are manual; QUIZ/EXERCISE have
  // their own "Tạo … AI" buttons; CODE has its own UI.
  if (blockType !== "VOCABULARY") return null;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfigOpen(true)}
        >
          <Settings className="h-4 w-4 mr-1.5" />
          Cấu hình AI
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGenerateOpen(true)}
          disabled={!config?.ai_enabled}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          AI Tạo nội dung
        </Button>
      </div>

      <ConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        subjectId={subjectId}
        moduleId={moduleId}
        blockType={blockType}
      />
      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        subjectId={subjectId}
        moduleId={moduleId}
        blockType={blockType}
      />
    </>
  );
}
