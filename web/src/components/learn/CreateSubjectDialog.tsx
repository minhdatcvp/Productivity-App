"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LearningTemplate } from "@/hooks/useLearn";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
const ICONS = ["📚", "🇬🇧", "🇰🇷", "🇯🇵", "🐍", "⚙️", "🎵", "🎨", "🔢", "🧪"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: LearningTemplate[];
  onSubmit: (data: { name: string; icon: string; color: string; template_id?: string }) => void;
  loading?: boolean;
}

export function CreateSubjectDialog({ open, onOpenChange, templates, onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [color, setColor] = useState(COLORS[0]);
  const [templateId, setTemplateId] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), icon, color, template_id: templateId || undefined });
    setName(""); setIcon("📚"); setColor(COLORS[0]); setTemplateId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo môn học mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tên môn học</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Tiếng Anh, Python..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`text-xl p-1.5 rounded border-2 ${icon === i ? "border-primary" : "border-transparent"}`}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Màu sắc</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <Label>Template (tùy chọn)</Label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Chọn template...";
                      const t = templates.find((t) => t.id === value);
                      return t ? `${t.name} (${t.template_blocks.length} blocks)` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không dùng template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.template_blocks.length} blocks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              Tạo môn học
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
