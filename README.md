# KV Sync

> A lightweight JSON snapshot sync service built on Cloudflare KV.

它只做一件事：保存和读取完整 JSON 快照。服务端负责鉴权、存储和返回 metadata，不做局部合并、不做历史版本、不承诺强一致。

## 适用场景

适合：

- 配置同步
- 草稿、偏好、轻量文档存储
- 低频覆盖式状态同步
- 内部工具的小规模数据持久化

不适合：

- 高频并发编辑
- 强一致事务
- 复杂查询
- 多人实时协作
- 服务端自动冲突合并

## 同步模型

推荐同步流程固定为：

`读全量 -> 本地 merge -> 写全量`

含义如下：

1. 客户端先读取远端完整 JSON。
2. 在本地按业务规则完成 merge。
3. 将 merge 后的完整 JSON 整体写回。

KVSync 本身是快照存储，不提供局部 patch merge。服务端每次写入都会生成新的 metadata：

- `updatedAt`
- `size`

如果需要冲突处理，应在客户端基于完整快照和本地状态完成，而不是依赖服务端做字段级合并。

## SDK

仓库内提供 browser-first 的数据面 SDK：`@djchan/kv-sync`。

推荐用法：

```ts
import { createKvSyncClient } from "@djchan/kv-sync";

const kvSyncClient = createKvSyncClient({
  baseUrl: "https://your-api.example.com",
  appId: "my-app",
  apiKey: "ksk_xxx",
});

const current = await kvSyncClient.get<{ theme: string }>("settings");

await kvSyncClient.sync("settings", (remote) => ({
  ...(remote ?? {}),
  theme: "dark",
}));
```

如果在当前 Next.js 前端中使用，可通过 `frontend/lib/api/kv-sync.ts` 创建带默认 `baseUrl` 的装配层。

## API 概览

### 健康检查

```http
GET /healthz
```

### 数据面

数据面使用 `Authorization: Bearer <apiKey>` 鉴权。

```http
PUT    /apps/:appId/:recordKey
GET    /apps/:appId/:recordKey
DELETE /apps/:appId/:recordKey
```

写入 body 必须是合法 JSON。`PUT` 为覆盖式 upsert，返回：

```json
{
  "size": 123,
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

读取返回：

```json
{
  "value": { "hello": "world" },
  "meta": {
    "size": 123,
    "updatedAt": "2026-04-08T00:00:00.000Z"
  }
}
```

### 管理面

管理面先通过登录接口获取 `auth` cookie，再访问 `/admin/api-keys`。

```http
POST   /auth/login
POST   /auth/logout

POST   /admin/api-keys
GET    /admin/api-keys?limit=50&cursor=...
DELETE /admin/api-keys/:keyRef
PATCH  /admin/api-keys/:keyRef/status
```

登录请求体：

```json
{
  "password": "123456"
}
```

创建 API key 请求体：

```json
{
  "note": "desktop client",
  "prefix": "desktop"
}
```

其中：

- `note` 可选，最大 200 字符
- `prefix` 可选，仅允许字母、数字、下划线，长度 1 到 20

`POST /admin/api-keys` 会返回完整 `api_key`，且仅创建时可见一次。

## KV 数据模型

记录存储 key：

```text
app:{appId}:record:{recordKey}
```

value：

- 业务 JSON 的完整字符串

metadata：

```json
{
  "size": 123,
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

API key 存储 key：

```text
api_key:{apiKey}
```

metadata：

```json
{
  "api_key": "ksk_xxx",
  "note": "desktop client",
  "createdAt": "2026-04-08T00:00:00.000Z",
  "status": "active"
}
```

## 本地开发

前置要求：

- Node.js 18+

安装依赖：

```bash
npm install
```

构建前端静态文件：

```bash
npm run build
```

启动本地环境：

```bash
npm run dev
```

或仅启动后端：

```bash
npm run dev:backend
```

默认本地地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8080`

默认开发密码通过本地 Wrangler 绑定为：

```env
PASSWORD=123456
```

运行集成测试：

```bash
npm run ci-test
```

## 部署

Cloudflare Pages 构建配置：

- Build command: `npm run build`
- Build output directory: `frontend/out`

需要配置的环境变量：

```env
PASSWORD=your_password
```

后端依赖一个 KV namespace 绑定：

```text
KV_SYNC
```

## 设计说明

- 服务端存储的是完整快照，不是字段级文档数据库
- 覆盖写入采用简单 LWW 风格
- API key 可创建多个，适合不同客户端或不同应用隔离
- 客户端应把 merge 策略视为自身职责

