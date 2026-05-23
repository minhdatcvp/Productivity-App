"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, ChevronDown, ChevronRight, Minus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, TaskPriority, TaskStatus, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";

const PRIORITY_BADGE: Record<TaskPriority, string | null> = {
  HIGH: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  MEDIUM: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOW: "bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400",
  NONE: null,
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Cao",
  MEDIUM: "TB",
  LOW: "Thấp",
  NONE: "",
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "Cần làm" },
  { value: "IN_PROGRESS", label: "Đang làm" },
  { value: "DONE", label: "Xong" },
  { value: "CANCELLED", label: "Huỷ" },
];

const STATUS_TRIGGER: Record<TaskStatus, string> = {
  TODO: "border-transparent bg-transparent text-muted-foreground/60 hover:bg-muted/50",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  DONE: "border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
  CANCELLED: "border-red-200 bg-red-50 text-red-500 dark:border-red-800 dark:bg-red-900/20",
};

interface Props {
  task: Task;
  goalId?: string;
  depth?: number;
  // passed from parent when in multi-select mode
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function TaskItem({
  task,
  goalId,
  depth = 0,
  selectMode: externalSelectMode,
  selectedIds: externalSelectedIds,
  onToggleSelect: externalToggleSelect,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(task.notes ?? "");

  // multi-select state — only owned at depth=0
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useDeleteTask(goalId);
  const update = useUpdateTask(goalId);
  const qc = useQueryClient();

  // if external props provided (e.g. from DailyTaskList), use them; otherwise manage own state
  const hasExternalSelect = externalSelectMode !== undefined;
  const isInSelectMode = hasExternalSelect ? externalSelectMode : selectMode;
  const activeSelectedIds = hasExternalSelect ? (externalSelectedIds ?? new Set<string>()) : selectedIds;
  const handleToggleSelect = hasExternalSelect
    ? (externalToggleSelect ?? (() => {}))
    : (id: string) =>
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });

  const isDone = task.status === "DONE";
  const currentStatus = (task.status ?? "TODO") as TaskStatus;
  const isSelected = activeSelectedIds.has(task.id);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    remove.mutate(task.id, { onError: () => toast.error("Xoá thất bại") });
  }

  function handleStatusChange(value: string | null) {
    if (!value) return;
    update.mutate(
      { taskId: task.id, status: value as TaskStatus },
      { onError: () => toast.error("Cập nhật thất bại") }
    );
  }

  function saveTitle() {
    const trimmed = titleVal.trim();
    if (!trimmed) { setTitleVal(task.title); setEditingTitle(false); return; }
    if (trimmed === task.title) { setEditingTitle(false); return; }
    update.mutate(
      { taskId: task.id, title: trimmed },
      { onError: () => { toast.error("Cập nhật thất bại"); setTitleVal(task.title); } }
    );
    setEditingTitle(false);
  }

  function saveNotes() {
    const trimmed = notesVal.trim();
    if (trimmed === (task.notes ?? "")) { setEditingNotes(false); return; }
    update.mutate(
      { taskId: task.id, notes: trimmed || null },
      { onError: () => { toast.error("Lưu ghi chú thất bại"); setNotesVal(task.notes ?? ""); } }
    );
    setEditingNotes(false);
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/tasks/${id}`)));
      if (goalId) qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      toast.success(`Đã xóa ${ids.length} subtask`);
      setSelectMode(false);
      setSelectedIds(new Set());
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

  return (
    <div
      className={`group/task ${
        depth > 0
          ? `border-l pl-3 ${isInSelectMode && isSelected ? "bg-destructive/5" : ""}`
          : "border-b last:border-0"
      }`}
      style={depth > 0 ? { marginLeft: "1.5rem" } : undefined}
    >
      <div className="flex items-center gap-2.5 py-1.5">
        {/* Expand chevron */}
        {task.subtasks.length > 0 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Checkbox — only visible in select mode */}
        {isInSelectMode && (
          <button
            onClick={() => handleToggleSelect(task.id)}
            className={`h-[18px] w-[18px] rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
              isSelected
                ? "bg-destructive border-destructive"
                : "border-muted-foreground/30 hover:border-destructive"
            }`}
          >
            {isSelected && (
              <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}

        {/* Priority badge */}
        {task.priority !== "NONE" && PRIORITY_BADGE[task.priority] && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}

        {/* Title */}
        {editingTitle ? (
          <input
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); }
            }}
            className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0"
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => { setTitleVal(task.title); setEditingTitle(true); }}
            title="Double-click để chỉnh sửa"
            className={`flex-1 text-sm cursor-default select-none leading-snug ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </span>
        )}

        {/* Status dropdown */}
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger
            size="sm"
            className={`h-6 py-0 text-xs gap-1 flex-shrink-0 [&>svg]:size-3 ${STATUS_TRIGGER[currentStatus]}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notes icon */}
        {!task.notes && !editingNotes && !isInSelectMode && (
          <button
            onClick={() => { setNotesVal(""); setEditingNotes(true); }}
            className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 cursor-pointer"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Delete — hidden when in select mode */}
        {!isInSelectMode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Notes */}
      {(task.notes || editingNotes) && (
        <div className="ml-2 pb-2 pr-4">
          {editingNotes ? (
            <textarea
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setNotesVal(task.notes ?? ""); setEditingNotes(false); }
              }}
              placeholder="Ghi chú..."
              rows={2}
              className="w-full text-xs bg-transparent border-b border-primary outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/40"
              autoFocus
            />
          ) : (
            <p
              onClick={() => { setNotesVal(task.notes ?? ""); setEditingNotes(true); }}
              className="text-xs text-muted-foreground cursor-text hover:text-foreground/70 whitespace-pre-wrap"
            >
              {task.notes}
            </p>
          )}
        </div>
      )}

      {/* Subtask multi-select header — only at root level, not when external select mode active */}
      {task.subtasks.length > 0 && depth === 0 && expanded && !hasExternalSelect && (
        <div className="ml-6 border-l pl-3 flex items-center justify-end py-0.5">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <CheckSquare className="h-3 w-3" />
              Chọn nhiều
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Select all subtasks */}
              {(() => {
                const subtaskIds = task.subtasks.map((s) => s.id);
                const allSelected = subtaskIds.length > 0 && subtaskIds.every((id) => selectedIds.has(id));
                const someSelected = !allSelected && subtaskIds.some((id) => selectedIds.has(id));
                return (
                  <button
                    onClick={() =>
                      setSelectedIds(allSelected ? new Set() : new Set(subtaskIds))
                    }
                    className={`h-[14px] w-[14px] rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                      allSelected || someSelected
                        ? "bg-destructive border-destructive"
                        : "border-muted-foreground/30 hover:border-destructive"
                    }`}
                  >
                    {allSelected && (
                      <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                      </svg>
                    )}
                    {someSelected && <Minus className="h-2 w-2 text-white" />}
                  </button>
                );
              })()}
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || isDeleting}
                className="text-xs text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Đang xóa..." : `Xóa ${selectedIds.size > 0 ? selectedIds.size + " " : ""}đã chọn`}
              </button>
              <button
                onClick={exitSelectMode}
                disabled={isDeleting}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Huỷ
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subtasks */}
      {expanded &&
        task.subtasks.map((sub) => (
          <TaskItem
            key={sub.id}
            task={sub}
            goalId={goalId}
            depth={depth + 1}
            selectMode={isInSelectMode}
            selectedIds={activeSelectedIds}
            onToggleSelect={handleToggleSelect}
          />
        ))}
    </div>
  );
}
