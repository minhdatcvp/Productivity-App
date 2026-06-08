"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckSquare, Minus, Pin, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useDailyTasks, useCreateTask } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./TaskItem";
import { AIDailyBreakdownDialog } from "./AIDailyBreakdownDialog";

interface Props {
  period: string;
}

export function DailyTaskList({ period }: Props) {
  const { data: tasks, isLoading } = useDailyTasks(period);
  const createTask = useCreateTask();
  const qc = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState<string>(period);
  const [pinNew, setPinNew] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setNewDate(period);
  }, [period]);

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    const payload: Parameters<typeof createTask.mutate>[0] = pinNew
      ? { title, is_pinned: true, pinned_since: period }
      : { title, due_date: newDate || period };
    createTask.mutate(payload, {
      onSuccess: () => {
        setNewTitle("");
        setPinNew(false);
        setNewDate(period);
      },
      onError: () => toast.error("Tạo task thất bại"),
    });
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/tasks/${id}`)));
      qc.invalidateQueries({ queryKey: ["daily-tasks", period] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      toast.success(`Đã xóa ${ids.length} task`);
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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const hasTasks = tasks && tasks.length > 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        {selectMode ? (
          <div className="flex items-center gap-3">
            {/* Select all */}
            {(() => {
              const allIds = (tasks ?? []).map((t) => t.id);
              const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
              const someSelected = !allSelected && allIds.some((id) => selectedIds.has(id));
              return (
                <button
                  onClick={() =>
                    setSelectedIds(allSelected ? new Set() : new Set(allIds))
                  }
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
              );
            })()}
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
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className={`flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors ${!hasTasks ? "invisible" : ""}`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Chọn nhiều
          </button>
        )}
        <AIDailyBreakdownDialog period={period} />
      </div>

      {hasTasks ? (
        <div className="rounded-lg border bg-card px-3 py-1 mb-3">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              period={period}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : (
        <p className="text-center py-10 text-sm text-muted-foreground mb-3">
          Chưa có task nào — thêm task đầu tiên bên dưới
        </p>
      )}

      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
        <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder={
            pinNew
              ? "Task ghim mỗi ngày... (Enter để lưu)"
              : "Thêm task mới... (Enter để lưu)"
          }
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
          disabled={createTask.isPending}
        />

        {/* Date picker — hidden when pin mode is on */}
        {!pinNew && (
          <label
            className="relative flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
            title="Chọn ngày"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">
              {newDate !== period ? newDate.slice(5) : ""}
            </span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value || period)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        )}

        {/* Pin toggle */}
        <button
          type="button"
          onClick={() => setPinNew((v) => !v)}
          title={pinNew ? "Bỏ ghim — task chỉ cho ngày này" : "Ghim — task hiện mỗi ngày"}
          className={`flex-shrink-0 cursor-pointer transition-colors ${
            pinNew ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pin className={`h-4 w-4 ${pinNew ? "fill-amber-500" : ""}`} />
        </button>
      </div>
    </div>
  );
}
