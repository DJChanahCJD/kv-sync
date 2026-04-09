"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Key, Loader2, Plus, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { createApiKey, deleteApiKey, listApiKeys, updateApiKeyStatus, type ListApiKeysResult } from "@/lib/api/admin";
import type { ApiKeyEntry } from "@shared/types";
import { formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const [listResult, setListResult] = useState<ListApiKeysResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusPending, setStatusPending] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [prefix, setPrefix] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const loadKeys = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const result = await listApiKeys({ limit: 100 });
        setListResult(result);
      } catch (e: any) {
        toast.error(e.message || "加载失败");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate() {
    setCreating(true);
    try {
      const finalNote = note.trim(); 
      const result = await createApiKey(finalNote, prefix.trim() || undefined);
      setNewKey(result.api_key);
      setNote("");
      setPrefix("");
      toast.success("API key 已创建");
      loadKeys(true);
    } catch (e: any) {
      toast.error(e.message || "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(keyRef: string, current: "active" | "revoked") {
    const next = current === "active" ? "revoked" : "active";
    setStatusPending((prev) => ({ ...prev, [keyRef]: true }));
    try {
      await updateApiKeyStatus(keyRef, next);
      toast.success(next === "active" ? "已启用" : "已停用");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setStatusPending((prev) => {
        const { [keyRef]: _ignored, ...rest } = prev;
        return rest;
      });
      loadKeys(true);
    }
  }

  async function handleDelete(keyRef: string) {
    if (!window.confirm("确认删除此 API Key？\n删除后操作不可恢复，使用此密钥的请求将立即被拒绝。")) {
      return;
    }
    try {
      await deleteApiKey(keyRef);
      toast.success("已吊销");
      loadKeys(true);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  }

  const items: ApiKeyEntry[] = listResult?.items ?? [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            管理数据面访问凭证，每个 Key 对应一个独立的应用接入点。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadKeys(true)}
            disabled={refreshing}
            className="h-9 px-3"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>

          {/* 创建对话框 */}
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) { setNewKey(null); setNote(""); setPrefix(""); }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" />
                新建 Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {newKey ? (
                /* 创建成功：展示 key */
                <div className="flex flex-col items-center text-center pt-4 pb-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
                  </div>
                  <DialogTitle className="text-xl mb-2">创建成功</DialogTitle>
                  <DialogDescription className="mb-6">
                    请立即复制您的 API Key。出于安全考虑，此 Key <strong>仅显示一次</strong>。
                  </DialogDescription>
                  <div className="flex items-center w-full gap-2 p-1.5 bg-muted/50 rounded-lg border">
                    <code className="flex-1 px-3 py-2 text-sm font-mono text-left break-all text-foreground">
                      {newKey}
                    </code>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(newKey)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button className="w-full mt-6" onClick={() => { setCreateOpen(false); setNewKey(null); }}>
                    已复制，完成
                  </Button>
                </div>
              ) : (
                /* 创建表单 */
                <>
                  <DialogHeader>
                    <DialogTitle>新建 API Key</DialogTitle>
                    <DialogDescription>配置您的专属访问密钥，建议按项目或用途区分。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="font-medium">
                        前缀
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">（可选，限字母/数字/下划线，≤20 位）</span>
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
                        备注 <span className="ml-1.5 text-xs text-muted-foreground font-normal">（可选）</span>
                      </Label>
                      <Input
                        id="note"
                        placeholder="例如：生产环境数据同步脚本"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleCreate} disabled={creating} className="min-w-[80px]">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "生成 Key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 快速入门卡片 */}
      <Card className="border-muted bg-muted/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            🚀 快速接入
          </CardTitle>
          <CardDescription>通过 HTTP API 快速将数据写入你的应用。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 dark:bg-zinc-900 text-zinc-50 p-4 font-mono text-sm leading-relaxed overflow-x-auto shadow-inner">
            <span className="text-zinc-500"># 写入一条 JSON 记录</span>
            <br />
            <span className="text-pink-400">curl</span> -X PUT <span className="text-blue-300">{"{API_URL}"}</span>/apps/<span className="text-blue-300">{"{appId}"}</span>/records/<span className="text-blue-300">{"{key}"}</span> \
            <br />
            {"  "}-H <span className="text-green-300">&quot;Authorization: Bearer {"{YOUR_API_KEY}"}&quot;</span> \
            <br />
            {"  "}-H <span className="text-green-300">&quot;Content-Type: application/json&quot;</span> \
            <br />
            {"  "}-d <span className="text-amber-300">&apos;{"{"}...your JSON...{"}"}&apos;</span>
          </div>
        </CardContent>
      </Card>

      {/* API Key 列表 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0 border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center">
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
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Key className="w-6 h-6 text-muted-foreground/60" />
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
                  <TableHead className="text-right pr-6 w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <KeyRow
                    key={item.keyRef}
                    item={item}
                    isStatusPending={Boolean(statusPending[item.keyRef])}
                    onDelete={() => handleDelete(item.keyRef)}
                    onCopy={() => copyToClipboard(item.keyRef)}
                    onToggleStatus={() => handleToggleStatus(item.keyRef, item.meta.status)}
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
  const isActive = meta.status === "active";
  const displayKey = keyRef.length > 12 ? `${keyRef.slice(0, 12)}…` : keyRef;

  return (
    <TableRow className={`group transition-colors hover:bg-muted/40 ${!isActive ? "opacity-60 bg-muted/20" : ""}`}>
      <TableCell className="pl-6">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-foreground bg-muted/80 border border-border/50 rounded-md px-2 py-1">
            {displayKey}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCopy}
            title="复制 Ref"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium max-w-[200px] truncate" title={meta.note}>
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
      <TableCell className="text-right pr-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          title="删除"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
