import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Railway's healthcheck gates whether a new deployment takes traffic, so this
 * has to fail when the app is up but cannot reach Postgres — otherwise a broken
 * database URL rolls out cleanly and every request 500s.
 */
export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("health check failed", error);
    return Response.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
