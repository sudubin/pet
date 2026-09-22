import { getDatabase } from "@/db/raw";
import { apiError } from "@/lib/api-response";
import { requireSignedInViewer } from "@/lib/server-user";

export async function POST(request: Request) {
  try {
    const viewer = requireSignedInViewer(request);
    const body = await request.json().catch(() => null) as { realName?: string; licenseNo?: string; clinic?: string; statement?: string } | null;
    const realName = body?.realName?.trim() ?? "";
    const licenseNo = body?.licenseNo?.trim() ?? "";
    const clinic = body?.clinic?.trim() ?? "";
    const statement = body?.statement?.trim() ?? "";
    if (realName.length < 2 || realName.length > 30 || licenseNo.length < 5 || licenseNo.length > 60 || clinic.length > 80 || statement.length < 20 || statement.length > 800) return Response.json({ error: "请完整填写认证资料" }, { status: 400 });
    await getDatabase().prepare("INSERT INTO vet_applications (user_key, real_name, license_no, clinic, statement, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6) ON CONFLICT(user_key) DO UPDATE SET real_name = excluded.real_name, license_no = excluded.license_no, clinic = excluded.clinic, statement = excluded.statement, status = 'pending', created_at = excluded.created_at, reviewed_at = NULL").bind(viewer.key, realName, licenseNo, clinic || null, statement, new Date().toISOString()).run();
    return Response.json({ status: "pending" });
  } catch (error) {
    return apiError(error, "认证申请暂时无法提交");
  }
}
