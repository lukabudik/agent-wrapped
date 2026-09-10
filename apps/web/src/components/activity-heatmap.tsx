import { DARK, rampStep } from "@/lib/palette";
import { group, prettyDate } from "@/lib/format";

const CELL = 11;
const GAP = 3;
const WEEKS = 53;
const DAY_LABELS = ["Mon", "Wed", "Fri"] as const;
const DAY_ROWS = [1, 3, 5] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Cell {
  date: string;
  count: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build 53 week-columns ending on the Saturday of the week containing `end`,
 * so the last column is the current week and the grid reads left-to-right in
 * time exactly like GitHub's own contribution graph.
 */
function buildGrid(byDay: Record<string, number>, end: string): Cell[][] {
  const endDate = new Date(`${end}T00:00:00Z`);
  const anchor = Number.isNaN(endDate.getTime()) ? new Date() : endDate;
  const lastColumnEnd = new Date(anchor);
  lastColumnEnd.setUTCDate(lastColumnEnd.getUTCDate() + (6 - lastColumnEnd.getUTCDay()));

  const start = new Date(lastColumnEnd);
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1));

  const columns: Cell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w += 1) {
    const column: Cell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = isoDate(cursor);
      column.push({ date, count: byDay[date] ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(column);
  }
  return columns;
}

interface ActivityHeatmapProps {
  byDay: Record<string, number>;
  /** Last day covered by the scan; the grid ends on that week. */
  end: string;
}

export function ActivityHeatmap({ byDay, end }: ActivityHeatmapProps) {
  const columns = buildGrid(byDay, end);
  const max = Math.max(0, ...Object.values(byDay));

  const width = 32 + WEEKS * (CELL + GAP);
  const height = 20 + 7 * (CELL + GAP);

  const monthTicks: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  columns.forEach((column, index) => {
    const first = column[0];
    if (!first) return;
    const month = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      monthTicks.push({ x: 32 + index * (CELL + GAP), label: MONTHS[month] ?? "" });
    }
  });

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Daily assistant turns, ${group(max)} on the busiest day`}
        className="min-w-[720px]"
      >
        {monthTicks.map((tick) => (
          <text
            key={`${tick.label}-${tick.x}`}
            x={tick.x}
            y={11}
            fontSize={9.5}
            fill={DARK.faint}
            fontFamily="inherit"
          >
            {tick.label}
          </text>
        ))}

        {DAY_ROWS.map((row, index) => (
          <text
            key={row}
            x={0}
            y={20 + row * (CELL + GAP) + CELL - 2}
            fontSize={9.5}
            fill={DARK.faint}
            fontFamily="inherit"
          >
            {DAY_LABELS[index]}
          </text>
        ))}

        {columns.map((column, w) =>
          column.map((cell, d) => (
            <rect
              key={cell.date}
              x={32 + w * (CELL + GAP)}
              y={20 + d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={DARK.ramp[rampStep(cell.count, max)]}
              stroke={cell.count > 0 ? "transparent" : DARK.border}
              strokeWidth={0.5}
            >
              <title>{`${prettyDate(cell.date)} — ${group(cell.count)} turns`}</title>
            </rect>
          )),
        )}
      </svg>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-faint">
      <span>Less</span>
      {DARK.ramp.map((color, index) => (
        <span
          key={color}
          className="inline-block size-[11px] rounded-[2px]"
          style={{
            backgroundColor: color,
            border: index === 0 ? `0.5px solid ${DARK.border}` : undefined,
          }}
        />
      ))}
      <span>More</span>
    </div>
  );
}
