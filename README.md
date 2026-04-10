# KV Sync

基于 Cloudflare KV 的轻量 JSON 全量快照同步服务。

只做三件事：鉴权、JSON 读写、返回基础元数据。

不做字段合并、版本历史与强一致性保证。

## 适合什么场景

适合：

- 配置同步
- 草稿 / 偏好 / 轻量状态持久化
- 低频覆盖式同步
- 内部工具的小规模数据存储

不适合：

- 高频并发写入
- 多人实时协作
- 强一致事务
- 复杂查询
- 服务端自动冲突合并

## 同步模型

推荐固定使用：

`读全量 -> 本地 merge -> 写全量`

也就是：

1. 先读远端完整 JSON。
2. 在客户端按业务规则完成 merge。
3. 把 merge 后的完整 JSON 整体写回。

服务端每次写入只生成 metadata：

- `size`
- `updatedAt`

## 项目结构

这是一个 monorepo：

- `functions/`：Cloudflare Pages Functions 后端，基于 Hono
- `frontend/`：Next.js 管理端页面
- `client/`：浏览器优先的 SDK，包名 `@djchan/kv-sync` 
- `shared/`：前后端共享类型

> [SDK 文档](client/README.md)
> 
> [NPM 包](https://www.npmjs.com/package/@djchan/kv-sync)

## 快速开始

要求：

- Node.js 18+

安装依赖：

```bash
npm install
```

启动本地环境：

```bash
npm run build
npm run dev
```

默认地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8080`

本地默认管理员密码：

```env
PASSWORD=123456
```

仅启动后端：

```bash
npm run dev:backend
```

运行测试：

```bash
npm run ci-test
```

## API 概览

健康检查：

```http
GET /api/healthz
```

数据面，使用 `Authorization: Bearer <apiKey>`：

```http
PUT    /api/apps/:appId/:apiKey
GET    /api/apps/:appId/:apiKey
DELETE /api/apps/:appId/:apiKey
GET    /api/apps/:appId/records?limit=50&cursor=...
```

管理面：

```http
POST   /api/auth/login
POST   /api/auth/logout

POST   /api/admin/api-keys
GET    /api/admin/api-keys?limit=50&cursor=...
DELETE /api/admin/api-keys/:keyRef
PATCH  /api/admin/api-keys/:keyRef/status
```

可选代理能力：

```http
GET /api/proxy?url=...
```

## 部署

Cloudflare Pages 构建配置：

- Build command: `npm run build`
- Build output directory: `frontend/out`

需要配置：

```env
PASSWORD=your_password
```

需要绑定的 KV namespace：

```text
KV_SYNC
```

## 设计原则

- 服务端存的是完整 JSON 快照，不是文档数据库
- 写入策略是覆盖式 upsert
- 冲突处理由客户端负责
- API key 可按应用或客户端隔离
