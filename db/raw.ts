import { env } from "cloudflare:workers";

export function getDatabase() {
  if (!env.DB) throw new Error("宠物档案暂时无法连接，请稍后重试。");
  return env.DB;
}
