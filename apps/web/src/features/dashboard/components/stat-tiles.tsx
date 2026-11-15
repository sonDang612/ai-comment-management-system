"use client";

import type { CommentStatsResponse } from "@acms/shared";
import { Card } from "antd";
import { format, useI18n } from "@/i18n";
import { formatCount, formatSecondsValue, formatShare } from "./format";

function StatTile({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card size="small" classNames={{ body: "flex flex-col gap-1" }}>
      <span className="text-[13px] text-muted-foreground">{title}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="truncate text-xs text-muted-foreground" title={hint}>
        {hint}
      </span>
    </Card>
  );
}

export function StatTiles({ stats }: { stats: CommentStatsResponse }) {
  const { dict, locale } = useI18n();
  const t = dict.dashboard;
  const { outcomes, latency } = stats;
  const checked = stats.total - outcomes.unchecked;
  const violations = outcomes.invalid + outcomes.rule_blocked;
  const count = (value: number) => formatCount(value, locale);
  const seconds = (value: number | null) =>
    value === null ? t.noData : format(t.seconds, { value: formatSecondsValue(value) });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatTile
        title={t.tiles.total}
        value={count(stats.total)}
        hint={format(t.tiles.totalHint, { today: count(stats.today), all: count(stats.total_all_time) })}
      />
      <StatTile
        title={t.tiles.violationRate}
        value={formatShare(violations, checked, locale) ?? t.noData}
        hint={format(t.tiles.violationHint, {
          checked: count(checked),
          invalid: count(outcomes.invalid),
          rule: count(outcomes.rule_blocked),
        })}
      />
      <StatTile
        title={t.tiles.ruleBlocked}
        value={count(outcomes.rule_blocked)}
        hint={format(t.tiles.ruleBlockedHint, {
          share: formatShare(outcomes.rule_blocked, checked, locale) ?? t.noData,
        })}
      />
      <StatTile
        title={t.tiles.latency}
        value={seconds(latency.average_seconds)}
        hint={format(t.tiles.latencyHint, { p95: seconds(latency.p95_seconds) })}
      />
      <StatTile
        title={t.tiles.unchecked}
        value={count(outcomes.unchecked)}
        hint={format(t.tiles.uncheckedHint, { noResult: count(outcomes.no_result) })}
      />
    </div>
  );
}
