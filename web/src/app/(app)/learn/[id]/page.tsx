"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SRSSession } from "@/components/learn/SRSSession";
import { VocabModule } from "@/components/learn/modules/VocabModule";
import { FlashcardModule } from "@/components/learn/modules/FlashcardModule";
import { NotesModule } from "@/components/learn/modules/NotesModule";
import { CodeModule } from "@/components/learn/modules/CodeModule";
import { QuizModule } from "@/components/learn/modules/QuizModule";
import { AIModulePanel } from "@/components/learn/AIModulePanel";
import { useSubject, useDueItems } from "@/hooks/useLearn";
import type { BlockType } from "@/hooks/useLearn";

function ModuleContent({ subjectId, moduleId, blockType, flashcardModuleId }: { subjectId: string; moduleId: string; blockType: BlockType; flashcardModuleId?: string }) {
  if (blockType === "VOCABULARY") return <VocabModule subjectId={subjectId} moduleId={moduleId} flashcardModuleId={flashcardModuleId} />;
  if (blockType === "FLASHCARD") return <FlashcardModule subjectId={subjectId} moduleId={moduleId} />;
  if (blockType === "NOTES") return <NotesModule subjectId={subjectId} moduleId={moduleId} />;
  if (blockType === "CODE_SNIPPET") return <CodeModule subjectId={subjectId} moduleId={moduleId} />;
  if (blockType === "QUIZ") return <QuizModule subjectId={subjectId} moduleId={moduleId} />;
  return <p className="text-sm text-muted-foreground py-8 text-center">Module này chưa có UI.</p>;
}

function SRSBadge({ subjectId, moduleId }: { subjectId: string; moduleId: string }) {
  const { data } = useDueItems(subjectId, moduleId);
  if (!data || data.count === 0) return null;
  return (
    <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
      {data.count}
    </span>
  );
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: subject, isLoading } = useSubject(id);
  const [srsModule, setSrsModule] = useState<{ moduleId: string } | null>(null);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Không tìm thấy môn học.</p>
        <Button variant="link" onClick={() => router.push("/learn")}>Quay lại</Button>
      </div>
    );
  }

  const srsModules = subject.modules.filter(
    (m) => m.block.block_type === "FLASHCARD" || m.block.block_type === "VOCABULARY"
  );

  if (srsModule) {
    return (
      <SRSSession
        subjectId={subject.id}
        moduleId={srsModule.moduleId}
        onClose={() => setSrsModule(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/learn")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-3xl">{subject.icon}</span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{subject.name}</h1>
            <p className="text-xs text-muted-foreground">{subject.modules.length} modules</p>
          </div>
        </div>
        {srsModules.length > 0 && (
          <div className="flex gap-2 basis-full sm:basis-auto">
            {srsModules.map((m) => (
              <Button key={m.id} size="sm" onClick={() => setSrsModule({ moduleId: m.id })}>
                <Brain className="h-4 w-4 mr-1.5" />
                Ôn {m.block.name}
                <SRSBadge subjectId={subject.id} moduleId={m.id} />
              </Button>
            ))}
          </div>
        )}
      </div>

      {subject.modules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          Môn học này chưa có module nào. Hãy tạo template trước rồi dùng lại khi tạo môn học.
        </p>
      ) : (
        <Tabs defaultValue={subject.modules[0]?.id}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1 justify-start">
            {subject.modules.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="text-xs flex-none">
                {m.block.name}
                {(m.block.block_type === "FLASHCARD" || m.block.block_type === "VOCABULARY") && (
                  <SRSBadge subjectId={subject.id} moduleId={m.id} />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {(() => {
            const flashcardModule = subject.modules.find(m => m.block.block_type === "FLASHCARD");
            return subject.modules.map((m) => (
              <TabsContent key={m.id} value={m.id}>
                <AIModulePanel subjectId={subject.id} moduleId={m.id} blockType={m.block.block_type} />
                <ModuleContent
                  subjectId={subject.id}
                  moduleId={m.id}
                  blockType={m.block.block_type}
                  flashcardModuleId={flashcardModule?.id}
                />
              </TabsContent>
            ));
          })()}
        </Tabs>
      )}
    </div>
  );
}
