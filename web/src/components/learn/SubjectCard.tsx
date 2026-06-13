"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Subject } from "@/hooks/useLearn";

interface Props {
  subject: Subject;
  onDelete: (id: string) => void;
  /** SRS flashcards due for this subject (from reminders). */
  dueCount?: number;
  /** Subject is due for a proficiency re-assessment. */
  assessmentDue?: boolean;
}

export function SubjectCard({ subject, onDelete, dueCount = 0, assessmentDue = false }: Props) {
  const router = useRouter();
  // Review now happens only on the Flashcard module (vocab is triaged into cards).
  const hasFlashcards = subject.modules.some((m) => m.block.block_type === "FLASHCARD");

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: subject.color }}
      onClick={() => router.push(`/learn/${subject.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{subject.icon}</span>
            <div>
              <h3 className="font-semibold text-base">{subject.name}</h3>
              <p className="text-xs text-muted-foreground">
                {subject.modules.length} module{subject.modules.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(subject.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {subject.modules.map((m) => (
            <span
              key={m.id}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {m.block.name}
            </span>
          ))}
        </div>
        {(dueCount > 0 || assessmentDue || hasFlashcards) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {dueCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {dueCount} thẻ cần ôn
              </span>
            )}
            {assessmentDue && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                Cần đánh giá
              </span>
            )}
            {dueCount === 0 && !assessmentDue && hasFlashcards && (
              <span className="text-xs text-muted-foreground">Đã ôn xong</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
