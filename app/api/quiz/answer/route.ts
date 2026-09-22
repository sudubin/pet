import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { questions } from "@/lib/pet-data";
import { requireViewer } from "@/lib/server-user";

export async function POST(request: Request) {
  try {
    const viewer = requireViewer(request);
    const body = await request.json().catch(() => null) as { questionId?: string; choice?: number } | null;
    const question = questions.find((item) => item.id === body?.questionId);
    const choice = body?.choice;
    if (!question || !Number.isInteger(choice) || Number(choice) < 0 || Number(choice) >= question.options.length) return Response.json({ error: "答案无效" }, { status: 400 });
    const db = getDatabase();
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const submittedCorrect = Number(choice) === question.answer;
    await db.prepare("INSERT OR IGNORE INTO quiz_answers (user_key, question_id, choice, correct, answered_at) VALUES (?1, ?2, ?3, ?4, ?5)").bind(viewer.key, question.id, choice, submittedCorrect ? 1 : 0, now).run();
    const saved = await db.prepare("SELECT choice, correct FROM quiz_answers WHERE user_key = ?1 AND question_id = ?2").bind(viewer.key, question.id).first<{ choice: number; correct: number }>();
    const correct = Boolean(saved?.correct);
    if (correct) await db.prepare("INSERT OR IGNORE INTO reward_ledger (user_key, source_key, amount, created_at) VALUES (?1, ?2, 2, ?3)").bind(viewer.key, `quiz:${question.id}`, now).run();
    const today = await db.prepare("SELECT COUNT(*) AS count FROM quiz_answers WHERE user_key = ?1 AND answered_at >= ?2 AND answered_at < ?3").bind(viewer.key, `${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`).first<{ count: number }>();
    if (Number(today?.count ?? 0) >= 5) await db.prepare("INSERT OR IGNORE INTO reward_ledger (user_key, source_key, amount, created_at) VALUES (?1, ?2, 5, ?3)").bind(viewer.key, `daily:${date}`, now).run();
    const points = await db.prepare("SELECT COALESCE(SUM(amount), 0) AS points FROM reward_ledger WHERE user_key = ?1").bind(viewer.key).first<{ points: number }>();
    return Response.json({ correct, choice: saved?.choice ?? choice, explanation: question.explain, points: Number(points?.points ?? 0), todayCount: Number(today?.count ?? 0), dailyCompleted: Number(today?.count ?? 0) >= 5 });
  } catch (error) {
    return apiError(error, "答案暂时无法保存");
  }
}
