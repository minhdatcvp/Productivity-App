"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckSquare, BookOpen, LayoutTemplate, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/tasks/NotificationBell";
import { useAuthStore } from "@/stores/auth";
import { useMe, useLogout } from "@/hooks/useAuth";

const nav = [
  { href: "/tasks", label: "Công việc", icon: CheckSquare },
  { href: "/learn", label: "Học tập", icon: BookOpen },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const [mounted, setMounted] = useState(false);
  const { token, initAuth, clearAuth } = useAuthStore();
  const { data: user, isLoading, isError } = useMe();

  // Run only on client — read localStorage and set mounted
  useEffect(() => {
    initAuth();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (!isLoading && isError) {
      clearAuth();
      router.push("/login");
    }
  }, [mounted, token, isLoading, isError]);

  // Before mount: spinner — identical on server & client → no hydration mismatch
  if (!mounted || (token && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col p-4 gap-2 hidden md:flex">
        <div className="px-2 py-4 mb-2">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xl text-primary">Productivity</h1>
            <NotificationBell />
          </div>
          {user && <p className="text-sm text-muted-foreground mt-1">{user.name}</p>}
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          className="justify-start gap-3 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card flex md:hidden z-50">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="flex-1">
              <div
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
