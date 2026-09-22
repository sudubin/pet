export function apiError(error: unknown, fallback = "服务暂时不可用") {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json({ error: fallback }, { status: 500 });
}

