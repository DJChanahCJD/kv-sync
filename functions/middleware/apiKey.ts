import { createMiddleware } from "hono/factory";
import type { Env } from "../types/hono";
import type { ApiKeyMeta } from "@kv-sync/shared";
import { KV } from "../types/index";
import { fail } from "@utils/response";

/**
 * 从 Authorization 头提取 Bearer token
 */
function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * 数据面中间件：验证 API key
 * 从 Authorization: Bearer <key> 提取，到 KV 查询 api_key:{key} 的 metadata，
 * 校验 status === "active"。
 */
export const apiKeyMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const token = extractBearer(c.req.header("Authorization"));
    if (!token) {
      return fail(c, "Missing API key", 401);
    }

    const kv = c.env.KV_SYNC;
    const { metadata } = await kv.getWithMetadata<ApiKeyMeta>(
      KV.API_KEY(token)
    );

    if (!metadata || metadata.status !== "active") {
      return fail(c, "Invalid or revoked API key", 401);
    }

    await next();
  }
);
