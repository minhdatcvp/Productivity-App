"use client";

import { useState } from "react";
import { Plus, Trash2, BookOpen, RotateCcw, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useModuleItems,
  useCreateItem,
  useDeleteItem,
  useCategorizeVocab,
  type FlashCardCategory,
  type VocabItem,
} from "@/hooks/useLearn";
import { useLookupVocab } from "@/hooks/useLearnAI";

interface Props {
  subjectId: string;
  moduleId: string;
  flashcardModuleId?: string;
}

// ── Learn Session ─────────────────────────────────────────────────────────────

function VocabLearnSession({
  items,
  subjectId,
  moduleId,
  onClose,
}: {
  items: VocabItem[];
  subjectId: string;
  moduleId: string;
  onClose: () => void;
}) {
  const categorize = useCategorizeVocab(subjectId, moduleId);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const current = items[index];

  async function handleCategorize(category: FlashCardCategory) {
    if (!current) return;
    try {
      await categorize.mutateAsync({ item_id: current.id, category });
    } catch {
      toast.error("Lưu thất bại");
      return;
    }
    setRevealed(false);
    setDoneCount((c) => c + 1);
    setIndex((i) => i + 1);
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold">Học xong!</h2>
        <p className="text-muted-foreground text-sm">
          Đã phân loại {doneCount} từ trong buổi này.
        </p>
        <Button onClick={onClose}>Đóng</Button>
      </div>
    );
  }

  const progress = index / items.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {index}/{items.length}
        </span>
      </div>

      {/* Card */}
      <div className="rounded-2xl border-2 bg-card shadow p-8 text-center">
        <p className="text-2xl font-semibold">{current.word}</p>
        {current.pronunciation && (
          <p className="text-muted-foreground mt-1 text-sm">[{current.pronunciation}]</p>
        )}
      </div>

      {/* Reveal / Answer */}
      {!revealed ? (
        <Button
          size="lg"
          className="w-full"
          onClick={() => setRevealed(true)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Xem nghĩa
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-5 text-center">
            <p className="text-lg font-medium">{current.meaning}</p>
            {current.example && (
              <p className="text-sm italic text-muted-foreground mt-2">
                "{current.example}"
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleCategorize("REVIEW")}
              disabled={categorize.isPending}
            >
              Cần học thêm
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleCategorize("MEMORIZED")}
              disabled={categorize.isPending}
            >
              Đã nhớ ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VocabModule ───────────────────────────────────────────────────────────────

export function VocabModule({ subjectId, moduleId, flashcardModuleId }: Props) {
  const { data: items = [], isLoading } = useModuleItems(subjectId, moduleId);
  const createItem = useCreateItem(subjectId, moduleId);
  const deleteItem = useDeleteItem(subjectId, moduleId);
  const categorize = useCategorizeVocab(subjectId, moduleId);
  const [categorizingId, setCategorizingId] = useState<string | null>(null);
  const [learning, setLearning] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const canCategorize = !!flashcardModuleId;

  async function handleCategorize(item: VocabItem, category: FlashCardCategory) {
    if (!canCategorize) {
      toast.error("Môn học chưa có module Flashcard để lưu từ");
      return;
    }
    setCategorizingId(item.id);
    try {
      await categorize.mutateAsync({ item_id: item.id, category });
      toast.success(
        category === "MEMORIZED"
          ? `"${item.word}" → Đã nhớ`
          : `"${item.word}" → Cần học thêm`,
      );
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setCategorizingId(null);
    }
  }

  const vocabItems = items as VocabItem[];

  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [example, setExample] = useState("");
  const lookup = useLookupVocab(subjectId, moduleId);

  async function handleLookup() {
    const w = word.trim();
    if (!w) return;
    try {
      const data = await lookup.mutateAsync(w);
      setMeaning(data.meaning || "");
      setPronunciation(data.pronunciation || "");
      setExample(data.example || "");
    } catch {
      toast.error("Tra cứu thất bại");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;
    try {
      await createItem.mutateAsync({ word: word.trim(), meaning: meaning.trim(), pronunciation: pronunciation || null, example: example || null, tags: [] });
      toast.success("Đã thêm từ vựng");
      setOpen(false);
      setWord(""); setMeaning(""); setPronunciation(""); setExample("");
    } catch {
      toast.error("Thêm từ vựng thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  if (learning) {
    return (
      <VocabLearnSession
        items={vocabItems}
        subjectId={subjectId}
        moduleId={moduleId}
        onClose={() => setLearning(false)}
      />
    );
  }

  function VocabRow({ item }: { item: VocabItem }) {
    const isBusy = categorizingId === item.id;
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.word}</p>
          {item.pronunciation && <p className="text-xs text-muted-foreground">[{item.pronunciation}]</p>}
          <p className="text-sm mt-0.5">{item.meaning}</p>
          {item.example && <p className="text-xs italic text-muted-foreground mt-1">"{item.example}"</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Button
              variant="outline"
              size="xs"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={isBusy || !canCategorize}
              onClick={() => handleCategorize(item, "REVIEW")}
            >
              Cần học thêm
            </Button>
            <Button
              size="xs"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isBusy || !canCategorize}
              onClick={() => handleCategorize(item, "MEMORIZED")}
            >
              Đã nhớ ✓
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmId(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {vocabItems.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setLearning(true)}>
            <BookOpen className="h-4 w-4 mr-1" />
            Học từ mới
            <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {vocabItems.length}
            </span>
          </Button>
        )}
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Thêm từ
        </Button>
      </div>

      {!canCategorize && vocabItems.length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Môn học chưa có module Flashcard — không thể phân loại từ. Hãy thêm block Flashcard cho môn này.
        </p>
      )}

      {vocabItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chưa có từ nào cần phân loại. Thêm từ mới hoặc các từ đã chọn đều nằm trong Flashcard.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cần phân loại · {vocabItems.length} từ
          </p>
          {vocabItems.map((item) => <VocabRow key={item.id} item={item} />)}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa từ vựng này?"
        onConfirm={() => { if (confirmId) deleteItem.mutate(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm từ vựng</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Từ / Cụm từ *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="hello"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!word.trim() || lookup.isPending}
                  onClick={handleLookup}
                  title="Search"
                >
                  {lookup.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Search
                </Button>
              </div>
            </div>
            <div>
              <Label>Nghĩa *</Label>
              <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="xin chào" className="mt-1" />
            </div>
            <div>
              <Label>Phát âm</Label>
              <Input value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="/həˈloʊ/" className="mt-1" />
            </div>
            <div>
              <Label>Ví dụ</Label>
              <Input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Hello, how are you?" className="mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!word.trim() || !meaning.trim() || createItem.isPending}>Thêm</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
