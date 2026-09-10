import { ImageResponse } from "next/og";
import { DARK } from "@/lib/palette";
import { compact, group, money } from "@/lib/format";
import { normaliseLogin } from "@/lib/login";
import { fetchProfile } from "@/lib/snapshot";

export const alt = "agent-wrapped profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Reads a live snapshot, so it must not be baked at build time.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 20, color: DARK.faint, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: "flex", fontSize: 46, color: accent ? DARK.accent : DARK.text }}>
        {value}
      </div>
    </div>
  );
}

export default async function ProfileOpengraphImage({ params }: Props) {
  const { username } = await params;
  const login = normaliseLogin(username);
  const profile = await fetchProfile(login).catch(() => null);

  const totals = profile?.stats.totals;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: DARK.bg,
        padding: 72,
        color: DARK.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- satori renders this, not the browser; next/image has no meaning inside an ImageResponse
          <img
            src={`${profile.avatarUrl}${profile.avatarUrl.includes("?") ? "&" : "?"}s=200`}
            alt=""
            width={96}
            height={96}
            style={{ borderRadius: 96, border: `1px solid ${DARK.border}` }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 48, letterSpacing: -1 }}>@{login}</div>
          <div style={{ display: "flex", fontSize: 24, color: DARK.dim }}>
            {totals
              ? `${group(totals.sessions)} sessions · ${group(totals.activeDays)} active days`
              : "No wrapped published yet"}
          </div>
        </div>
      </div>

      {totals ? (
        <div style={{ display: "flex", gap: 72 }}>
          <Stat label="Tokens" value={compact(totals.tokens.total)} accent />
          <Stat label="API equivalent" value={money(totals.apiEquivalentUsd)} accent />
          <Stat label="Current streak" value={`${group(totals.currentStreak)}d`} />
          <Stat label="Turns" value={compact(totals.messages)} />
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 36, color: DARK.dim, maxWidth: 900 }}>
          Run npx agent-wrapped publish to put a card here.
        </div>
      )}

      <div style={{ display: "flex", fontSize: 26 }}>
        <span style={{ color: DARK.accent }}>agent</span>
        <span style={{ color: DARK.dim }}>-wrapped</span>
      </div>
    </div>,
    size,
  );
}
