import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bearerToken, resolveIdentity } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Erases everything the service holds for the caller.
 *
 * Identity comes from the GitHub token alone, exactly as it does on publish --
 * there is no username in the request, so a token can only ever delete its own
 * row. Snapshot and quota rows cascade from the user, so one delete is the
 * whole erasure.
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return error(401, "Missing Authorization: Bearer <github token>.");
  }

  const identity = await resolveIdentity(token);
  if (!identity.ok) {
    return error(identity.status, identity.message);
  }
  const { githubId } = identity.identity;

  const existing = await prisma.user.findUnique({
    where: { githubId },
    select: { id: true, login: true },
  });

  // Deleting something that was never published is not a failure -- the caller
  // asked for "no data held", and that is already true.
  if (!existing) {
    return Response.json(
      { ok: true, deleted: false, message: "Nothing was stored for this account." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  await prisma.user.delete({ where: { id: existing.id } });

  return Response.json(
    {
      ok: true,
      deleted: true,
      login: existing.login,
      message: "Snapshot, card and leaderboard entry removed.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
