var assert = require("assert");

const API_URL = "http://localhost:8080";
const PASSWORD = "123456";
let ADMIN_COOKIE = null;
let createKvSyncClient = null;
let KvSyncClientError = null;

// ── 工具函数 ────────────────────────────────────────────────────────────────

/** 发送 JSON 请求并返回 { status, body } */
async function req(method, path, { token, body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

before("load sdk module", async function () {
  const sdk = await import("../client/src/index.ts");
  createKvSyncClient = sdk.createKvSyncClient;
  KvSyncClientError = sdk.KvSyncClientError;
});

// ── 原有管理员登录测试（保留）───────────────────────────────────────────────

describe("Auth Endpoints", function () {
  this.timeout(10000);

  it("should login successfully with correct password", async function () {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.success);
    assert.ok(data.data.token);
    const cookie = res.headers.get("set-cookie");
    assert.ok(cookie && cookie.includes("auth="), "Expected auth cookie");
    ADMIN_COOKIE = cookie;
  });

  it("should fail with incorrect password", async function () {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });
});

// ── Health Check ────────────────────────────────────────────────────────────

describe("Health Check", function () {
  this.timeout(10000);

  it("GET /healthz should return ok", async function () {
    const res = await fetch(`${API_URL}/healthz`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.ok, true);
  });
});

// ── Admin API Keys ───────────────────────────────────────────────────────────

describe("Admin API Keys", function () {
  this.timeout(20000);

  /** 测试过程中创建的 key，用于后续清理 */
  let createdKey = null;

  before("login as admin", async function () {
    if (ADMIN_COOKIE) return;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    assert.strictEqual(res.status, 200);
    ADMIN_COOKIE = res.headers.get("set-cookie");
    assert.ok(
      ADMIN_COOKIE && ADMIN_COOKIE.includes("auth="),
      "Expected admin auth cookie"
    );
  });

  it("POST /admin/api-keys should reject missing ADM token", async function () {
    const { status } = await req("POST", "/admin/api-keys", {
      body: { note: "test" },
    });
    assert.strictEqual(status, 401);
  });

  it("POST /admin/api-keys should reject wrong ADM token", async function () {
    const { status } = await req("POST", "/admin/api-keys", {
      cookie: "auth=wrong_token",
      body: { note: "test" },
    });
    assert.strictEqual(status, 401);
  });

  it("POST /admin/api-keys should create a new API key", async function () {
    const { status, body } = await req("POST", "/admin/api-keys", {
      cookie: ADMIN_COOKIE,
      body: { note: "integration test key" },
    });
    assert.strictEqual(status, 201);
    assert.ok(body.success);
    assert.ok(body.data.api_key.startsWith("ksk_"), "Key should start with ksk_");
    assert.strictEqual(body.data.meta.status, "active");
    assert.strictEqual(body.data.meta.note, "integration test key");
    createdKey = body.data.api_key;
  });

  it("GET /admin/api-keys should list created key", async function () {
    const { status, body } = await req("GET", "/admin/api-keys?limit=100", {
      cookie: ADMIN_COOKIE,
    });
    assert.strictEqual(status, 200);
    assert.ok(body.success);
    const found = body.data.items.some((item) => item.keyRef === createdKey);
    assert.ok(found, "Created key should appear in list");
  });

  it("DELETE /admin/api-keys/:keyRef should revoke the key", async function () {
    assert.ok(createdKey, "Need a key to delete");
    const { status, body } = await req(
      "DELETE",
      `/admin/api-keys/${createdKey}`,
      { cookie: ADMIN_COOKIE }
    );
    assert.strictEqual(status, 200);
    assert.ok(body.success);
    createdKey = null;
  });

  it("DELETE /admin/api-keys/:keyRef should 404 for non-existent key", async function () {
    const { status } = await req("DELETE", "/admin/api-keys/nonexistent_key", {
      cookie: ADMIN_COOKIE,
    });
    assert.strictEqual(status, 404);
  });
});

// ── Records CRUD ─────────────────────────────────────────────────────────────

describe("Records CRUD", function () {
  this.timeout(30000);

  const APP_ID = "test-app";
  const RECORD_KEY = "test-record";
  /** 用于数据面操作的 API key */
  let apiKey = null;

  before("create an API key for data-plane tests", async function () {
    const { status, body } = await req("POST", "/admin/api-keys", {
      cookie: ADMIN_COOKIE,
      body: { note: "records test key" },
    });
    assert.strictEqual(status, 201, "Failed to create API key for tests");
    apiKey = body.data.api_key;
  });

  after("revoke the test API key", async function () {
    if (apiKey) {
      await req("DELETE", `/admin/api-keys/${apiKey}`, { cookie: ADMIN_COOKIE });
    }
  });

  it("PUT should reject missing API key", async function () {
    const { status } = await req("PUT", `/apps/${APP_ID}/${RECORD_KEY}`, {
      body: { hello: "world" },
    });
    assert.strictEqual(status, 401);
  });

  it("PUT should reject invalid JSON body", async function () {
    const res = await fetch(
      `${API_URL}/apps/${APP_ID}/${RECORD_KEY}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
          Authorization: `Bearer ${apiKey}`,
        },
        body: "not json at all",
      }
    );
    assert.strictEqual(res.status, 400);
  });

  it("PUT should write a record and return metadata", async function () {
    const { status, body } = await req(
      "PUT",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey, body: { hello: "world", count: 1 } }
    );
    assert.strictEqual(status, 200);
    assert.ok(body.success);
    assert.ok(body.data.size > 0);
    assert.ok(body.data.updatedAt);
  });

  it("GET should read the record back", async function () {
    const { status, body } = await req(
      "GET",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey }
    );
    assert.strictEqual(status, 200);
    assert.ok(body.success);
    assert.deepStrictEqual(body.data.value, { hello: "world", count: 1 });
    assert.ok(body.data.meta.size > 0);
    assert.ok(body.data.meta.updatedAt);
  });

  it("PUT should overwrite record (LWW)", async function () {
    const { body: first } = await req(
      "GET",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey }
    );
    const firstUpdatedAt = first.data.meta.updatedAt;

    await req("PUT", `/apps/${APP_ID}/${RECORD_KEY}`, {
      token: apiKey,
      body: { hello: "updated", count: 2 },
    });

    const { body: second } = await req(
      "GET",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey }
    );
    assert.ok(second.data.meta.updatedAt);
    assert.notStrictEqual(second.data.meta.updatedAt, firstUpdatedAt, "updatedAt should change on overwrite");
    assert.deepStrictEqual(second.data.value, { hello: "updated", count: 2 });
  });

  it("GET /apps/:appId/records should currently return 404", async function () {
    const { status } = await req("GET", `/apps/${APP_ID}/records?limit=50`, {
      token: apiKey,
    });
    assert.strictEqual(status, 404);
  });

  it("DELETE should remove the record", async function () {
    const { status, body } = await req(
      "DELETE",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey }
    );
    assert.strictEqual(status, 200);
    assert.ok(body.success);
  });

  it("GET should 404 after deletion", async function () {
    const { status } = await req(
      "GET",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: apiKey }
    );
    assert.strictEqual(status, 404);
  });

  it("GET /apps/:appId/records should still return 404 after deletion", async function () {
    const { status } = await req("GET", `/apps/${APP_ID}/records?limit=50`, {
      token: apiKey,
    });
    assert.strictEqual(status, 404);
  });

  it("API key should be rejected after revocation", async function () {
    // 先吊销
    await req("DELETE", `/admin/api-keys/${apiKey}`, { cookie: ADMIN_COOKIE });
    const keyToTest = apiKey;
    apiKey = null; // 防止 after hook 重复删除

    const { status } = await req(
      "GET",
      `/apps/${APP_ID}/${RECORD_KEY}`,
      { token: keyToTest }
    );
    assert.strictEqual(status, 401, "Revoked key should be rejected");
  });
});

// ── SDK Contract ─────────────────────────────────────────────────────────────

describe("@djchan/kv-sync", function () {
  this.timeout(30000);

  const APP_ID = "sdk-test-app";
  const RECORD_KEY = "profile";
  let apiKey = null;
  let client = null;

  before("create an API key for sdk tests", async function () {
    const { status, body } = await req("POST", "/admin/api-keys", {
      cookie: ADMIN_COOKIE,
      body: { note: "sdk test key" },
    });
    assert.strictEqual(status, 201, "Failed to create API key for sdk tests");
    apiKey = body.data.api_key;
    client = createKvSyncClient({
      baseUrl: API_URL,
      appId: APP_ID,
      apiKey,
    });
  });

  after("cleanup sdk test key", async function () {
    if (apiKey) {
      await req("DELETE", `/admin/api-keys/${apiKey}`, { cookie: ADMIN_COOKIE });
    }
  });

  it("get() should return null for a missing record", async function () {
    const result = await client.get("missing-record");
    assert.strictEqual(result, null);
  });

  it("put() and get() should round-trip JSON values", async function () {
    const meta = await client.put(RECORD_KEY, {
      name: "DJ",
      settings: { theme: "light" },
    });
    assert.ok(meta.size > 0);
    assert.ok(meta.updatedAt);

    const result = await client.get(RECORD_KEY);
    assert.ok(result);
    assert.deepStrictEqual(result.value, {
      name: "DJ",
      settings: { theme: "light" },
    });
    assert.strictEqual(result.meta.size, meta.size);
    assert.strictEqual(result.meta.updatedAt, meta.updatedAt);
  });

  it("sync() should follow read-full -> local merge -> write-full", async function () {
    const result = await client.sync(RECORD_KEY, (remote) => ({
      ...(remote || {}),
      settings: {
        ...(remote?.settings || {}),
        theme: "dark",
      },
      lastUsedAt: "2026-04-08T00:00:00.000Z",
    }));

    assert.deepStrictEqual(result.value, {
      name: "DJ",
      settings: { theme: "dark" },
      lastUsedAt: "2026-04-08T00:00:00.000Z",
    });
    assert.ok(result.meta.updatedAt);

    const fetched = await client.get(RECORD_KEY);
    assert.ok(fetched);
    assert.deepStrictEqual(fetched.value, result.value);
  });

  it("delete() should remove the record", async function () {
    await client.delete(RECORD_KEY);
    const result = await client.get(RECORD_KEY);
    assert.strictEqual(result, null);
  });

  it("should throw KvSyncClientError for unauthorized requests", async function () {
    const invalidClient = createKvSyncClient({
      baseUrl: API_URL,
      appId: APP_ID,
      apiKey: "ksk_invalid",
    });

    await assert.rejects(
      () => invalidClient.get(RECORD_KEY),
      (error) => {
        assert.ok(error instanceof KvSyncClientError);
        assert.strictEqual(error.status, 401);
        return true;
      }
    );
  });
});
