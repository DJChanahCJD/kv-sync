/** KVSync KV key 前缀常量 */
export const KV = {
  /** 记录 key 前缀：app:{appId}:{API_KEY} */
  RECORD_PREFIX: (appId: string) => `app:${appId}:`,
  /** 单条记录 key */
  RECORD_KEY: (appId: string, API_KEY: string) => `app:${appId}:${API_KEY}`,
  /** API key 前缀 */
  API_KEY_PREFIX: "api_key:",
  /** API key 存储 key */
  API_KEY: (apiKey: string) => `api_key:${apiKey}`,
} as const;