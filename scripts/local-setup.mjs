import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const stateFile = join(root, ".wrangler", "pet-guide-local-migrations.json");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(root, "dist", "server", "wrangler.json");
const applied = new Set(readJson(stateFile));
const migrations = readdirSync(join(root, "drizzle")).filter((name) => name.endsWith(".sql")).sort();

for (const migration of migrations) {
  if (applied.has(migration)) continue;
  const result = spawnSync(process.execPath, ["--import", join(root, "scripts", "sites-env.mjs"), wrangler, "d1", "execute", "DB", "--local", "--config", config, "--persist-to", join(root, ".wrangler", "state"), "--file", join(root, "drizzle", migration)], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  applied.add(migration);
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify([...applied], null, 2) + "\n");
}

console.log(`本地数据库已就绪，共应用 ${applied.size} 个迁移。`);

function readJson(path) {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

