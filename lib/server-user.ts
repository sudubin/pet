export type Viewer = {
  key: string | null;
  signedIn: boolean;
  displayName: string;
};

export function getViewer(request: Request): Viewer {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  if (userId) {
    let fullName: string | null = null;
    if (encodedName && encoding === "percent-encoded-utf-8") {
      try { fullName = decodeURIComponent(encodedName); } catch { fullName = null; }
    }
    return { key: `oai:${userId}`, signedIn: true, displayName: fullName || email?.split("@")[0] || "宠物朋友" };
  }
  const guest = request.headers.get("x-pet-guest") ?? "";
  const validGuest = /^[a-zA-Z0-9-]{12,80}$/.test(guest);
  return { key: validGuest ? `guest:${guest}` : null, signedIn: false, displayName: "体验用户" };
}

export function requireViewer(request: Request): Viewer & { key: string } {
  const viewer = getViewer(request);
  if (!viewer.key) throw new Response(JSON.stringify({ error: "无法识别当前使用者" }), { status: 401, headers: { "content-type": "application/json" } });
  return viewer as Viewer & { key: string };
}

export function requireSignedInViewer(request: Request): Viewer & { key: string; signedIn: true } {
  const viewer = getViewer(request);
  if (!viewer.key || !viewer.signedIn) throw new Response(JSON.stringify({ error: "登录后才能提交内容" }), { status: 401, headers: { "content-type": "application/json" } });
  return viewer as Viewer & { key: string; signedIn: true };
}
