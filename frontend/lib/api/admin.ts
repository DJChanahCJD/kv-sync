import type { ApiKeyEntry, ApiKeyMeta } from "@shared/types";
import { client } from "./client";
import { unwrap } from "./config";

export interface CreateApiKeyResult {
  api_key: string;
  meta: ApiKeyMeta;
}

export interface ListApiKeysResult {
  items: ApiKeyEntry[];
  list_complete: boolean;
  cursor: string | null;
}

export async function createApiKey(
  note: string,
  prefix?: string
): Promise<CreateApiKeyResult> {
  return unwrap<CreateApiKeyResult>(
    client.admin["api-keys"].$post({
      json: { note, ...(prefix ? { prefix } : {}) },
    })
  );
}

export async function listApiKeys(
  params?: { limit?: number; cursor?: string }
): Promise<ListApiKeysResult> {
  return unwrap<ListApiKeysResult>(
    client.admin["api-keys"].$get({
      query: {
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.cursor ? { cursor: params.cursor } : {}),
      },
    })
  );
}

export async function deleteApiKey(keyRef: string): Promise<void> {
  return unwrap<void>(
    client.admin["api-keys"][":keyRef"].$delete({
      param: { keyRef },
    })
  );
}

export async function updateApiKeyStatus(
  keyRef: string,
  status: "on" | "off"
): Promise<{ meta: ApiKeyMeta }> {
  return unwrap<{ meta: ApiKeyMeta }>(
    client.admin["api-keys"][":keyRef"].status.$patch({
      param: { keyRef },
      json: { status },
    })
  );
}
