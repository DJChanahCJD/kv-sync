import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(scriptDir, "..");
const repoRoot = resolve(clientDir, "..");
const tmpDir = resolve(repoRoot, "tmp");
const cacheDir = join(tmpDir, "npm-cache");
const smokeDir = join(tmpDir, "client-smoke");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function assertSpawn(result, label) {
  if (result.error) {
    console.error(`${label} failed to start`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

async function main() {
  await mkdir(tmpDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });
  await rm(smokeDir, { recursive: true, force: true });
  await mkdir(smokeDir, { recursive: true });

  const tarballs = (await readdir(tmpDir)).filter(
    (name) => name.startsWith("djchan-kv-sync-client-") && name.endsWith(".tgz")
  );
  if (tarballs.length === 0) {
    throw new Error("No tarball found in tmp/");
  }

  tarballs.sort();
  const tarballPath = join(tmpDir, tarballs[tarballs.length - 1]);

  await writeFile(
    join(smokeDir, "package.json"),
    JSON.stringify(
      {
        name: "client-smoke",
        private: true,
        type: "module",
      },
      null,
      2
    )
  );

  const install = spawnSync(
    npmCmd,
    ["install", tarballPath, "--cache", cacheDir],
    {
      cwd: smokeDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  assertSpawn(install, "npm install");

  await writeFile(
    join(smokeDir, "smoke.mjs"),
    [
      'import { createKvSyncClient, KvSyncClientError } from "@djchan/kv-sync";',
      'const client = createKvSyncClient({ baseUrl: "https://example.com", appId: "demo", apiKey: "ksk_demo", fetch: globalThis.fetch });',
      'if (typeof client.get !== "function") throw new Error("get missing");',
      'if (typeof client.put !== "function") throw new Error("put missing");',
      'if (typeof client.mergeAndSync !== "function") throw new Error("mergeAndSync missing");',
      'if (!(new KvSyncClientError("x", { status: 400 }) instanceof Error)) throw new Error("error class broken");',
      'console.log("smoke ok");',
    ].join("\n")
  );

  const smoke = spawnSync("node", ["smoke.mjs"], {
    cwd: smokeDir,
    stdio: "inherit",
    shell: false,
  });
  assertSpawn(smoke, "smoke import");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
