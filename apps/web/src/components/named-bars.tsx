import type { NamedCount } from "@agent-wrapped/core";
import { DARK } from "@/lib/palette";
import { group } from "@/lib/format";

interface NamedBarsProps {
  items: NamedCount[];
  limit?: number;
  emptyMessage: string;
}

/** Ranked horizontal bars — used for both the tool mix and the skill mix. */
export function NamedBars({ items, limit = 12, emptyMessage }: NamedBarsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-dim">{emptyMessage}</p>;
  }

  const top = [...items].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = Math.max(1, ...top.map((i) => i.count));

  return (
    <ul className="flex flex-col gap-2">
      {top.map((item) => (
        <li key={item.name} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
          <span className="truncate font-mono text-xs text-dim" title={item.name}>
            {item.name}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-edge/50">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(2, (item.count / max) * 100)}%`,
                backgroundColor: DARK.accentSoft,
              }}
            />
          </span>
          <span className="font-mono text-xs tabular-nums text-faint">{group(item.count)}</span>
        </li>
      ))}
    </ul>
  );
}
