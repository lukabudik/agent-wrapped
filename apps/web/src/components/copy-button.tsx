"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = "Copy", className = "" }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      // Clipboard access is origin- and permission-gated; insecure origins and
      // Firefox's default settings both reject it, so the failure is surfaced
      // rather than swallowed — the user can still select the text by hand.
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`shrink-0 rounded-md border border-edge px-2.5 py-1 font-mono text-xs text-dim transition-colors hover:border-coral hover:text-coral ${className}`}
      aria-live="polite"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
