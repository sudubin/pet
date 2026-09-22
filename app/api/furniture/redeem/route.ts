import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { furniture } from "@/lib/pet-data";
import { requireViewer } from "@/lib/server-user";

export async function POST(request: Request) {
  try {
    const viewer = requireViewer(request);
    const body = await request.json().catch(() => null) as { itemId?: string } | null;
    const item = furniture.find((entry) => entry.id === body?.itemId);
    if (!item) return Response.json({ error: "家具不存在" }, { status: 404 });
    const db = getDatabase();
    const now = new Date().toISOString();
    const sourceKey = `redeem:${item.id}`;
    const spend = db.prepare("INSERT OR IGNORE INTO reward_ledger (user_key, source_key, amount, created_at) SELECT ?1, ?2, ?3, ?4 WHERE (SELECT COALESCE(SUM(amount), 0) FROM reward_ledger WHERE user_key = ?1) >= ?5 AND NOT EXISTS (SELECT 1 FROM user_furniture WHERE user_key = ?1 AND item_id = ?6)").bind(viewer.key, sourceKey, -item.cost, now, item.cost, item.id);
    const grant = db.prepare("INSERT OR IGNORE INTO user_furniture (user_key, item_id, acquired_at) SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM reward_ledger WHERE user_key = ?1 AND source_key = ?4)").bind(viewer.key, item.id, now, sourceKey);
    await db.batch([spend, grant]);
    const [owned, balance] = await Promise.all([
      db.prepare("SELECT 1 AS owned FROM user_furniture WHERE user_key = ?1 AND item_id = ?2").bind(viewer.key, item.id).first<{ owned: number }>(),
      db.prepare("SELECT COALESCE(SUM(amount), 0) AS points FROM reward_ledger WHERE user_key = ?1").bind(viewer.key).first<{ points: number }>(),
    ]);
    if (!owned) return Response.json({ error: "成长点不足" }, { status: 409 });
    return Response.json({ itemId: item.id, points: Number(balance?.points ?? 0) });
  } catch (error) {
    return apiError(error, "家具暂时无法兑换");
  }
}

