import { ImageResponse } from "next/og";
import { DARK } from "@/lib/palette";

export const alt = "agent-wrapped — your year in AI coding agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
      <div style={{ display: "flex", fontSize: 30, letterSpacing: -0.5 }}>
        <span style={{ color: DARK.accent }}>agent</span>
        <span style={{ color: DARK.dim }}>-wrapped</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Your year in AI coding agents, as a README card.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: DARK.dim, maxWidth: 860 }}>
          Scan your local Claude Code and Codex sessions. Aggregates only — nothing else leaves the
          machine.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            padding: "12px 20px",
            borderRadius: 10,
            border: `1px solid ${DARK.border}`,
            backgroundColor: DARK.panel,
            color: DARK.accent,
            fontSize: 26,
          }}
        >
          npx agent-wrapped publish
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {DARK.ramp.map((color) => (
            <div
              key={color}
              style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
