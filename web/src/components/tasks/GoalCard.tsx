"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Goal, useDeleteGoal } from "@/hooks/useTasks";
import { ProgressRing } from "./ProgressRing";

interface Props {
  goal: Goal;
}

const STATUS_LABEL: Record<Goal["status"], string> = {
  ACTIVE: "Đang làm",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
  ARCHIVED: "Lưu trữ",
};

const STATUS_COLOR: Record<Goal["status"], string> = {
  ACTIVE: "text-blue-600 bg-blue-50",
  COMPLETED: "text-green-600 bg-green-50",
  FAILED: "text-red-600 bg-red-50",
  ARCHIVED: "text-gray-500 bg-gray-100",
};

export function GoalCard({ goal }: Props) {
  const deleteGoal = useDeleteGoal();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Xoá mục tiêu "${goal.title}"?`)) return;
    deleteGoal.mutate(goal.id, {
      onError: () => toast.error("Xoá thất bại"),
    });
  }

  return (
    <Link href={`/tasks/goals/${goal.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <ProgressRing progress={goal.progress} />
            <span className="absolute text-xs font-semibold">{goal.progress}%</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[goal.status]}`}
              >
                {STATUS_LABEL[goal.status]}
              </span>
            </div>
            <p className="font-medium text-sm truncate">{goal.title}</p>
            {goal.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{goal.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {goal.completed_task_count}/{goal.task_count} nhiệm vụ
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteGoal.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
