import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { pets } from "@/lib/pet-data";
import { getViewer, requireSignedInViewer } from "@/lib/server-user";

const categories = new Set(["饲养经验", "用品推荐", "领养信息", "诊疗经验"]);

export async function GET(request: Request) {
  try {
    const viewer = getViewer(request);
    const petId = new URL(request.url).searchParams.get("petId");
    const clauses = ["(status = 'approved' OR user_key = ?1)"];
    const values: unknown[] = [viewer.key ?? "anonymous"];
    if (petId) { clauses.push("pet_id = ?2"); values.push(petId); }
    const rows = await getDatabase().prepare(`SELECT id, author_name, category, pet_id, title, content, status, professional, created_at FROM community_posts WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 50`).bind(...values).all();
    return Response.json({ posts: rows.results });
  } catch (error) {
    return apiError(error, "社区内容暂时无法读取");
  }
}

export async function POST(request: Request) {
  try {
    const viewer = requireSignedInViewer(request);
    const body = await request.json().catch(() => null) as { category?: string; petId?: string | null; title?: string; content?: string } | null;
    const category = body?.category?.trim() ?? "";
    const title = body?.title?.trim() ?? "";
    const content = body?.content?.trim() ?? "";
    const petId = body?.petId || null;
    if (!categories.has(category) || title.length < 4 || title.length > 60 || content.length < 20 || content.length > 2000 || (petId && !pets.some((pet) => pet.id === petId))) return Response.json({ error: "请完整填写标题、正文和分类" }, { status: 400 });
    const db = getDatabase();
    const vet = await db.prepare("SELECT status FROM vet_applications WHERE user_key = ?1").bind(viewer.key).first<{ status: string }>();
    const professional = category === "诊疗经验" && vet?.status === "approved";
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO community_posts (id, user_key, author_name, category, pet_id, title, content, status, professional, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9)").bind(id, viewer.key, viewer.displayName.slice(0, 30), category, petId, title, content, professional ? 1 : 0, now).run();
    return Response.json({ post: { id, author: viewer.displayName, category, petId, title, content, status: "pending", professional, createdAt: now } }, { status: 201 });
  } catch (error) {
    return apiError(error, "投稿暂时无法提交");
  }
}

