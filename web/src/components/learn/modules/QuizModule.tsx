"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAIGenerateQuiz,
  useQuizzes,
  useSubmitQuiz,
  type SubjectQuiz,
  type QuizQuestion,
} from "@/hooks/useLearnAI";

interface Props {
  subjectId: string;
  moduleId: string;
}

type UIState = "list" | "taking" | "results";

// ── Score badge color ─────────────────────────────────────────────────────────

function scoreBadgeClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

// ── Quiz List ─────────────────────────────────────────────────────────────────

function QuizList({
  subjectId,
  moduleId,
  onStartNew,
  onViewResult,
}: {
  subjectId: string;
  moduleId: string;
  onStartNew: (quiz: SubjectQuiz) => void;
  onViewResult: (quiz: SubjectQuiz) => void;
}) {
  const { data: quizzes = [], isLoading } = useQuizzes(subjectId, moduleId);
  const generateQuiz = useAIGenerateQuiz(subjectId, moduleId);

  async function handleGenerate() {
    try {
      const quiz = await generateQuiz.mutateAsync();
      onStartNew(quiz);
    } catch {
      toast.error("Tạo bài kiểm tra thất bại");
    }
  }

  const completed = quizzes.filter((q) => q.status === "COMPLETED");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleGenerate} disabled={generateQuiz.isPending}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          {generateQuiz.isPending ? "Đang tạo..." : "Tạo bài kiểm tra AI"}
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-6">Đang tải...</p>
      )}

      {!isLoading && completed.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">
          Hãy thêm từ vựng hoặc flashcard trước, rồi tạo bài kiểm tra.
        </p>
      )}

      {completed.map((quiz) => (
        <div
          key={quiz.id}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {new Date(quiz.created_at).toLocaleDateString("vi-VN")}
            </span>
            {quiz.score !== null && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadgeClass(
                  quiz.score
                )}`}
              >
                {quiz.score}%
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onViewResult(quiz)}>
            Xem kết quả
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Quiz Taking ───────────────────────────────────────────────────────────────

function QuizTaking({
  quiz,
  onSubmit,
}: {
  quiz: SubjectQuiz;
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const questions: QuizQuestion[] = quiz.questions.items;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const selected = answers[String(current.id)];

  function selectOption(opt: string) {
    setAnswers((prev) => ({ ...prev, [String(current.id)]: opt }));
  }

  function handleNext() {
    if (isLast) {
      onSubmit(answers);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Câu {currentIndex + 1} / {questions.length}
        </p>
        <div className="h-1.5 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <p className="text-base font-medium leading-relaxed">{current.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {(["A", "B", "C", "D"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectOption(key)}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors ${
              selected === key
                ? "border-primary bg-primary/10"
                : "hover:bg-muted border-input"
            }`}
          >
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                selected === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {key}
            </span>
            <span>{current.options[key]}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!selected}>
          {isLast ? "Nộp bài" : "Tiếp theo"}
        </Button>
      </div>
    </div>
  );
}

// ── Quiz Results ──────────────────────────────────────────────────────────────

function QuizResults({
  quiz,
  userAnswers,
  onBack,
}: {
  quiz: SubjectQuiz;
  userAnswers?: Record<string, string>;
  onBack: () => void;
}) {
  const fb = quiz.ai_feedback;
  const questions: QuizQuestion[] = quiz.questions.items;
  const answers = quiz.answers ?? userAnswers ?? {};

  return (
    <div className="space-y-5">
      {/* Score */}
      <div className="flex flex-col items-center gap-2 py-4">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
            (fb?.score ?? quiz.score ?? 0) >= 80
              ? "border-green-500 text-green-600"
              : (fb?.score ?? quiz.score ?? 0) >= 50
              ? "border-yellow-500 text-yellow-600"
              : "border-red-500 text-red-600"
          }`}
        >
          {fb?.score ?? quiz.score ?? 0}%
        </div>
        {fb && (
          <p className="text-sm text-muted-foreground">
            {fb.correct}/{fb.total} câu đúng
          </p>
        )}
      </div>

      {/* Summary */}
      {fb?.summary && (
        <p className="text-sm text-center text-muted-foreground">{fb.summary}</p>
      )}

      {/* Areas */}
      {fb && (fb.strong_areas.length > 0 || fb.weak_areas.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {fb.strong_areas.map((a) => (
            <Badge key={a} className="bg-green-100 text-green-800 border-0 text-xs">
              ✓ {a}
            </Badge>
          ))}
          {fb.weak_areas.map((a) => (
            <Badge key={a} className="bg-red-100 text-red-800 border-0 text-xs">
              ✗ {a}
            </Badge>
          ))}
        </div>
      )}

      {/* Next plan */}
      {fb?.next_plan && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-1">Kế hoạch tiếp theo</p>
          <p className="text-sm">{fb.next_plan}</p>
        </div>
      )}

      {/* Per-question */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Chi tiết từng câu</p>
          {questions.map((q) => {
            const userAns = answers[String(q.id)];
            const isCorrect = userAns === q.answer;
            const perQ = fb?.per_question.find((p) => p.id === q.id);
            return (
              <div
                key={q.id}
                className={`rounded-lg border p-3 space-y-1 ${
                  isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm font-medium">{q.question}</p>
                </div>
                <div className="ml-6 text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Đáp án đúng:{" "}
                    <span className="font-semibold text-foreground">
                      {q.answer}. {q.options[q.answer as keyof typeof q.options]}
                    </span>
                  </p>
                  {!isCorrect && userAns && (
                    <p>
                      Bạn chọn:{" "}
                      <span className="text-red-600">
                        {userAns}. {q.options[userAns as keyof typeof q.options]}
                      </span>
                    </p>
                  )}
                  {perQ?.note && <p className="italic">{perQ.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <Button onClick={onBack}>Làm bài khác</Button>
      </div>
    </div>
  );
}

// ── QuizModule (main) ─────────────────────────────────────────────────────────

export function QuizModule({ subjectId, moduleId }: Props) {
  const [uiState, setUIState] = useState<UIState>("list");
  const [activeQuiz, setActiveQuiz] = useState<SubjectQuiz | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({});
  const submitQuiz = useSubmitQuiz(subjectId, moduleId);

  async function handleSubmit(answers: Record<string, string>) {
    if (!activeQuiz) return;
    try {
      const result = await submitQuiz.mutateAsync({
        quiz_id: activeQuiz.id,
        answers,
      });
      setPendingAnswers(answers);
      setActiveQuiz(result);
      setUIState("results");
    } catch {
      toast.error("Nộp bài thất bại");
    }
  }

  if (uiState === "list") {
    return (
      <QuizList
        subjectId={subjectId}
        moduleId={moduleId}
        onStartNew={(quiz) => {
          setActiveQuiz(quiz);
          setUIState("taking");
        }}
        onViewResult={(quiz) => {
          setActiveQuiz(quiz);
          setPendingAnswers(quiz.answers ?? {});
          setUIState("results");
        }}
      />
    );
  }

  if (uiState === "taking" && activeQuiz) {
    return (
      <QuizTaking
        quiz={activeQuiz}
        onSubmit={handleSubmit}
      />
    );
  }

  if (uiState === "results" && activeQuiz) {
    return (
      <QuizResults
        quiz={activeQuiz}
        userAnswers={pendingAnswers}
        onBack={() => setUIState("list")}
      />
    );
  }

  return null;
}
