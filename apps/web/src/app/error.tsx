"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-5 py-24">
      <p className="font-mono text-xs tracking-wide text-coral uppercase">Something broke</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page failed to render.</h1>
      <p className="text-sm leading-6 text-dim">
        The error has been logged. Retrying is usually enough — the most common cause is the
        database waking up from idle.
      </p>
      {error.digest ? <p className="font-mono text-xs text-faint">digest: {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg border border-edge px-4 py-2 text-sm text-dim transition-colors hover:border-coral hover:text-coral"
      >
        Try again
      </button>
    </div>
  );
}
