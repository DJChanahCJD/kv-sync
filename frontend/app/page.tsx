import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4 text-center">
        {/* 背景网格 */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-primary/15 blur-[120px]" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 flex max-w-xl flex-col items-center gap-10 duration-700">
          {/* 标题区 */}
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              KV Sync
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              基于 Cloudflare KV 的轻量 JSON 同步服务
            </p>
            <p className="text-sm text-muted-foreground/60">
              鉴权 · 读写快照 · 极简元数据
            </p>
          </div>

          {/* 进入后台按钮 */}
          <Button asChild size="lg" className="gap-2 px-8">
            <Link href="/admin">
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}