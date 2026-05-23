"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStreakHistory, useStreaks } from "@/hooks/useTasks";
import { Timeline, getCurrentPeriod, shiftPeriod } from "@/lib/period";

const TIMELINES: { value: Timeline; label: string }[] = [
  { value: "DAILY", label: "Ngày" },
  { value: "WEEKLY", label: "Tuần" },
  { value: "MONTHLY", label: "Tháng" },
];

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function buildDailyGrid(todayStr: string): string[][] {
  const today = new Date(todayStr + "T00:00:00");
  const dow = today.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysFromMonday);
  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 21);

  return Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + w * 7 + d);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
    })
  );
}

function buildPeriods(timeline: Timeline, count: number): string[] {
  const current = getCurrentPeriod(timeline);
  return Array.from({ length: count }, (_, i) =>
    shiftPeriod(timeline, current, -(count - 1 - i))
  );
}

function weekLabel(period: string): string {
  return `T${parseInt(period.split("-W")[1])}`;
}

function monthLabel(period: string): string {
  return `T${parseInt(period.split("-")[1])}`;
}

interface CellProps {
  period: string;
  isDone: boolean;
  isToday: boolean;
  isFuture: boolean;
}

function Cell({ period, isDone, isToday, isFuture }: CellProps) {
  return (
    <div
      title={period}
      className={[
        "aspect-square rounded-md transition-colors",
        isDone
          ? "bg-green-500 dark:bg-green-400"
          : isFuture
          ? "bg-muted/20"
          : "bg-muted",
        isToday ? "ring-2 ring-orange-500 ring-offset-1 ring-offset-background" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function StreakDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTimeline = (searchParams.get("timeline") as Timeline) ?? "DAILY";
  const [timeline, setTimeline] = useState<Timeline>(initialTimeline);

  const { data: streaks } = useStreaks();
  const { data: history } = useStreakHistory(timeline);

  const streak = streaks?.find((s) => s.type === timeline);
  const completedSet = new Set(history ?? []);
  const today = getCurrentPeriod(timeline);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Button>

      <h1 className="text-lg font-bold mb-4">Lịch sử streak</h1>

      {/* Timeline tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
        {TIMELINES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeline(value)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              timeline === value
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Streak stats */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card mb-6">
        <Flame
          className={`h-10 w-10 ${
            streak && streak.current > 0 ? "text-orange-500" : "text-muted-foreground/25"
          }`}
        />
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums">{streak?.current ?? 0}</span>
            <span className="text-sm text-muted-foreground">streak hiện tại</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kỷ lục: <span className="font-semibold text-foreground">{streak?.longest ?? 0}</span>
          </p>
        </div>
      </div>

      {/* DAILY: 4-week grid */}
      {timeline === "DAILY" && (() => {
        const grid = buildDailyGrid(today);
        return (
          <div>
            <p className="text-xs text-muted-foreground mb-2">4 tuần gần nhất</p>
            <div className="grid grid-cols-7 gap-1.5 mb-1">
              {DAY_LABELS.map((l) => (
                <div key={l} className="text-center text-xs text-muted-foreground font-medium">
                  {l}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((period) => (
                    <Cell
                      key={period}
                      period={period}
                      isDone={completedSet.has(period)}
                      isToday={period === today}
                      isFuture={period > today}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* WEEKLY: 2 rows of 8 */}
      {timeline === "WEEKLY" && (() => {
        const periods = buildPeriods("WEEKLY", 16);
        const rows = [periods.slice(0, 8), periods.slice(8)];
        return (
          <div>
            <p className="text-xs text-muted-foreground mb-2">16 tuần gần nhất</p>
            <div className="space-y-3">
              {rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-8 gap-1.5">
                  {row.map((period) => (
                    <div key={period} className="flex flex-col items-center gap-1">
                      <Cell
                        period={period}
                        isDone={completedSet.has(period)}
                        isToday={period === today}
                        isFuture={period > today}
                      />
                      <span className="text-[10px] text-muted-foreground">{weekLabel(period)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* MONTHLY: 2 rows of 6 */}
      {timeline === "MONTHLY" && (() => {
        const periods = buildPeriods("MONTHLY", 12);
        const rows = [periods.slice(0, 6), periods.slice(6)];
        return (
          <div>
            <p className="text-xs text-muted-foreground mb-2">12 tháng gần nhất</p>
            <div className="space-y-3">
              {rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-6 gap-1.5">
                  {row.map((period) => (
                    <div key={period} className="flex flex-col items-center gap-1">
                      <Cell
                        period={period}
                        isDone={completedSet.has(period)}
                        isToday={period === today}
                        isFuture={period > today}
                      />
                      <span className="text-[10px] text-muted-foreground">{monthLabel(period)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-xs text-muted-foreground">Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span className="text-xs text-muted-foreground">Chưa hoàn thành</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm ring-2 ring-orange-500 ring-offset-1" />
          <span className="text-xs text-muted-foreground">Hôm nay</span>
        </div>
      </div>
    </div>
  );
}

export default function StreakPage() {
  return (
    <Suspense>
      <StreakDetailContent />
    </Suspense>
  );
}
