"use client";

import { useState } from "react";
import { RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRolloverPreview, useRolloverGoalTasks, type RolloverPreviewTask } from "@/hooks/useTasks";
import { isCurrentPeriod } from "@/lib/period";

interface Props {
  timeline: "WEEKLY" | "MONTHLY";
  period: string;
}

const TIMELINE_LABEL: Record<string, string> = {
  WEEKLY: "tuần",
  MONTHLY: "tháng",
};

export function RolloverBanner({ timeline, period }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rolledOver, setRolledOver] = useState(false);

  const isCurrent = isCurrentPeriod(timeline, period);
  const { data: preview, isLoading } = useRolloverPreview(timeline, period, isCurrent && !rolledOver);
  const rollover = useRolloverGoalTasks();

  if (!isCurrent || dismissed || rolledOver || isLoading) return null;
  if (!preview || preview.length === 0) return null;

  const allTasks: RolloverPreviewTask[] = preview.flatMap((g) => g.tasks);
  const totalCount = allTasks.length;

  function toggleTask(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(allTasks.map((t) => t.id)));
  }

  async function handleRollover() {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : allTasks.map((t) => t.id);
    rollover.mutate(
      { timeline, to_period: period, task_ids: ids },
      {
        onSuccess: () => {
          toast.success(`Đã chuyển ${ids.length} task sang ${TIMELINE_LABEL[timeline]} này`);
          setRolledOver(true);
        },
        onError: () => toast.error("Chuyển task thất bại"),
      }
    );
  }

  const PRIORITY_COLOR: Record<string, string> = {
    HIGH: "text-red-500",
    MEDIUM: "text-yellow-500",
    LOW: "text-blue-400",
    NONE: "text-muted-foreground",
  };

  return (
    <div className="mb-4 border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <RefreshCw className="h-4 w-4 text-orange-500 flex-shrink-0" />
        <p className="flex-1 text-sm text-orange-700 dark:text-orange-400">
          Có <span className="font-semibold">{totalCount} task</span> chưa hoàn thành từ{" "}
          {TIMELINE_LABEL[timeline]} trước
        </p>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-orange-500 hover:text-orange-700 cursor-pointer p-0.5"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-orange-400 hover:text-orange-600 cursor-pointer p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-orange-200 dark:border-orange-900/40 px-3 py-2">
          {preview.map((goal) => (
            <div key={goal.goal_id} className="mb-3 last:mb-0">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                {goal.goal_title}
              </p>
              {goal.tasks.map((task) => (
                <label key={task.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => toggleTask(task.id)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-sm flex-1">{task.title}</span>
                  {task.priority !== "NONE" && (
                    <span className={`text-xs ${PRIORITY_COLOR[task.priority]}`}>
                      {task.priority === "HIGH" ? "Cao" : task.priority === "MEDIUM" ? "TB" : "Thấp"}
                    </span>
                  )}
                </label>
              ))}
            </div>
          ))}

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-orange-200 dark:border-orange-900/40">
            <button
              onClick={selectAll}
              className="text-xs text-orange-600 hover:underline cursor-pointer"
            >
              Chọn tất cả
            </button>
            <span className="text-orange-300 text-xs">|</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:underline cursor-pointer"
            >
              Bỏ chọn
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={handleRollover}
              disabled={rollover.isPending}
              className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              {rollover.isPending
                ? "Đang chuyển..."
                : selectedIds.size > 0
                ? `Chuyển ${selectedIds.size} task`
                : `Chuyển tất cả (${totalCount})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
