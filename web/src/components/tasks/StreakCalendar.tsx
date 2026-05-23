"use client";

import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { useStreakHistory, useStreaks } from "@/hooks/useTasks";
import { Timeline, getCurrentPeriod, shiftPeriod } from "@/lib/period";

interface Props {
  timeline: Timeline;
}

const STREAK_LABEL: Record<Timeline, string> = {
  DAILY: "day streak",
  WEEKLY: "week streak",
  MONTHLY: "month streak",
};

function buildLast7(timeline: Timeline, today: string): { period: string; label: string }[] {
  if (timeline === "DAILY") {
    const d = new Date(today + "T00:00:00");
    const dow = d.getDay();
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysFromMonday);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const period = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      return { period, label: labels[i] };
    });
  }
  if (timeline === "WEEKLY") {
    return Array.from({ length: 7 }, (_, i) => ({
      period: shiftPeriod("WEEKLY", today, i - 6),
      label: `W${i + 1}`,
    }));
  }
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return Array.from({ length: 7 }, (_, i) => {
    const p = shiftPeriod("MONTHLY", today, i - 6);
    const m = parseInt(p.split("-")[1]) - 1;
    return { period: p, label: monthLabels[m] };
  });
}

export function StreakCalendar({ timeline }: Props) {
  const { data: streaks } = useStreaks();
  const { data: history } = useStreakHistory(timeline);

  const streak = streaks?.find((s) => s.type === timeline);
  const completedSet = new Set(history ?? []);
  const today = getCurrentPeriod(timeline);
  const count = streak?.current ?? 0;
  const active = count > 0;
  const items = buildLast7(timeline, today);

  return (
    <Link
      href={`/tasks/streak?timeline=${timeline}`}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer mb-4"
    >
      {/* Flame + count */}
      <Flame
        className={`h-5 w-5 flex-shrink-0 ${active ? "text-orange-500" : "text-muted-foreground/30"}`}
      />
      <div className="flex flex-col leading-none flex-shrink-0 w-12">
        <span className={`text-base font-bold tabular-nums ${active ? "" : "text-muted-foreground"}`}>
          {count}
        </span>
        <span className="text-[9px] text-muted-foreground mt-0.5">{STREAK_LABEL[timeline]}</span>
      </div>

      {/* 7 circles */}
      <div className="flex gap-1 flex-1 justify-end">
        {items.map(({ period, label }) => {
          const isDone = completedSet.has(period);
          const isToday = period === today;
          return (
            <div key={period} className="flex flex-col items-center gap-0.5">
              <div
                className={[
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  isDone
                    ? "bg-green-500"
                    : isToday
                    ? "border-2 border-orange-400"
                    : "border-2 border-muted-foreground/25",
                ].join(" ")}
              >
                {isDone && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-[8px] text-muted-foreground font-medium">{label}</span>
            </div>
          );
        })}
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
    </Link>
  );
}
