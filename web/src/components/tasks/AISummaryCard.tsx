"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useGoalAISummary, useJobStatus, useTriggerSummary } from "@/hooks/useTasks";

interface Props {
  goalId: string;
}

export function AISummaryCard({ goalId }: Props) {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: summary, isLoading: summaryLoading } = useGoalAISummary(goalId);
  const triggerMutation = useTriggerSummary(goalId);
  const { data: jobStatus } = useJobStatus(jobId);

  useEffect(() => {
    if (jobStatus?.status === "SUCCESS" && jobId) {
      setJobId(null);
      qc.invalidateQueries({ queryKey: ["ai-summary", goalId] });
    }
  }, [jobStatus?.status, jobId, goalId, qc]);

  const handleGenerate = () => {
    triggerMutation.mutate(undefined, {
      onSuccess: (data) => setJobId(data.job_id),
    });
  };

  const isGenerating =
    triggerMutation.isPending ||
    (!!jobId && jobStatus?.status !== "SUCCESS" && jobStatus?.status !== "FAILURE");

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-500" />
          AI Summary
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-1.5 text-xs h-7"
        >
          <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Đang tạo..." : summary ? "Tạo lại" : "Tạo AI Summary"}
        </Button>
      </div>

      {summaryLoading && <div className="h-24 bg-muted rounded-lg animate-pulse" />}

      {!summaryLoading && summary && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{summary.content.summary}</p>
            <div
              className={`text-2xl font-bold shrink-0 ${
                summary.content.score >= 80
                  ? "text-green-600"
                  : summary.content.score >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {summary.content.score}
            </div>
          </div>

          {summary.content.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">Điểm mạnh</p>
              <ul className="space-y-1">
                {summary.content.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-green-500 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.content.improvements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-orange-600 mb-1">Cần cải thiện</p>
              <ul className="space-y-1">
                {summary.content.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-orange-500 shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.content.next_suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-600 mb-1">Gợi ý tiếp theo</p>
              <ul className="space-y-1">
                {summary.content.next_suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-blue-500 shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!summaryLoading && !summary && !isGenerating && (
        <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
          Chưa có AI summary. Nhấn "Tạo AI Summary" để bắt đầu.
        </p>
      )}
    </div>
  );
}
