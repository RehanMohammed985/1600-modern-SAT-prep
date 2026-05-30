#!/usr/bin/env node
/**
 * Start Next dev with a clean .next folder.
 * Uses webpack dev (not Turbopack) — Turbopack + concurrent builds cause ENOENT manifest 500s.
 */
import { existsSync, rmSync } from "fs";
import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

function killPort3000() {
  try {
    const pids = execSync("lsof -t -i:3000 2>/dev/null || true", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        /* already gone */
      }
    }
    if (pids.length) {
      console.log("[dev] Stopped previous process on port 3000.");
    }
  } catch {
    /* ignore */
  }
}

killPort3000();

if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("[dev] Cleared .next — fresh dev cache.");
  } catch (err) {
    console.warn("[dev] Could not remove .next:", err instanceof Error ? err.message : err);
  }
}

console.log("[dev] http://127.0.0.1:3000");
console.log("[dev] Tip: do not run npm run build while this server is running.");

// Polling avoids EMFILE when many watchers are already open (common after several dev restarts).
const devEnv = {
  ...process.env,
  WATCHPACK_POLLING: "true",
  CHOKIDAR_USEPOLLING: "true",
};

const child = spawn(
  "npx",
  ["next", "dev", "-H", "127.0.0.1", "-p", "3000"],
  { cwd: root, stdio: "inherit", shell: true, env: devEnv }
);

child.on("exit", (code) => process.exit(code ?? 0));
