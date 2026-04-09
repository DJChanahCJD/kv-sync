"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logout } from "@/lib/api/auth";
import { resetRedirectFlag } from "@/lib/api/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("已退出登录");
    resetRedirectFlag();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex h-14 items-center gap-3 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <KeyRound className="w-4 h-4 text-primary" />
            <span>KV Sync</span>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
            <LogOut className="w-4 h-4" />
            退出
          </Button>
        </div>
      </header>

      {/* 内容区 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
