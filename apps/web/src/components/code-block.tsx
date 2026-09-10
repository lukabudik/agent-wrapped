import { CopyButton } from "@/components/copy-button";

interface CodeBlockProps {
  value: string;
  label?: string;
  /** Long values (a markdown snippet) wrap; short commands stay on one line. */
  wrap?: boolean;
}

export function CodeBlock({ value, label, wrap = false }: CodeBlockProps) {
  return (
    <div className="panel flex min-w-0 items-start gap-3 px-3 py-2.5">
      <code
        className={`min-w-0 flex-1 font-mono text-[13px] leading-6 text-ink ${
          wrap ? "break-all whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"
        }`}
      >
        {value}
      </code>
      <CopyButton value={value} label={label ?? "Copy"} />
    </div>
  );
}
