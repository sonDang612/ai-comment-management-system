"use client";

import { useState } from "react";
import { format, useI18n } from "@/i18n";
import { formatPercent, type ModelHead } from "./model-output";

const COLLAPSE_AFTER = 5;
const COLLAPSED_ROW_COUNT = 3;
const LOGIT_FRACTION_DIGITS = 2;
const STRONG_MARGIN = 3;
const WEAK_MARGIN = 1;

const ROW_GRID =
  "grid grid-cols-[10px_90px_1fr_64px] items-center gap-3 px-4 py-1.5 sm:grid-cols-[10px_120px_1fr_72px_60px]";

function marginTone(margin: number): string {
  if (margin >= STRONG_MARGIN) return "text-emerald-600 dark:text-emerald-400";
  if (margin >= WEAK_MARGIN) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function ModelHeadCard({ head }: { head: ModelHead }) {
  const { dict } = useI18n();
  const t = dict.comments.modelOutput;
  const [expanded, setExpanded] = useState(false);
  const collapsible = head.classes.length > COLLAPSE_AFTER;
  const visibleClasses = collapsible && !expanded ? head.classes.slice(0, COLLAPSED_ROW_COUNT) : head.classes;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
        <h3 className="!m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{head.head}</h3>
        <div className="flex gap-3 font-mono text-xs text-muted-foreground">
          <span>{format(t.classCount, { count: String(head.classes.length) })}</span>
          {head.margin !== null && (
            <span className={marginTone(head.margin)} title={t.marginHint}>
              {format(t.margin, { value: head.margin.toFixed(LOGIT_FRACTION_DIGITS) })}
            </span>
          )}
        </div>
      </div>
      <ul className="!m-0 list-none !p-0 py-1.5">
        <li
          className={`${ROW_GRID} pb-0.5 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground`}
          aria-hidden
        >
          <span />
          <span>{t.className}</span>
          <span />
          <span className="text-right">{t.probability}</span>
          <span className="hidden text-right sm:block">{t.logit}</span>
        </li>
        {visibleClasses.map((item, index) => {
          const isTop = index === 0;
          return (
            <li key={item.name} className={ROW_GRID}>
              <span className={`size-1.5 rounded-full ${isTop ? "bg-blue-500" : ""}`} />
              <span
                className={`truncate font-mono text-[13px] ${isTop ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                title={`${head.head}:${item.name}`}
              >
                {item.name}
              </span>
              <span className="h-1.5 overflow-hidden rounded bg-border">
                <span
                  className={`block h-full min-w-[2px] rounded ${isTop ? "bg-blue-500" : "bg-muted-foreground/50"}`}
                  style={{ width: `${(item.probability * 100).toFixed(2)}%` }}
                />
              </span>
              <span
                className={`text-right font-mono text-[13px] tabular-nums ${isTop ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formatPercent(item.probability)}
              </span>
              <span className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                {item.logit.toFixed(LOGIT_FRACTION_DIGITS)}
              </span>
            </li>
          );
        })}
      </ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="w-full cursor-pointer border-0 border-t border-solid border-border bg-transparent py-2 text-[12.5px] text-blue-500 hover:bg-muted"
        >
          {expanded ? t.showLess : format(t.showAll, { count: String(head.classes.length) })}
        </button>
      )}
    </section>
  );
}
