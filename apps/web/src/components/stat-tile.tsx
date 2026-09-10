interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatTile({ label, value, hint, accent = false }: StatTileProps) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-wide text-faint uppercase">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
          accent ? "text-coral" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-dim">{hint}</p> : null}
    </div>
  );
}
