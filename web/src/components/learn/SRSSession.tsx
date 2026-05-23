"use client";

import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDueItems, useSubmitReview, type FlashCard, type VocabItem } from "@/hooks/useLearn";

interface Props {
  subjectId: string;
  moduleId: string;
  onClose: () => void;
}

const QUALITY_LABELS = [
  { q: 0, label: "Quên hoàn toàn", color: "bg-red-500" },
  { q: 2, label: "Khó", color: "bg-orange-500" },
  { q: 3, label: "Ổn", color: "bg-yellow-500" },
  { q: 4, label: "Dễ", color: "bg-green-500" },
  { q: 5, label: "Rất dễ", color: "bg-emerald-600" },
];

export function SRSSession({ subjectId, moduleId, onClose }: Props) {
  const { data, isLoading, refetch } = useDueItems(subjectId, moduleId);
  const submitReview = useSubmitReview(subjectId, moduleId);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const items = data?.due ?? [];
  const current = items[0];

  async function handleRate(quality: number) {
    if (!current) return;
    const itemId = (current.item as FlashCard | VocabItem).id;
    await submitReview.mutateAsync({ item_id: itemId, quality });
    setRevealed(false);
    setDoneCount((c) => c + 1);
    refetch();
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold">Hoàn thành!</h2>
        <p className="text-muted-foreground">Đã ôn tập {doneCount} thẻ hôm nay.</p>
        <Button onClick={onClose}>Đóng</Button>
      </div>
    );
  }

  const isFlashcard = current.type === "flashcard";
  const item = current.item as FlashCard & VocabItem;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          <span className="text-sm text-muted-foreground">
            Còn {items.length} thẻ · Đã ôn {doneCount}
          </span>
        </div>
        <div className="h-2 flex-1 mx-6 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${doneCount > 0 ? (doneCount / (doneCount + items.length)) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full">
        {/* Front */}
        <div className="w-full rounded-2xl border-2 bg-card shadow-lg p-8 text-center mb-6">
          <p className="text-2xl font-semibold">
            {isFlashcard ? item.front : item.word}
          </p>
          {!isFlashcard && item.pronunciation && (
            <p className="text-muted-foreground mt-1">[{item.pronunciation}]</p>
          )}
        </div>

        {/* Back / Answer */}
        {!revealed ? (
          <Button size="lg" onClick={() => setRevealed(true)} className="w-full max-w-xs">
            <RotateCcw className="h-4 w-4 mr-2" />
            Lật thẻ
          </Button>
        ) : (
          <div className="w-full space-y-4">
            <div className="rounded-xl border bg-muted/30 p-6 text-center">
              <p className="text-xl">{isFlashcard ? item.back : item.meaning}</p>
              {!isFlashcard && item.example && (
                <p className="text-sm italic text-muted-foreground mt-2">"{item.example}"</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {QUALITY_LABELS.map(({ q, label, color }) => (
                <Button
                  key={q}
                  variant="outline"
                  className="flex-col h-auto py-2 gap-0.5"
                  onClick={() => handleRate(q)}
                  disabled={submitReview.isPending}
                >
                  <span className={`h-2 w-2 rounded-full ${color} mx-auto`} />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
