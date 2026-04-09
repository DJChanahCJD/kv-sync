# `@djchan/kv-sync`

Browser-first KVSync SDK for full JSON snapshot sync.

## Install

```bash
npm install @djchan/kv-sync
```

## Usage

```ts
import { createKvSyncClient } from "@djchan/kv-sync";

const client = createKvSyncClient({
  baseUrl: "https://your-api.example.com",
  appId: "my-app",
  apiKey: "ksk_xxx",
});

const profile = await client.get<{ theme: string }>("profile");

await client.sync("profile", (remote) => ({
  ...(remote ?? {}),
  theme: "dark",
}));
```

## API

- `client.get<T>(recordKey)` returns `{ value, meta }` or `null` on `404`
- `client.put(recordKey, value)` writes the full JSON snapshot and returns `RecordMeta`
- `client.delete(recordKey)` deletes a record
- `client.sync(recordKey, merge)` runs `read full -> local merge -> write full`

## Runtime

- Browser-first
- Works in Node.js 18+ and other runtimes with standard `fetch`
- Package format: ESM only
