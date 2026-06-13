"use client";

import { useState } from "react";
import { Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useModuleItems,
  useUpdateItem,
  useDeleteItem,
  type FlashCard,
  type FlashCardCategory,
} from "@/hooks/useLearn";

interface Props {
  subjectId: string;
  moduleId: string;
}

const SECTIONS: { key: FlashCardCategory; label: string; hint: string }[] = [
  { key: "REVIEW", label: "Cần học thêm", hint: "Được đưa vào lượt ôn" },
  { key: "MEMORIZED", label: "Đã nhớ", hint: "Không cần ôn lại" },
];

export function FlashcardModule({ subjectId, moduleId }: Props) {
  const { data: items = [], isLoading } = useModuleItems(subjectId, moduleId);
  const updateItem = useUpdateItem(subjectId, moduleId);
  const deleteItem = useDeleteItem(subjectId, moduleId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleMove(item: FlashCard) {
    const next: FlashCardCategory = item.category === "REVIEW" ? "MEMORIZED" : "REVIEW";
    try {
      await updateItem.mutateAsync({ itemId: item.id, category: next });
      toast.success(next === "MEMORIZED" ? "Đã chuyển sang Đã nhớ" : "Đã chuyển sang Cần học thêm");
    } catch {
      toast.error("Chuyển danh mục thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  const cards = items as FlashCard[];

  function Card({ item }: { item: FlashCard }) {
    return (
      <div className="border rounded-lg p-3 relative">
        <div className="absolute top-2 right-2 flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            title={item.category === "REVIEW" ? "Chuyển sang Đã nhớ" : "Chuyển sang Cần học thêm"}
            disabled={updateItem.isPending}
            onClick={() => handleMove(item)}
          >
            <ArrowRightLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmId(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <p className="font-medium text-sm pr-14 whitespace-pre-wrap">{item.front}</p>
        <p className="text-sm text-muted-foreground mt-1 border-t pt-1 whitespace-pre-wrap">{item.back}</p>
        {item.category === "REVIEW" && (
          <p className="text-xs text-muted-foreground mt-1">⏱ next: {new Date(item.next_review).toLocaleDateString("vi-VN")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chưa có flashcard nào. Chọn "Cần học thêm" / "Đã nhớ" ở tab Từ vựng để thêm.
        </p>
      )}

      {SECTIONS.map(({ key, label, hint }) => {
        const sectionCards = cards.filter((c) => c.category === key);
        if (sectionCards.length === 0) return null;
        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label} · {sectionCards.length} thẻ
              <span className="ml-2 normal-case font-normal opacity-70">{hint}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sectionCards.map((item) => <Card key={item.id} item={item} />)}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!confirmId}
        description="Xóa flashcard này? Dữ liệu SRS sẽ mất."
        onConfirm={() => { if (confirmId) deleteItem.mutate(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
