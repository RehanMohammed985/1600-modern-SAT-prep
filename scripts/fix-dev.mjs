#!/usr/bin/env node
/** One command when every page shows "Internal Server Error" — kills dev, wipes .next, restarts. */
import { existsSync, rmSync } from "fs";
import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

try {
  const pids = execSync("lsof -t -i:3000 2>/dev/null || true", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      /* gone */
    }
  }
  if (pids.length) console.log("[fix] Stopped process on port 3000.");
} catch {
  /* ignore */
}

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("[fix] Deleted corrupted .next folder.");
}

console.log("[fix] Starting fresh dev server at http://127.0.0.1:3000\n");

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
