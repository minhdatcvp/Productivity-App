"use client";

import { useState } from "react";
import { Check, RefreshCw, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAIBreakdown,
  useConfirmGoalTasks,
  type BreakdownTask,
} from "@/hooks/useTasks";

interface Props {
  goalId: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "Cao",
  MEDIUM: "Vừa",
  LOW: "Thấp",
};

const PRIORITY_CLASS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

type Phase = "loading" | "reviewing";

export function AIGoalBreakdownDialog({ goalId }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [suggestions, setSuggestions] = useState<BreakdownTask[]>([]);
  const [refinePrompt, setRefinePrompt] = useState("");

  const suggestMutation = useAIBreakdown(goalId);
  const confirmMutation = useConfirmGoalTasks(goalId);

  function triggerSuggest(refinement?: string) {
    suggestMutation.mutate(
      refinement ? { refinement } : undefined,
      {
        onSuccess: (data) => {
          setSuggestions(data.tasks);
          setRefinePrompt("");
          setPhase("reviewing");
        },
        onError: () => {
          toast.error("AI không thể phân tích, thử lại sau");
          if (phase === "loading") setOpen(false);
        },
      }
    );
  }

  function handleOpenChange(v: boolean) {
    if (v) {
      setOpen(true);
      setPhase("loading");
      setSuggestions([]);
      setRefinePrompt("");
      triggerSuggest();
    } else {
      handleClose();
    }
  }

  function handleRefine() {
    if (!refinePrompt.trim()) return;
    setPhase("loading");
    triggerSuggest(refinePrompt.trim());
  }

  function handleUpdateTitle(index: number, newTitle: string) {
    setSuggestions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, title: newTitle } : t))
    );
  }

  function handleRemove(index: number) {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleConfirm() {
    if (!suggestions.length) return;
    confirmMutation.mutate(
      { tasks: suggestions },
      {
        onSuccess: (data) => {
          toast.success(`Đã thêm ${data.tasks.length} nhiệm vụ`);
          handleClose();
        },
        onError: () => toast.error("Tạo nhiệm vụ thất bại, thử lại sau"),
      }
    );
  }

  function handleClose() {
    setOpen(false);
    setSuggestions([]);
    setRefinePrompt("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 mb-4 border-purple-200 text-purple-700 hover:bg-purple-50"
        onClick={() => handleOpenChange(true)}
      >
        <Wand2 className="h-4 w-4" />
        AI Breakdown
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-500" />
            AI gợi ý nhiệm vụ
          </DialogTitle>
        </DialogHeader>

        {phase === "loading" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Wand2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-sm">Đang phân tích mục tiêu...</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              AI gợi ý{" "}
              <span className="font-medium text-foreground">
                {suggestions.length} nhiệm vụ
              </span>{" "}
              — chỉnh sửa rồi xác nhận để thêm vào mục tiêu.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {suggestions.map((task, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border bg-card p-2.5"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_CLASS[task.priority] ?? PRIORITY_CLASS.MEDIUM}`}
                  >
                    {PRIORITY_LABEL[task.priority] ?? task.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      value={task.title}
                      onChange={(e) => handleUpdateTitle(i, e.target.value)}
                      className="w-full bg-transparent text-sm font-medium outline-none focus:underline"
                    />
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {suggestions.length === 0 && (
                <p className="text-center py-4 text-sm text-muted-foreground">
                  Không còn nhiệm vụ nào.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRefine(); }}
                placeholder="Thêm yêu cầu để cập nhật gợi ý..."
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                disabled={suggestMutation.isPending}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={!refinePrompt.trim() || suggestMutation.isPending}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${suggestMutation.isPending ? "animate-spin" : ""}`}
                />
                Cập nhật
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={confirmMutation.isPending}
              >
                Huỷ
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleConfirm}
                disabled={!suggestions.length || confirmMutation.isPending}
              >
                <Check className="h-4 w-4" />
                {confirmMutation.isPending
                  ? "Đang tạo..."
                  : `Xác nhận ${suggestions.length} nhiệm vụ`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
