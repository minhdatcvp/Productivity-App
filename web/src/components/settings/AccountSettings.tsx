"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe, useUpdateProfile, useChangePassword, useLogout } from "@/hooks/useAuth";

interface MeData {
  id: string;
  email: string;
  name: string;
  created_at?: string | null;
}

export function AccountSettings() {
  const { data: me } = useMe() as { data: MeData | undefined };
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [name, setName] = useState("");
  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me?.name]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const nameChanged = me ? name.trim() !== me.name && name.trim().length > 0 : false;

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameChanged) return;
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      toast.success("Đã cập nhật tên");
    } catch {
      toast.error("Cập nhật thất bại");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      await changePassword.mutateAsync({ current_password: currentPassword, new_password: newPassword });
      toast.success("Đã đổi mật khẩu");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Đổi mật khẩu thất bại";
      toast.error(detail);
    }
  }

  const initial = (me?.name || me?.email || "?").charAt(0).toUpperCase();
  const joined = me?.created_at ? new Date(me.created_at).toLocaleDateString("vi-VN") : null;

  return (
    <div className="space-y-5">
      {/* Profile summary */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{me?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground truncate">{me?.email ?? "—"}</p>
            {joined && <p className="text-xs text-muted-foreground mt-0.5">Tham gia: {joined}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Edit name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={me?.email ?? ""} disabled className="mt-1 bg-muted/50" />
            </div>
            <div>
              <Label>Tên hiển thị</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="mt-1" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!nameChanged || updateProfile.isPending}>
                Lưu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label>Mật khẩu hiện tại</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label>Mật khẩu mới</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label>Xác nhận mật khẩu mới</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!currentPassword || !newPassword || !confirmPassword || changePassword.isPending}
              >
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-medium text-sm">Phiên đăng nhập</p>
            <p className="text-xs text-muted-foreground">Đăng xuất khỏi thiết bị này</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1.5" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
