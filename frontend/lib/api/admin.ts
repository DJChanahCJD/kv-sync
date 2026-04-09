import { API_URL, unwrap } from "./config";
import type { ApiKeyMeta, ApiKeyEntry } from "@shared/types";

/** 统一的管理端 fetch，携带 Cookie 凭据 */
function adminFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
}

/** API key 创建结果 */
export interface CreateApiKeyResult {
  api_key: string;
  meta: ApiKeyMeta;
}

/** API key 列表结果 */
export interface ListApiKeysResult {
  items: ApiKeyEntry[];
  list_complete: boolean;
  cursor: string | null;
}

/**
 * 创建 API key，prefix 可选（仅字母/数字/下划线，1~20 位）
 */
export async function createApiKey(
  note: string,
  prefix?: string
): Promise<CreateApiKeyResult> {
  return unwrap<CreateApiKeyResult>(
    adminFetch("/admin/api-keys", {
      method: "POST",
      body: JSON.stringify({ note, ...(prefix ? { prefix } : {}) }),
    })
  );
}

/**
 * 列出所有 API keys
 */
export async function listApiKeys(
  params?: { limit?: number; cursor?: string }
): Promise<ListApiKeysResult> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  const query = qs.toString() ? `?${qs}` : "";
  return unwrap<ListApiKeysResult>(adminFetch(`/admin/api-keys${query}`));
}

/**
 * 删除（吊销）API key
 */
export async function deleteApiKey(keyRef: string): Promise<void> {
  return unwrap<void>(
    adminFetch(`/admin/api-keys/${encodeURIComponent(keyRef)}`, {
      method: "DELETE",
    })
  );
}

/**
 * 切换 API key 状态（active ↔ revoked）
 */
export async function updateApiKeyStatus(
  keyRef: string,
  status: "active" | "revoked"
): Promise<{ meta: ApiKeyMeta }> {
  return unwrap<{ meta: ApiKeyMeta }>(
    adminFetch(`/admin/api-keys/${encodeURIComponent(keyRef)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  );
}
