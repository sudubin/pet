import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(process.execPath, [
  "--import", join(root, "scripts", "sites-env.mjs"),
  join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
  "d1", "execute", "DB", "--local",
  "--config", join(root, "dist", "server", "wrangler.json"),
  "--persist-to", join(root, ".wrangler", "state"),
  "--command", "UPDATE community_posts SET status = 'approved', reviewed_at = datetime('now') WHERE status = 'pending'",
], { cwd: root, stdio: "inherit" });

if (result.status !== 0) process.exit(result.status ?? 1);
console.log("本地待审核投稿已全部通过，刷新社区页面即可查看。");

