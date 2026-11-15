"use client";

interface ChartTooltipRow {
  key: string;
  name: string;
  value: string;
  color: string;
}

export function ChartTooltip({ title, rows, footer }: { title: string; rows: ChartTooltipRow[]; footer?: string }) {
  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1.5 font-semibold">{title}</div>
      <ul className="!m-0 grid list-none gap-1 !p-0">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden />
            <span className="flex-1 text-muted-foreground">{row.name}</span>
            <span className="font-mono tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</div>}
    </div>
  );
}
