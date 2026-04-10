type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type RecordMeta = {
  size: number;
  updatedAt: string;
};

export interface KvSyncClientOptions {
  baseUrl: string;
  appId: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

export interface KvSyncClient {
  get<T>(): Promise<{ value: T; meta: RecordMeta } | null>;
  put<T>(value: T): Promise<RecordMeta>;
  delete(): Promise<void>;
  mergeAndSync<T>(options: MergeAndSyncOptions<T>): Promise<{ value: T; meta: RecordMeta }>;
}

export interface MergeAndSyncOptions<T> {
  merge: (remote: T | null) => T | Promise<T>;
  onSuccess?: (result: { value: T; meta: RecordMeta }) => void | Promise<void>;
}

export class KvSyncClientError extends Error {
  status: number;
  code?: string;
  responseText?: string;

  constructor(message: string, options: { status: number; code?: string; responseText?: string }) {
    super(message);
    this.name = "KvSyncClientError";
    this.status = options.status;
    this.code = options.code;
    this.responseText = options.responseText;
  }
}

type RecordResponse<T> = { value: T; meta: RecordMeta };

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildRecordUrl(baseUrl: string, appId: string, apiKey: string): string {
  return `${trimTrailingSlash(baseUrl)}/api/apps/${encodeURIComponent(appId)}/${encodeURIComponent(apiKey)}`;
}

async function parseBody<T>(res: Response): Promise<{ rawText: string; body: ApiResponse<T> | null }> {
  const rawText = await res.text();
  if (!rawText) {
    return { rawText, body: null };
  }

  try {
    return {
      rawText,
      body: JSON.parse(rawText) as ApiResponse<T>,
    };
  } catch {
    return { rawText, body: null };
  }
}

function assertJsonSerializable(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("KVSync value must be JSON-serializable");
  }
  return serialized;
}

export function createKvSyncClient(options: KvSyncClientOptions): KvSyncClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required");
  }

  async function request<T>(init?: RequestInit): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${options.apiKey}`);

    if (init?.headers) {
      const extraHeaders = new Headers(init.headers);
      extraHeaders.forEach((value, key) => headers.set(key, value));
    }

    const res = await fetchImpl(buildRecordUrl(options.baseUrl, options.appId, options.apiKey), {
      ...init,
      headers,
    });

    const { rawText, body } = await parseBody<T>(res);
    if (!res.ok) {
      throw new KvSyncClientError(
        body?.message || rawText || `KVSync request failed with status ${res.status}`,
        {
          status: res.status,
          responseText: rawText || undefined,
        }
      );
    }

    if (!body?.success) {
      throw new KvSyncClientError(body?.message || "KVSync request failed", {
        status: res.status,
        responseText: rawText || undefined,
      });
    }

    return body.data as T;
  }

  return {
    async get<T>(): Promise<RecordResponse<T> | null> {
      try {
        return await request<RecordResponse<T>>({ method: "GET" });
      } catch (error) {
        if (error instanceof KvSyncClientError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    async put<T>(value: T): Promise<RecordMeta> {
      return request<RecordMeta>({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: assertJsonSerializable(value),
      });
    },

    async delete(): Promise<void> {
      await request<null>({ method: "DELETE" });
    },

    async mergeAndSync<T>(options: MergeAndSyncOptions<T>): Promise<{ value: T; meta: RecordMeta }> {
      const remote = await this.get<T>();
      const nextValue = await options.merge(remote?.value ?? null);
      const meta = await this.put(nextValue);
      const result = { value: nextValue, meta };
      await options.onSuccess?.(result);
      return result;
    },
  };
}
