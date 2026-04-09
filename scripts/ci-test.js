const { spawn } = require("node:child_process");
const process = require("node:process");

const mode = process.argv[2] ?? "all";
const npmCmd = "npm";
const useShell = process.platform === "win32";

const staticTasks = [
  { label: "frontend:lint", args: ["run", "lint", "--workspace", "@kv-sync/frontend"] },
  { label: "frontend:typecheck", args: ["run", "typecheck", "--workspace", "@kv-sync/frontend"] },
  { label: "functions:lint", args: ["run", "lint", "--workspace", "@kv-sync/functions"] },
  { label: "functions:typecheck", args: ["run", "typecheck", "--workspace", "@kv-sync/functions"] },
  { label: "client:typecheck", args: ["run", "typecheck", "--workspace", "@djchan/kv-sync"] },
  { label: "shared:typecheck", args: ["run", "typecheck", "--workspace", "@kv-sync/shared"] },
];

const buildTasks = [
  { label: "frontend:build", args: ["run", "build", "--workspace", "@kv-sync/frontend"] },
  { label: "client:build", args: ["run", "build", "--workspace", "@djchan/kv-sync"] },
];

function logSection(title) {
  console.log(`\n== ${title} ==`);
}

function runTask(task, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCmd, task.args, {
      stdio: "inherit",
      shell: useShell,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${task.label} failed with ${reason}`));
    });
  });
}

async function runTaskGroup(title, tasks) {
  logSection(title);
  await Promise.all(
    tasks.map(async (task) => {
      console.log(`[start] ${task.label}`);
      await runTask(task);
      console.log(`[done] ${task.label}`);
    })
  );
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The dev server may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopBackend(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        shell: false,
      });

      killer.on("error", () => resolve());
      killer.on("exit", () => resolve());
    });
    return;
  }

  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

async function runIntegration() {
  logSection("Integration");
  console.log("[start] backend");

  const backend = spawn(npmCmd, ["run", "dev:backend"], {
    stdio: "inherit",
    shell: useShell,
  });

  let stopping = false;
  const cleanup = async () => {
    if (stopping) {
      return;
    }
    stopping = true;
    await stopBackend(backend);
  };

  const forwardExit = async (signal) => {
    await cleanup();
    process.kill(process.pid, signal);
  };

  process.once("SIGINT", forwardExit);
  process.once("SIGTERM", forwardExit);

  try {
    backend.on("error", (error) => {
      throw error;
    });

    await waitForHttp("http://localhost:8080/healthz", 30000);
    console.log("[ready] backend");
    await runTask({
      label: "integration:test",
      args: ["exec", "mocha", "--exit"],
    });
    console.log("[done] integration:test");
  } finally {
    process.removeListener("SIGINT", forwardExit);
    process.removeListener("SIGTERM", forwardExit);
    await cleanup();
  }
}

async function main() {
  if (!["all", "static", "integration"].includes(mode)) {
    throw new Error(`Unsupported mode "${mode}"`);
  }

  if (mode === "all" || mode === "static") {
    await runTaskGroup("Static Checks", staticTasks);
    await runTaskGroup("Build Checks", buildTasks);
  }

  if (mode === "all" || mode === "integration") {
    await runIntegration();
  }
}

main().catch((error) => {
  console.error(`\nCI failed: ${error.message}`);
  process.exitCode = 1;
});
