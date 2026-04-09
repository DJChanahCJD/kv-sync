import { Hono } from "hono";
import type { Env } from "./types/hono";
import { corsMiddleware } from "./middleware/cors";
import { authRoutes } from "./routes/auth";
import { proxyRoutes } from "./routes/proxy";
import { recordsRoutes } from "./routes/records";
import { adminRoutes } from "./routes/admin";

export const app = new Hono<{ Bindings: Env }>().basePath("");

// Global Middleware
app.use("*", corsMiddleware);

// Health check（公开，无鉴权）
app.get("/healthz", (c) => c.json({ ok: true }));

// 管理员登录 / 代理（原有功能保留）
app.route("/auth", authRoutes);
app.route("/proxy", proxyRoutes);

// KVSync 数据面（Bearer API key 认证）
app.route("/apps", recordsRoutes);

// KVSync 管理面（Bearer ADM token 认证）
app.route("/admin", adminRoutes);

// Export AppType for RPC
export type AppType = typeof app;
