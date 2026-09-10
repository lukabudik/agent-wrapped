"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  cardUrl,
  DEFAULT_MODE,
  DEFAULT_THEME,
  markdownSnippet,
  MODES,
  THEMES,
  type Mode,
  type Theme,
} from "@/lib/card-params";
import { isPlausibleLogin, normaliseLogin } from "@/lib/login";

const THEME_BLURB: Record<Theme, string> = {
  heatmap: "Contribution graph, but for tokens.",
  wrapped: "The poster. Headline numbers, big type.",
  terminal: "A neofetch-style readout.",
};

const MODE_BLURB: Record<Mode, string> = {
  auto: "Follows the viewer's OS theme.",
  dark: "Pinned dark, for a dark README.",
  light: "Pinned light, for a light README.",
};

interface CardPreviewProps {
  /** A login that already has a published snapshot, when one exists. */
  sampleUsername: string;
  origin: string;
}

export function CardPreview({ sampleUsername, origin }: CardPreviewProps) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [typed, setTyped] = useState(sampleUsername);
  const [username, setUsername] = useState(sampleUsername);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Typing a username re-requests the card on every keystroke otherwise; the
  // delay keeps that to one request per pause.
  useEffect(() => {
    const handle = setTimeout(() => setUsername(normaliseLogin(typed) || sampleUsername), 400);
    return () => clearTimeout(handle);
  }, [typed, sampleUsername]);

  const valid = isPlausibleLogin(normaliseLogin(typed)) || typed.trim().length === 0;
  const src = useMemo(() => cardUrl("", username, theme, mode), [username, theme, mode]);
  const snippet = useMemo(
    () => markdownSnippet(origin, username, theme, mode),
    [origin, username, theme, mode],
  );

  const imageRef = useRef<HTMLImageElement | null>(null);

  // A cached card can finish loading before React hydrates, and a load event
  // that already fired will never reach onLoad — so the settled state is read
  // off the element instead of waited for.
  useEffect(() => {
    const el = imageRef.current;
    setStatus(el?.complete ? (el.naturalWidth > 0 ? "ready" : "error") : "loading");
  }, [src]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Picker
          legend="Theme"
          options={THEMES}
          value={theme}
          onChange={setTheme}
          titles={THEME_BLURB}
        />
        <Picker legend="Mode" options={MODES} value={mode} onChange={setMode} titles={MODE_BLURB} />
      </div>

      <div className="panel relative flex min-h-[220px] items-center justify-center overflow-hidden p-5">
        {status === "loading" ? (
          <div className="absolute inset-0 animate-pulse bg-edge/25" aria-hidden />
        ) : null}
        {status === "error" ? (
          <p className="relative text-sm text-dim">
            Could not load the preview. The card endpoint may be unreachable.
          </p>
        ) : (
          /*
           * A plain img on purpose: this is the exact request GitHub's camo
           * proxy makes, so the preview is the README result rather than an
           * approximation of it. Its visibility is never gated on a JS-set
           * class — the skeleton sits behind it and clears once load settles.
           */
          // eslint-disable-next-line @next/next/no-img-element -- the preview must be the same request camo makes, unproxied
          <img
            ref={imageRef}
            key={src}
            src={src}
            alt={`agent-wrapped card for ${username}, ${theme} theme`}
            className="relative max-w-full"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor="preview-username" className="text-xs font-medium tracking-wide text-dim">
          Preview a GitHub username
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="preview-username"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={sampleUsername}
            className="panel w-56 px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-faint focus:border-coral"
          />
          {!valid ? (
            <span className="text-xs text-coral-soft">Not a valid GitHub username.</span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium tracking-wide text-dim">
            Paste this into your profile README
          </span>
          <CopyButton value={snippet} label="Copy markdown" />
        </div>
        <pre className="panel min-w-0 overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-6 text-ink">
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  );
}

interface PickerProps<T extends string> {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  titles: Record<T, string>;
}

function Picker<T extends string>({ legend, options, value, onChange, titles }: PickerProps<T>) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">{legend}</legend>
      <span className="text-xs font-medium tracking-wide text-faint">{legend}</span>
      <div className="flex overflow-hidden rounded-lg border border-edge">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            title={titles[option]}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`px-3 py-1.5 font-mono text-xs transition-colors ${
              option === value
                ? "bg-coral text-canvas"
                : "bg-panel text-dim hover:bg-edge/40 hover:text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
