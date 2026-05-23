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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTasks";

interface Props {
  goalId: string;
  children: React.ReactNode;
}

export function CreateTaskDialog({ goalId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"CHECKBOX" | "PERCENTAGE">("CHECKBOX");
  const create = useCreateTask();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { goal_id: goalId, title, completion_type: type },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setType("CHECKBOX");
        },
        onError: () => toast.error("Tạo nhiệm vụ thất bại"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm nhiệm vụ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Tên nhiệm vụ</Label>
            <Input
              id="task-title"
              placeholder="VD: Đọc 20 trang sách"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Loại hoàn thành</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECKBOX">Tick hoàn thành</SelectItem>
                <SelectItem value="PERCENTAGE">Phần trăm (0–100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Đang thêm..." : "Thêm nhiệm vụ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
