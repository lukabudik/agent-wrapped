import { renderCard, renderEmptyCard } from "@agent-wrapped/core";
import type { NextRequest } from "next/server";
import { CARD_CACHE_CONTROL, readMode, readTheme, SVG_CONTENT_TYPE } from "@/lib/card-params";
import { normaliseLogin } from "@/lib/login";
import { fetchProfile } from "@/lib/snapshot";
import type { Mode } from "@/lib/card-params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function svg(body: string, status: number, cacheControl: string): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": SVG_CONTENT_TYPE,
      "Cache-Control": cacheControl,
      // camo strips the Referer and fetches cross-origin; allowing any origin
      // also lets the landing page preview the card from the same URL.
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function placeholder(login: string, mode: Mode, message?: string): string {
  return renderEmptyCard(login, mode, message);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> },
): Promise<Response> {
  const { username } = await context.params;
  const login = normaliseLogin(username);
  const theme = readTheme(request.nextUrl.searchParams.get("theme"));
  const mode = readMode(request.nextUrl.searchParams.get("mode"));

  let profile: Awaited<ReturnType<typeof fetchProfile>> = null;
  try {
    profile = await fetchProfile(login);
  } catch (error) {
    console.error("card lookup failed", { login, error });
    // A database blip must not turn every embedded card into a broken image,
    // so the placeholder goes out with a short cache and a 200.
    return svg(
      placeholder(login, mode, "Stats are temporarily unavailable."),
      200,
      "public, max-age=60",
    );
  }

  if (!profile) {
    // A valid SVG body with a 404 status: camo shows the pixels, anything
    // smarter than camo still learns there is nothing published here.
    return svg(placeholder(login, mode), 404, "public, max-age=300");
  }

  try {
    const card = renderCard(profile.stats, {
      theme,
      mode,
      username: profile.login,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    });
    return svg(card, 200, CARD_CACHE_CONTROL);
  } catch (error) {
    console.error("card render failed", { login, theme, mode, error });
    return svg(placeholder(login, mode, "This card could not be rendered."), 500, "no-store");
  }
}
