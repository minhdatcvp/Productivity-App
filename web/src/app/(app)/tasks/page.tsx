"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/tasks/GoalCard";
import { CreateGoalDialog } from "@/components/tasks/CreateGoalDialog";
import { DailyTaskList } from "@/components/tasks/DailyTaskList";
import { StreakCalendar } from "@/components/tasks/StreakCalendar";
import { RolloverBanner } from "@/components/tasks/RolloverBanner";
import { useGoals } from "@/hooks/useTasks";
import { Timeline, getCurrentPeriod, formatPeriod, shiftPeriod, isCurrentPeriod } from "@/lib/period";

const TIMELINES: { value: Timeline; label: string }[] = [
  { value: "DAILY", label: "Ngày" },
  { value: "WEEKLY", label: "Tuần" },
  { value: "MONTHLY", label: "Tháng" },
];

export default function TasksPage() {
  const [timeline, setTimeline] = useState<Timeline>("DAILY");
  const [period, setPeriod] = useState(() => getCurrentPeriod("DAILY"));

  const { data: goals, isLoading } = useGoals(timeline, period, { enabled: timeline !== "DAILY" });

  function changeTimeline(tl: Timeline) {
    setTimeline(tl);
    setPeriod(getCurrentPeriod(tl));
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Timeline tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
        {TIMELINES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => changeTimeline(value)}
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

      {/* Streak bar */}
      <StreakCalendar timeline={timeline} />

      {/* Period navigator */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => setPeriod(shiftPeriod(timeline, period, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold">{formatPeriod(timeline, period)}</p>
          {!isCurrentPeriod(timeline, period) && (
            <button
              onClick={() => setPeriod(getCurrentPeriod(timeline))}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Về hiện tại
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPeriod(shiftPeriod(timeline, period, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {timeline === "DAILY" ? (
        <DailyTaskList period={period} />
      ) : (
        <>
          <RolloverBanner timeline={timeline as "WEEKLY" | "MONTHLY"} period={period} />

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="space-y-3 mb-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Chưa có mục tiêu nào</p>
              <p className="text-sm">Tạo mục tiêu đầu tiên cho {formatPeriod(timeline, period)}</p>
            </div>
          )}

          <CreateGoalDialog timeline={timeline} period={period}>
            <Button className="w-full gap-2 mt-4" variant="outline">
              <Plus className="h-4 w-4" />
              Thêm mục tiêu
            </Button>
          </CreateGoalDialog>
        </>
      )}
    </div>
  );
}
