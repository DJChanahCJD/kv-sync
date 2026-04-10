# `@djchan/kv-sync`

<br />

> 基于 Cloudflare KV，需配合服务端使用。详见： [kv-sync](https://github.com/djchanahcjd/kv-sync) 

面向前端的 JSON 快照同步 SDK。

它只解决两件事：

- `mergeAndSync`：传入合并逻辑和成功回调，SDK 自动完成 `get -> merge -> put`
- `put`：直接用本地快照覆盖远端

## Install

```bash
npm install @djchan/kv-sync
```

## Usage

```ts
import { createKvSyncClient } from "@djchan/kv-sync";

const client = createKvSyncClient({
  baseUrl: "https://your-site.example.com",
  appId: "my-app",
  apiKey: "ksk_xxx",
});
```

`baseUrl` 传站点根地址即可，SDK 会自动请求 `/api/apps/...`。

### `mergeAndSync`

适合“先拉远端，再按本地业务规则合并，再整体写回”的场景。

```ts
await client.mergeAndSync({
  merge(remote) {
    return {
      ...(remote ?? {}),
      theme: "dark",
      lastUsedAt: new Date().toISOString(),
    };
  },
  onSuccess(result) {
    console.log("synced at", result.meta.updatedAt);
  },
});
```

### `put`

适合“当前本地快照就是最终结果，直接覆盖远端”的场景。

```ts
await client.put({
  theme: "dark",
  shortcuts: ["cmd+k"],
});
```

## API

- `client.mergeAndSync({ merge, onSuccess? })` 返回 `{ value, meta }`
- `client.put(value)` 返回 `RecordMeta`
- `client.get<T>()` 返回 `{ value, meta }`，不存在时返回 `null`
- `client.delete()` 删除当前记录

## Boundary

- 这是全量 JSON 快照同步，不是字段级 patch
- 不负责服务端冲突合并
- 适合配置、草稿、偏好这类低频覆盖式同步

## Runtime

- Browser-first
- Works in Node.js 18+ and other runtimes with standard `fetch`
- Package format: ESM only
