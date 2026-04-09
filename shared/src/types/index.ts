// shared/src/types/index.ts
export * from "./cloudflare";

/** 统一 API 响应类型 */
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
};

/** 记录 metadata（存于 KV metadata 字段） */
export type RecordMeta = {
  /** JSON 字节数 */
  size: number;
  /** ISO 8601 时间戳 */
  updatedAt: string;
};

/** API key metadata（存于 KV metadata 字段） */
export type ApiKeyMeta = {
  api_key: string;
  note: string;
  createdAt: string;
  status: "active" | "revoked";
};

/** list records 单条结果 */
export type RecordEntry = {
  /** recordKey（去掉前缀后的短 key） */
  key: string;
  meta: RecordMeta;
};

/** list api-keys 单条结果 */
export type ApiKeyEntry = {
  keyRef: string;
  meta: ApiKeyMeta;
};
