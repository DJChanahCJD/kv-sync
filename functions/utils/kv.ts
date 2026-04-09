import type { KVNamespace } from "../types/hono";

/**
 * 读取 KV 值（JSON 反序列化），不存在时返回 fallback
 */
export async function kvGetJSON<T>(
  kv: KVNamespace,
  key: string,
  fallback: T
): Promise<T> {
  const value = await kv.get(key);
  return value ? JSON.parse(value) : fallback;
}

/**
 * 写入 KV 值（JSON 序列化，无 metadata）
 */
export async function kvPutJSON<T>(
  kv: KVNamespace,
  key: string,
  value: T
): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

/**
 * 读取 KV 值及其 metadata
 */
export async function kvGetWithMeta<TMeta = unknown>(
  kv: KVNamespace,
  key: string
): Promise<{ value: string | null; metadata: TMeta | null }> {
  return kv.getWithMetadata<TMeta>(key);
}

/**
 * 写入 KV 值及 metadata
 */
export async function kvPutWithMeta(
  kv: KVNamespace,
  key: string,
  value: string,
  metadata: unknown
): Promise<void> {
  await kv.put(key, value, { metadata });
}
