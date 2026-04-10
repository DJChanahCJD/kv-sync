import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/hono";
import type { ApiKeyMeta, ApiKeyEntry } from "@shared/types";
import { KV } from "../types/index";
import { ok, fail } from "@utils/response";
import { authMiddleware } from "middleware/auth";

const admin = new Hono<{ Bindings: Env }>();

// 管理面所有路由均要求 ADM token
admin.use("*", authMiddleware);

const createKeySchema = z.object({
  note: z.string().min(0).max(200).optional(),
  /** 可选前缀，仅允许字母、数字、下划线，长度 1~20 */
  prefix: z.string().regex(/^[a-zA-Z0-9_]{1,20}$/).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["on", "off"]),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  cursor: z.string().optional(),
});

/**
 * POST /api/admin/api-keys
 * 创建新 API key，返回生成的 key（仅此一次可见）
 */
admin.post("/api-keys", zValidator("json", createKeySchema), async (c) => {
  const { note, prefix } = c.req.valid("json");

  const uuid32 = crypto.randomUUID().replace(/-/g, "");
  const apiKey = prefix ? `${prefix}_${uuid32}` : `ksk_${uuid32}`;
  const meta: ApiKeyMeta = {
    api_key: apiKey,
    note: note || "",
    createdAt: new Date().toISOString(),
    status: "on",
  };

  await c.env.KV_SYNC.put(KV.API_KEY(apiKey), "", { metadata: meta });

  return ok(c, { api_key: apiKey, meta }, undefined, 201);
});

/**
 * GET /api/admin/api-keys?limit=50&cursor=...
 * 分页列出所有 API key（从 KV metadata 读取，避免 N+1）
 */
admin.get("/api-keys", zValidator("query", listQuerySchema), async (c) => {
  const { limit, cursor } = c.req.valid("query");

  const result = await c.env.KV_SYNC.list({
    prefix: KV.API_KEY_PREFIX,
    limit,
    cursor,
  });

  const prefixLen = KV.API_KEY_PREFIX.length;
  const items: ApiKeyEntry[] = result.keys.map((k: any) => ({
    keyRef: k.name.slice(prefixLen),
    meta: k.metadata as ApiKeyMeta,
  }));

  return ok(c, {
    items,
    list_complete: result.list_complete,
    cursor: result.cursor ?? null,
  });
});

/**
 * DELETE /api/admin/api-keys/:keyRef
 * 撤销（删除）指定 API key
 */
admin.delete("/api-keys/:keyRef", async (c) => {
  const { keyRef } = c.req.param();
  const kvKey = KV.API_KEY(keyRef);

  // 先检查是否存在
  const { metadata } = await c.env.KV_SYNC.getWithMetadata<ApiKeyMeta>(kvKey);
  if (!metadata) {
    return fail(c, "API key not found", 404);
  }

  await c.env.KV_SYNC.delete(kvKey);
  return ok(c, null, "API key revoked");
});

/**
 * PATCH /api/admin/api-keys/:keyRef/status
 * 切换 API key 状态（active ↔ revoked）
 */
admin.patch(
  "/api-keys/:keyRef/status",
  zValidator("json", updateStatusSchema),
  async (c) => {
    const { keyRef } = c.req.param();
    const { status } = c.req.valid("json");
    const kvKey = KV.API_KEY(keyRef);

    const { metadata } = await c.env.KV_SYNC.getWithMetadata<ApiKeyMeta>(kvKey);
    if (!metadata) {
      return fail(c, "API key not found", 404);
    }

    const updated: ApiKeyMeta = { ...metadata, status };
    await c.env.KV_SYNC.put(kvKey, "", { metadata: updated });

    return ok(c, { meta: updated });
  }
);

export { admin as adminRoutes };
