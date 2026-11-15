"use client";

export interface ChartLegendItem {
  key: string;
  name: string;
  color: string;
}

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <ul className="!m-0 flex list-none flex-wrap gap-x-4 gap-y-1 !p-0 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: item.color }} aria-hidden />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
