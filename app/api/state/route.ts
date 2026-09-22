import { getDatabase } from "@/db/raw";

const emptyState = {
  pet: null,
  weights: [] as { value: number; date: string }[],
};

function userKey(request: Request) {
  const signedIn = request.headers.get("oai-authenticated-user-id");
  if (signedIn) return `oai:${signedIn}`;
  const guest = request.headers.get("x-pet-guest") ?? "";
  return /^[a-zA-Z0-9-]{12,80}$/.test(guest) ? `guest:${guest}` : null;
}

function validState(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.weights) || state.weights.length > 24) return false;
  const pet = state.pet;
  if (pet !== null && (typeof pet !== "object" || !pet)) return false;
  return JSON.stringify(value).length <= 12_000;
}

export async function GET(request: Request) {
  const key = userKey(request);
  if (!key) return Response.json({ state: emptyState, revision: 0 });
  try {
    const row = await getDatabase().prepare("SELECT payload, revision FROM app_states WHERE user_key = ?1").bind(key).first<{payload:string; revision:number}>();
    return Response.json(row ? { state: JSON.parse(row.payload), revision: row.revision } : { state: emptyState, revision: 0 });
  } catch {
    return Response.json({ state: emptyState, revision: 0, offline: true });
  }
}

export async function PUT(request: Request) {
  const key = userKey(request);
  if (!key) return Response.json({ error: "无法识别当前使用者" }, { status: 401 });
  const body = await request.json().catch(() => null) as {state?:unknown; revision?:number} | null;
  if (!body || !validState(body.state)) {
    return Response.json({ error: "档案内容不完整" }, { status: 400 });
  }
  const db = getDatabase();
  const now = new Date().toISOString();
  const revision = Number.isInteger(body.revision) ? Number(body.revision) : 0;
  if (revision === 0) {
    const created = await db.prepare("INSERT OR IGNORE INTO app_states (user_key, payload, revision, updated_at) VALUES (?1, ?2, 1, ?3)").bind(key, JSON.stringify(body.state), now).run();
    if (created.meta.changes) return Response.json({ revision: 1 });
  }
  const result = await db.prepare("UPDATE app_states SET payload = ?1, revision = revision + 1, updated_at = ?2 WHERE user_key = ?3 AND revision = ?4").bind(JSON.stringify(body.state), now, key, revision).run();
  if (!result.meta.changes) {
    const current = await db.prepare("SELECT payload, revision FROM app_states WHERE user_key = ?1").bind(key).first<{payload:string; revision:number}>();
    return Response.json({ error: "档案已在另一处更新", state: current ? JSON.parse(current.payload) : emptyState, revision: current?.revision ?? 0 }, { status: 409 });
  }
  return Response.json({ revision: revision + 1 });
}
