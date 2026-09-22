import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { furniture } from "@/lib/pet-data";
import { requireViewer } from "@/lib/server-user";

type Placement = { itemId: string; slot: number };

export async function PUT(request: Request) {
  try {
    const viewer = requireViewer(request);
    const body = await request.json().catch(() => null) as { placements?: Placement[] } | null;
    const placements = body?.placements;
    const validIds = new Set(furniture.map((item) => item.id));
    if (!Array.isArray(placements) || placements.length > 9 || placements.some((entry) => !validIds.has(entry.itemId) || !Number.isInteger(entry.slot) || entry.slot < 0 || entry.slot > 8) || new Set(placements.map((entry) => entry.itemId)).size !== placements.length || new Set(placements.map((entry) => entry.slot)).size !== placements.length) return Response.json({ error: "家园布局无效" }, { status: 400 });
    const db = getDatabase();
    if (placements.length) {
      const owned = await db.prepare(`SELECT item_id FROM user_furniture WHERE user_key = ?1 AND item_id IN (${placements.map((_, i) => `?${i + 2}`).join(",")})`).bind(viewer.key, ...placements.map((entry) => entry.itemId)).all<{ item_id: string }>();
      if (owned.results.length !== placements.length) return Response.json({ error: "只能摆放已经兑换的家具" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const statements = [db.prepare("DELETE FROM home_placements WHERE user_key = ?1").bind(viewer.key), ...placements.map((entry) => db.prepare("INSERT INTO home_placements (user_key, item_id, slot, updated_at) VALUES (?1, ?2, ?3, ?4)").bind(viewer.key, entry.itemId, entry.slot, now))];
    await db.batch(statements);
    return Response.json({ placements });
  } catch (error) {
    return apiError(error, "家园布局暂时无法保存");
  }
}
