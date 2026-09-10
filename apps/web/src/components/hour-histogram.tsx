import { DARK } from "@/lib/palette";
import { group, hourLabel } from "@/lib/format";

interface HourHistogramProps {
  byHour: number[];
  peakHour: number;
}

/** 24 bars, local time on the machine that produced the scan. */
export function HourHistogram({ byHour, peakHour }: HourHistogramProps) {
  const max = Math.max(1, ...byHour);

  return (
    <div className="flex h-40 items-end gap-1">
      {byHour.map((count, hour) => {
        const height = Math.max(2, Math.round((count / max) * 100));
        const isPeak = hour === peakHour;
        return (
          <div key={hour} className="flex h-full flex-1 flex-col justify-end gap-1.5">
            <div
              className="w-full rounded-sm transition-colors"
              style={{
                height: `${height}%`,
                backgroundColor: isPeak ? DARK.accent : DARK.ramp[2],
              }}
              title={`${hourLabel(hour)} — ${group(count)} turns`}
            />
            <span
              className={`text-center font-mono text-[9px] tabular-nums ${
                isPeak ? "text-coral" : "text-faint"
              }`}
            >
              {hour % 3 === 0 ? String(hour).padStart(2, "0") : " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}
