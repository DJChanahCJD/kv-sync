"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { login } from "@/lib/api/auth";
import { resetRedirectFlag } from "@/lib/api/client";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  updateApiKeyStatus,
  type ListApiKeysResult,
} from "@/lib/api/admin";
import type { ApiKeyEntry } from "@shared/types";
import { formatTime } from "@/lib/utils";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<"checking" | "authenticated" | "guest">("checking");
  const [listResult, setListResult] = useState<ListApiKeysResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusPending, setStatusPending] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [prefix, setPrefix] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const loadKeys = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await listApiKeys({ limit: 100 });
        setListResult(result);
        setSessionState("authenticated");
        return true;
      } catch (error: unknown) {
        const message = getErrorMessage(error, "加载失败");
        const unauthorized = message.includes("401") || message.includes("Unauthorized");

        if (unauthorized) {
          setSessionState("guest");
          setListResult(null);
          return false;
        }

        toast.error(message);
        return false;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim()) return;

    setLoggingIn(true);
    try {
      const ok = await login(password);
      if (!ok) {
        toast.error("密码错误");
        return;
      }

      toast.success("登录成功");
      resetRedirectFlag();
      setPassword("");
      const redirect =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
      const safeRedirect = redirect?.startsWith("/") ? redirect : "/admin";

      if (safeRedirect !== "/admin") {
        router.replace(safeRedirect);
        return;
      }

      setSessionState("checking");
      await loadKeys();
      router.replace("/admin");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const finalNote = note.trim();
      const result = await createApiKey(finalNote, prefix.trim() || undefined);
      setNewKey(result.api_key);
      setNote("");
      setPrefix("");
      toast.success("API key 已创建");
      void loadKeys(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "创建失败"));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(keyRef: string, current: "on" | "off") {
    const next = current === "on" ? "off" : "on";
    setStatusPending((prev) => ({ ...prev, [keyRef]: true }));
    try {
      await updateApiKeyStatus(keyRef, next);
      toast.success(next === "on" ? "已启用" : "已停用");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "操作失败"));
    } finally {
      setStatusPending((prev) => {
        const nextState = { ...prev };
        delete nextState[keyRef];
        return nextState;
      });
      void loadKeys(true);
    }
  }

  async function handleDelete(keyRef: string) {
    if (!window.confirm("确认删除此 API Key？\n删除后操作不可恢复，使用此密钥的请求将立即被拒绝。")) {
      return;
    }

    try {
      await deleteApiKey(keyRef);
      toast.success("已删除");
      void loadKeys(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "删除失败"));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  }

  if (sessionState !== "authenticated") {
    return (
      <main className="flex min-h-[calc(100vh-7rem)] items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              {sessionState === "checking" ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">KVSync</h1>
            <p className="text-sm text-muted-foreground">管理控制台</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {sessionState === "checking" ? "验证登录状态" : "管理员登录"}
              </CardTitle>
              <CardDescription>
                {sessionState === "checking" ? "正在检查当前会话…" : "输入管理密码继续"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionState === "checking" ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="输入管理密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loggingIn || !password.trim()}>
                    {loggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    登录
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const items: ApiKeyEntry[] = listResult?.items ?? [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 justify-between sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">API Keys</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            管理数据面访问凭证，每个 Key 对应一个独立的应用接入点。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadKeys(true)}
            disabled={refreshing}
            className="h-9 px-3"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                setNewKey(null);
                setNote("");
                setPrefix("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                新建 Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {newKey ? (
                <div className="flex flex-col items-center pb-2 pt-4 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                  </div>
                  <DialogTitle className="mb-2 text-xl">创建成功</DialogTitle>
                  <DialogDescription className="mb-6">
                    请立即复制您的 API Key。出于安全考虑，此 Key <strong>仅显示一次</strong>。
                  </DialogDescription>
                  <div className="flex w-full items-center gap-2 rounded-lg border bg-muted/50 p-1.5">
                    <code className="flex-1 break-all px-3 py-2 text-left font-mono text-sm text-foreground">
                      {newKey}
                    </code>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(newKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button className="mt-6 w-full" onClick={() => {
                    setCreateOpen(false);
                    setNewKey(null);
                  }}>
                    已复制，完成
                  </Button>
                </div>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>新建 API Key</DialogTitle>
                    <DialogDescription>配置您的专属访问密钥，建议按项目或用途区分。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="font-medium">
                        前缀
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          （可选，限字母/数字/下划线，≤20 位）
                        </span>
                      </Label>
                      <Input
                        id="prefix"
                        placeholder="例如：ios_app_v1"
                        value={prefix}
                        className="font-mono text-sm"
                        onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note" className="font-medium">
                        备注 <span className="ml-1.5 text-xs font-normal text-muted-foreground">（可选）</span>
                      </Label>
                      <Input
                        id="note"
                        placeholder="例如：生产环境数据同步脚本"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={() => void handleCreate()} disabled={creating} className="min-w-[80px]">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "生成 Key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-muted bg-muted/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">🚀 快速接入</CardTitle>
          <CardDescription>通过 HTTP API 快速将数据写入你的应用。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-50 shadow-inner dark:bg-zinc-900">
            <span className="text-zinc-500"># 写入一条 JSON 记录</span>
            <br />
            <span className="text-pink-400">curl</span> -X PUT <span className="text-blue-300">{"{API_URL}"}</span>/api/apps/<span className="text-blue-300">{"{appId}"}</span>/records/<span className="text-blue-300">{"{key}"}</span> \
            <br />
            {"  "}-H <span className="text-green-300">&quot;Authorization: Bearer {"{YOUR_API_KEY}"}&quot;</span> \
            <br />
            {"  "}-H <span className="text-green-300">&quot;Content-Type: application/json&quot;</span> \
            <br />
            {"  "}-d <span className="text-amber-300">&apos;{"{"}...your JSON...{"}"}&apos;</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="border-b border-border/50 px-6 py-4 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-base font-semibold">
              已有 Keys
              {!loading && (
                <Badge variant="secondary" className="ml-3 rounded-full px-2.5 font-mono">
                  {items.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Key className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm">暂无 API Key，点击右上角新建</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px] pl-6">Key 前缀</TableHead>
                  <TableHead className="max-w-[200px]">备注</TableHead>
                  <TableHead className="w-[140px]">状态</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <KeyRow
                    key={item.keyRef}
                    item={item}
                    isStatusPending={Boolean(statusPending[item.keyRef])}
                    onDelete={() => void handleDelete(item.keyRef)}
                    onCopy={() => copyToClipboard(item.keyRef)}
                    onToggleStatus={() => void handleToggleStatus(item.keyRef, item.meta.status)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KeyRow({
  item,
  isStatusPending,
  onDelete,
  onCopy,
  onToggleStatus,
}: {
  item: ApiKeyEntry;
  isStatusPending: boolean;
  onDelete: () => void;
  onCopy: () => void;
  onToggleStatus: () => void;
}) {
  const { keyRef, meta } = item;
  const isActive = meta.status === "on";
  const displayKey = keyRef.length > 12 ? `${keyRef.slice(0, 12)}…` : keyRef;

  return (
    <TableRow className={`group transition-colors hover:bg-muted/40 ${!isActive ? "bg-muted/20 opacity-60" : ""}`}>
      <TableCell className="pl-6">
        <div className="flex items-center gap-2">
          <code className="rounded-md border border-border/50 bg-muted/80 px-2 py-1 font-mono text-xs text-foreground">
            {displayKey}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCopy}
            title="复制 Ref"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm font-medium" title={meta.note}>
        {meta.note}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            disabled={isStatusPending}
            aria-label={`${meta.note || displayKey} 状态切换`}
            onCheckedChange={onToggleStatus}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
              {isActive ? "已启用" : "已停用"}
            </span>
            {isStatusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {meta.createdAt ? formatTime(meta.createdAt) : ""}
      </TableCell>
      <TableCell className="pr-6 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          title="删除"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
