import type { ModelBreakdown } from "@agent-wrapped/core";
import { compact, group, money, percent, prettyModel } from "@/lib/format";

interface ModelTableProps {
  models: ModelBreakdown[];
  totalTokens: number;
}

export function ModelTable({ models, totalTokens }: ModelTableProps) {
  if (models.length === 0) {
    return <p className="text-sm text-dim">No model usage recorded in this scan.</p>;
  }

  const sorted = [...models].sort((a, b) => b.tokens.total - a.tokens.total);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-[11px] tracking-wide text-faint uppercase">
            <th className="py-2 pr-4 font-medium">Model</th>
            <th className="py-2 pr-4 text-right font-medium">Turns</th>
            <th className="py-2 pr-4 text-right font-medium">Input</th>
            <th className="py-2 pr-4 text-right font-medium">Output</th>
            <th className="py-2 pr-4 text-right font-medium">Cache read</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
            <th className="py-2 text-right font-medium">API equiv.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((model) => (
            <tr key={model.id} className="border-b border-edge/60 last:border-0">
              <td className="py-2.5 pr-4">
                <span className="font-medium text-ink">{prettyModel(model.id)}</span>
                <span className="ml-2 font-mono text-[11px] text-faint">
                  {percent(model.tokens.total, totalTokens)}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-dim">
                {group(model.messages)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-dim">
                {compact(model.tokens.input)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-dim">
                {compact(model.tokens.output)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-dim">
                {compact(model.tokens.cacheRead)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink">
                {compact(model.tokens.total)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-coral">
                {money(model.usd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
