import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { getViewer } from "@/lib/server-user";

type StateRow = { payload: string; revision: number };
type AnswerRow = { question_id: string; choice: number; correct: number; answered_at: string };
type InventoryRow = { item_id: string };
type PlacementRow = { item_id: string; slot: number };
type PostRow = { id: string; author_name: string; category: string; pet_id: string | null; title: string; content: string; status: string; professional: number; created_at: string };

const emptyProfile = { pet: null, weights: [] as { value: number; date: string }[] };

export async function GET(request: Request) {
  const viewer = getViewer(request);
  if (!viewer.key) return Response.json({ viewer, profile: emptyProfile, revision: 0, points: 0, answered: {}, inventory: [], placements: [], posts: [] });
  try {
    const db = getDatabase();
    const [state, points, answers, inventory, placements, posts, vet] = await Promise.all([
      db.prepare("SELECT payload, revision FROM app_states WHERE user_key = ?1").bind(viewer.key).first<StateRow>(),
      db.prepare("SELECT COALESCE(SUM(amount), 0) AS points FROM reward_ledger WHERE user_key = ?1").bind(viewer.key).first<{ points: number }>(),
      db.prepare("SELECT question_id, choice, correct, answered_at FROM quiz_answers WHERE user_key = ?1 ORDER BY answered_at").bind(viewer.key).all<AnswerRow>(),
      db.prepare("SELECT item_id FROM user_furniture WHERE user_key = ?1 ORDER BY acquired_at").bind(viewer.key).all<InventoryRow>(),
      db.prepare("SELECT item_id, slot FROM home_placements WHERE user_key = ?1 ORDER BY slot").bind(viewer.key).all<PlacementRow>(),
      db.prepare("SELECT id, author_name, category, pet_id, title, content, status, professional, created_at FROM community_posts WHERE status = 'approved' OR user_key = ?1 ORDER BY created_at DESC LIMIT 50").bind(viewer.key).all<PostRow>(),
      viewer.signedIn ? db.prepare("SELECT status FROM vet_applications WHERE user_key = ?1").bind(viewer.key).first<{ status: string }>() : Promise.resolve(null),
    ]);
    const answered = Object.fromEntries(answers.results.map((row) => [row.question_id, row.choice]));
    return Response.json({
      viewer,
      profile: state ? JSON.parse(state.payload) : emptyProfile,
      revision: state?.revision ?? 0,
      points: Number(points?.points ?? 0),
      answered,
      todayAnswered: answers.results.filter((row) => row.answered_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).map((row) => row.question_id),
      inventory: inventory.results.map((row) => row.item_id),
      placements: placements.results.map((row) => ({ itemId: row.item_id, slot: row.slot })),
      posts: posts.results.map((row) => ({ id: row.id, author: row.author_name, category: row.category, petId: row.pet_id, title: row.title, content: row.content, status: row.status, professional: Boolean(row.professional), createdAt: row.created_at })),
      vetStatus: vet?.status ?? null,
    });
  } catch (error) {
    return apiError(error, "档案暂时无法读取");
  }
}
