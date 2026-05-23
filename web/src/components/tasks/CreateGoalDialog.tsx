"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGoal } from "@/hooks/useTasks";

interface Props {
  timeline: string;
  period: string;
  children: React.ReactNode;
}

export function CreateGoalDialog({ timeline, period, children }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateGoal();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { title, description: description || undefined, timeline, period },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setDescription("");
        },
        onError: () => toast.error("Tạo mục tiêu thất bại"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo mục tiêu mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Tên mục tiêu</Label>
            <Input
              id="goal-title"
              placeholder="VD: Hoàn thành 5 bài tập mỗi ngày"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-desc">Mô tả (tuỳ chọn)</Label>
            <Textarea
              id="goal-desc"
              placeholder="Chi tiết thêm về mục tiêu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Đang tạo..." : "Tạo mục tiêu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
