"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Subject } from "@/hooks/useLearn";

interface Props {
  subject: Subject;
  onDelete: (id: string) => void;
}

export function SubjectCard({ subject, onDelete }: Props) {
  const router = useRouter();
  const srsModules = subject.modules.filter(
    (m) => m.block.block_type === "FLASHCARD" || m.block.block_type === "VOCABULARY"
  );

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
        {srsModules.length > 0 && (
          <p className="text-xs text-primary mt-2 font-medium">Có SRS review</p>
        )}
      </CardContent>
    </Card>
  );
}
