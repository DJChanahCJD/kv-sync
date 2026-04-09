import {
  createKvSyncClient,
  KvSyncClientError,
  type KvSyncClient,
  type KvSyncClientOptions,
} from "@djchan/kv-sync";
import { API_URL } from "./config";

export { KvSyncClientError };
export type { KvSyncClient, KvSyncClientOptions };

export function createFrontendKvSyncClient(
  options: Omit<KvSyncClientOptions, "baseUrl">
): KvSyncClient {
  return createKvSyncClient({
    ...options,
    baseUrl: API_URL,
  });
}
