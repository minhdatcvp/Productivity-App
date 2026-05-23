"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckSquare, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/tasks/TaskItem";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { ProgressRing } from "@/components/tasks/ProgressRing";
import { AISummaryCard } from "@/components/tasks/AISummaryCard";
import { AIGoalBreakdownDialog } from "@/components/tasks/AIGoalBreakdownDialog";
import { useGoal } from "@/hooks/useTasks";
import { formatPeriod } from "@/lib/period";

const TIMELINE_LABEL = { DAILY: "Ngày", WEEKLY: "Tuần", MONTHLY: "Tháng" };

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: goal, isLoading } = useGoal(id);
  const qc = useQueryClient();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  function handleToggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function handleSelectAll() {
    if (!goal) return;
    const allIds = goal.tasks.map((t) => t.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((taskId) => api.delete(`/tasks/${taskId}`)));
      qc.invalidateQueries({ queryKey: ["goal", id] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      toast.success(`Đã xóa ${ids.length} nhiệm vụ`);
      exitSelectMode();
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!goal) return null;

  const allIds = goal.tasks.map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((tid) => selectedIds.has(tid));
  const someSelected = !allSelected && allIds.some((tid) => selectedIds.has(tid));

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Button>

      {/* Goal header */}
      <div className="flex items-start gap-4 mb-6 p-4 rounded-xl border bg-card">
        <div className="relative flex items-center justify-center">
          <ProgressRing progress={goal.progress} size={72} strokeWidth={6} />
          <span className="absolute text-sm font-bold">{goal.progress}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              {TIMELINE_LABEL[goal.timeline]} · {formatPeriod(goal.timeline, goal.period)}
            </span>
          </div>
          <h1 className="text-lg font-bold leading-tight">{goal.title}</h1>
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {goal.completed_task_count}/{goal.task_count} nhiệm vụ hoàn thành
          </p>
        </div>
      </div>

      {/* AI Breakdown */}
      <AIGoalBreakdownDialog goalId={id} />

      {/* Task list header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Nhiệm vụ</span>
        {selectMode ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className={`h-[16px] w-[16px] rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                allSelected || someSelected
                  ? "bg-destructive border-destructive"
                  : "border-muted-foreground/30 hover:border-destructive"
              }`}
            >
              {allSelected && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
              )}
              {someSelected && <Minus className="h-2.5 w-2.5 text-white" />}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || isDeleting}
              className="text-sm text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Đang xóa..." : `Xóa ${selectedIds.size > 0 ? selectedIds.size + " " : ""}đã chọn`}
            </button>
            <button
              onClick={exitSelectMode}
              disabled={isDeleting}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Huỷ
            </button>
          </div>
        ) : goal.tasks.length > 0 ? (
          <button
            onClick={() => setSelectMode(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Chọn nhiều
          </button>
        ) : null}
      </div>

      {/* Tasks */}
      <div className="mb-4">
        {goal.tasks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Chưa có nhiệm vụ nào. Thêm nhiệm vụ đầu tiên bên dưới.
          </p>
        ) : (
          <div className="rounded-lg border bg-card px-3">
            {goal.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                goalId={goal.id}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add task */}
      <CreateTaskDialog goalId={goal.id}>
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Thêm nhiệm vụ
        </Button>
      </CreateTaskDialog>

      <AISummaryCard goalId={goal.id} />
    </div>
  );
}
