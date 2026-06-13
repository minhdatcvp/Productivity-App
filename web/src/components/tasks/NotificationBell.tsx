"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Clock, AlertCircle, GraduationCap, Brain } from "lucide-react";
import { useTaskNotifications, type NotificationTask, type ActiveGoalNotification } from "@/hooks/useNotifications";
import { useLearnReminders, type AssessmentReminder, type SRSReminder } from "@/hooks/useLearn";

function formatDue(due_date: string | null): string {
  if (!due_date) return "";
  const d = new Date(due_date);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function TaskRow({ task }: { task: NotificationTask }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="flex-1 text-sm leading-snug">{task.title}</span>
      {task.due_date && (
        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDue(task.due_date)}</span>
      )}
    </div>
  );
}

function GoalRow({ goal }: { goal: ActiveGoalNotification }) {
  const urgency =
    goal.days_remaining < 0
      ? "text-red-500"
      : goal.days_remaining <= 1
      ? "text-orange-500"
      : "text-muted-foreground";

  const label =
    goal.days_remaining < 0
      ? "Đã hết hạn"
      : goal.days_remaining === 0
      ? "Hết hạn hôm nay"
      : `Còn ${goal.days_remaining} ngày`;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug truncate">{goal.goal_title}</p>
        <p className="text-xs text-muted-foreground">{goal.progress}% hoàn thành</p>
      </div>
      <span className={`text-xs flex-shrink-0 ${urgency}`}>{label}</span>
    </div>
  );
}

function AssessmentRow({ r, onClick }: { r: AssessmentReminder; onClick: () => void }) {
  const label = r.never
    ? "Chưa đánh giá"
    : r.days_overdue === 0
    ? "Đến hạn đánh giá"
    : `Trễ ${r.days_overdue} ngày`;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 py-1.5 text-left hover:opacity-80">
      <span className="text-base shrink-0">{r.icon}</span>
      <span className="flex-1 min-w-0 text-sm leading-snug truncate">{r.subject_name}</span>
      <span className={`text-xs flex-shrink-0 ${r.never || r.days_overdue > 0 ? "text-red-500" : "text-orange-500"}`}>
        {label}
      </span>
    </button>
  );
}

function SRSRow({ r, onClick }: { r: SRSReminder; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 py-1.5 text-left hover:opacity-80">
      <span className="text-base shrink-0">{r.icon}</span>
      <span className="flex-1 min-w-0 text-sm leading-snug truncate">{r.subject_name}</span>
      <span className="text-xs flex-shrink-0 text-primary">{r.due_count} thẻ</span>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data } = useTaskNotifications();
  const { data: learn } = useLearnReminders();

  const learnTotal = learn?.total ?? 0;
  const total = (data?.total ?? 0) + learnTotal;
  const hasUrgent =
    (data?.overdue.length ?? 0) > 0 || (learn?.assessments.some((a) => a.never || a.days_overdue > 0) ?? false);

  function go(subjectId: string) {
    setOpen(false);
    router.push(`/learn/${subjectId}`);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const hasNothing =
    (!data ||
      (data.overdue.length === 0 &&
        data.due_today.length === 0 &&
        data.due_soon.length === 0 &&
        data.active_goals.length === 0)) &&
    learnTotal === 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Thông báo"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
              hasUrgent ? "bg-red-500" : "bg-yellow-500"
            }`}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-semibold">Thông báo</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {hasNothing && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                Không có task cần chú ý
              </div>
            )}

            {data && data.overdue.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-medium text-red-500">Quá hạn ({data.overdue.length})</p>
                </div>
                {data.overdue.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}

            {data && data.due_today.length > 0 && (
              <div className="px-3 py-2 border-t">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-xs font-medium text-orange-500">Hôm nay ({data.due_today.length})</p>
                </div>
                {data.due_today.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}

            {data && data.due_soon.length > 0 && (
              <div className="px-3 py-2 border-t">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Sắp đến hạn</p>
                </div>
                {data.due_soon.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}

            {data && data.active_goals.length > 0 && (
              <div className="px-3 py-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Mục tiêu đang chạy</p>
                {data.active_goals.map((g) => (
                  <GoalRow key={g.goal_id} goal={g} />
                ))}
              </div>
            )}

            {learn && learn.assessments.length > 0 && (
              <div className="px-3 py-2 border-t">
                <div className="flex items-center gap-1.5 mb-1">
                  <GraduationCap className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-medium text-red-500">Cần đánh giá năng lực ({learn.assessments.length})</p>
                </div>
                {learn.assessments.map((r) => (
                  <AssessmentRow key={r.subject_id} r={r} onClick={() => go(r.subject_id)} />
                ))}
              </div>
            )}

            {learn && learn.srs.length > 0 && (
              <div className="px-3 py-2 border-t">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-primary">Flashcard cần ôn</p>
                </div>
                {learn.srs.map((r) => (
                  <SRSRow key={r.subject_id} r={r} onClick={() => go(r.subject_id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
