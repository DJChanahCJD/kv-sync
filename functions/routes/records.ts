import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/hono";
import { KV } from "../types/index";
import { apiKeyMiddleware } from "../middleware/apiKey";
import { ok, fail } from "@utils/response";
import { RecordMeta, RecordEntry } from "@shared/types";

const records = new Hono<{ Bindings: Env }>();

// 挂载 API key 认证
records.use("*", apiKeyMiddleware);

/**
 * PUT /apps/:appId/:apiKey
 * 写入 JSON 快照（覆盖式 upsert），返回 metadata
 */
records.put("/:appId/:apiKey", async (c) => {
  const { appId, apiKey } = c.req.param();
  const bodyText = await c.req.text();

  // 校验必须为合法 JSON
  try {
    JSON.parse(bodyText);
  } catch {
    return fail(c, "Request body must be valid JSON", 400);
  }

  const meta: RecordMeta = {
    size: new TextEncoder().encode(bodyText).length,
    updatedAt: new Date().toISOString(),
  };

  await c.env.KV_SYNC.put(KV.RECORD_KEY(appId, apiKey), bodyText, {
    metadata: meta,
  });

  return ok(c, meta, undefined, 200);
});

/**
 * GET /apps/:appId/:apiKey
 * 读取单条记录，返回 value + metadata
 */
records.get("/:appId/:apiKey", async (c) => {
  const { appId, apiKey } = c.req.param();
  const { value, metadata } = await c.env.KV_SYNC.getWithMetadata<RecordMeta>(
    KV.RECORD_KEY(appId, apiKey)
  );

  if (value === null) {
    return fail(c, "Record not found", 404);
  }

  return ok(c, { value: JSON.parse(value), meta: metadata });
});

/**
 * DELETE /apps/:appId/:apiKey
 * 删除记录
 */
records.delete("/:appId/:apiKey", async (c) => {
  const { appId, apiKey } = c.req.param();
  await c.env.KV_SYNC.delete(KV.RECORD_KEY(appId, apiKey));
  return ok(c, null, "Deleted");
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /apps/:appId/records?limit=50&cursor=...
 * 分页列出 appId 下所有 records（仅返回 metadata，不返回 value）
 */
records.get(
  "/:appId/records",
  zValidator("query", listQuerySchema),
  async (c) => {
    const { appId } = c.req.param();
    const { limit, cursor } = c.req.valid("query");

    const result = await c.env.KV_SYNC.list({
      prefix: KV.RECORD_PREFIX(appId),
      limit,
      cursor,
    });

    const prefixLen = KV.RECORD_PREFIX(appId).length;
    const items: RecordEntry[] = result.keys.map((k: any) => ({
      key: k.name.slice(prefixLen),
      meta: k.metadata as RecordMeta,
    }));

    return ok(c, {
      items,
      list_complete: result.list_complete,
      cursor: result.cursor ?? null,
    });
  }
);

export { records as recordsRoutes };
