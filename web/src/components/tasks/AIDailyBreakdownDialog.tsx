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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAIDailyBreakdown,
  useConfirmDailyTasks,
  type BreakdownTask,
} from "@/hooks/useTasks";

interface Props {
  period: string;
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

type Phase = "input" | "reviewing";

export function AIDailyBreakdownDialog({ period }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [suggestions, setSuggestions] = useState<BreakdownTask[]>([]);

  const suggestMutation = useAIDailyBreakdown();
  const confirmMutation = useConfirmDailyTasks();

  function handleSuggest() {
    if (!title.trim()) return;
    suggestMutation.mutate(
      { period, title: title.trim(), detail: detail.trim() || undefined },
      {
        onSuccess: (data) => {
          setSuggestions(data.tasks);
          setRefinePrompt("");
          setPhase("reviewing");
        },
        onError: () => toast.error("AI không thể gợi ý, thử lại sau"),
      }
    );
  }

  function handleRefine() {
    if (!refinePrompt.trim()) return;
    suggestMutation.mutate(
      {
        period,
        title: title.trim(),
        detail: detail.trim() || undefined,
        refinement: refinePrompt.trim(),
      },
      {
        onSuccess: (data) => {
          setSuggestions(data.tasks);
          setRefinePrompt("");
        },
        onError: () => toast.error("Không thể cập nhật gợi ý, thử lại sau"),
      }
    );
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
      { period, tasks: suggestions },
      {
        onSuccess: (data) => {
          toast.success(`Đã thêm ${data.tasks.length} task`);
          handleClose();
        },
        onError: () => toast.error("Tạo task thất bại, thử lại sau"),
      }
    );
  }

  function handleClose() {
    setOpen(false);
    setPhase("input");
    setTitle("");
    setDetail("");
    setRefinePrompt("");
    setSuggestions([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
          />
        }
      >
        <Wand2 className="h-3.5 w-3.5" />
        AI Suggest
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-500" />
            AI gợi ý task hôm nay
          </DialogTitle>
        </DialogHeader>

        {phase === "input" ? (
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Hôm nay bạn muốn hoàn thành gì?{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSuggest();
                }}
                placeholder="VD: Hoàn thành sprint review, Học chapter 3 tiếng Anh..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                Chi tiết (tuỳ chọn)
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Mô tả thêm về context, constraints, hoặc kết quả mong muốn..."
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSuggest}
              disabled={!title.trim() || suggestMutation.isPending}
            >
              <Wand2
                className={`h-4 w-4 ${suggestMutation.isPending ? "animate-spin" : ""}`}
              />
              {suggestMutation.isPending ? "Đang phân tích..." : "Gợi ý task"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              AI gợi ý{" "}
              <span className="font-medium text-foreground">
                {suggestions.length} task
              </span>{" "}
              — chỉnh sửa rồi xác nhận để thêm vào danh sách.
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
                  Không còn task nào — quay lại để nhập lại.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRefine();
                }}
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
                onClick={() => setPhase("input")}
                disabled={confirmMutation.isPending}
              >
                Quay lại
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleConfirm}
                disabled={!suggestions.length || confirmMutation.isPending}
              >
                <Check className="h-4 w-4" />
                {confirmMutation.isPending
                  ? "Đang tạo..."
                  : `Xác nhận ${suggestions.length} task`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
