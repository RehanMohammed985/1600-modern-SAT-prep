#!/usr/bin/env node
/**
 * Production build — refuses to run while dev server is up (prevents .next corruption → 500s).
 */
import { existsSync, rmSync } from "fs";
import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function port3000InUse() {
  try {
    const out = execSync("lsof -t -i:3000 2>/dev/null || true", { encoding: "utf8" }).trim();
    return Boolean(out);
  } catch {
    return false;
  }
}

if (port3000InUse()) {
  console.error(
    "\n[build] ERROR: Dev server is running on port 3000.\n" +
      "        Stop it first (Ctrl+C in the dev terminal), then run npm run build.\n" +
      "        Building while dev runs corrupts .next and causes Internal Server Error on every page.\n"
  );
  process.exit(1);
}

const nextDir = path.join(root, ".next");
if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("[build] Cleared .next before production build.");
  } catch (err) {
    console.warn("[build] Could not remove .next:", err instanceof Error ? err.message : err);
  }
}

const child = spawn("npx", ["next", "build"], { cwd: root, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
