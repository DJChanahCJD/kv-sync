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
  get<T>(recordKey: string): Promise<{ value: T; meta: RecordMeta } | null>;
  put<T>(recordKey: string, value: T): Promise<RecordMeta>;
  delete(recordKey: string): Promise<void>;
  sync<T>(
    recordKey: string,
    merge: (remote: T | null) => T | Promise<T>
  ): Promise<{ value: T; meta: RecordMeta }>;
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

function buildRecordUrl(baseUrl: string, appId: string, recordKey: string): string {
  return `${trimTrailingSlash(baseUrl)}/apps/${encodeURIComponent(appId)}/${encodeURIComponent(recordKey)}`;
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

  async function request<T>(recordKey: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${options.apiKey}`);

    if (init?.headers) {
      const extraHeaders = new Headers(init.headers);
      extraHeaders.forEach((value, key) => headers.set(key, value));
    }

    const res = await fetchImpl(buildRecordUrl(options.baseUrl, options.appId, recordKey), {
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
    async get<T>(recordKey: string): Promise<RecordResponse<T> | null> {
      try {
        return await request<RecordResponse<T>>(recordKey, { method: "GET" });
      } catch (error) {
        if (error instanceof KvSyncClientError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    async put<T>(recordKey: string, value: T): Promise<RecordMeta> {
      return request<RecordMeta>(recordKey, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: assertJsonSerializable(value),
      });
    },

    async delete(recordKey: string): Promise<void> {
      await request<null>(recordKey, { method: "DELETE" });
    },

    async sync<T>(
      recordKey: string,
      merge: (remote: T | null) => T | Promise<T>
    ): Promise<{ value: T; meta: RecordMeta }> {
      const remote = await this.get<T>(recordKey);
      const nextValue = await merge(remote?.value ?? null);
      const meta = await this.put(recordKey, nextValue);
      return { value: nextValue, meta };
    },
  };
}
