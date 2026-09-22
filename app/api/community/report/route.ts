import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { requireSignedInViewer } from "@/lib/server-user";

export async function POST(request: Request) {
  try {
    const viewer = requireSignedInViewer(request);
    const body = await request.json().catch(() => null) as { postId?: string; reason?: string } | null;
    const postId = body?.postId?.trim() ?? "";
    const reason = body?.reason?.trim() ?? "";
    if (!postId || reason.length < 4 || reason.length > 300) return Response.json({ error: "请说明举报原因" }, { status: 400 });
    await getDatabase().prepare("INSERT OR IGNORE INTO post_reports (post_id, user_key, reason, created_at) SELECT ?1, ?2, ?3, ?4 WHERE EXISTS (SELECT 1 FROM community_posts WHERE id = ?1 AND status = 'approved')").bind(postId, viewer.key, reason, new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "举报暂时无法提交");
  }
}

