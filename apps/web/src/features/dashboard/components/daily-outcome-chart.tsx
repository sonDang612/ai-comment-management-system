"use client";

import { COMMENT_OUTCOMES, type CommentDailyStats } from "@acms/shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip } from "./chart-tooltip";
import { formatCount, formatDayKey } from "./format";
import { OUTCOME_COLORS } from "./outcome-colors";

const CHART_HEIGHT = 300;
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const MAX_BAR_SIZE = 28;
const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" };
const LAST_OUTCOME = COMMENT_OUTCOMES[COMMENT_OUTCOMES.length - 1];

function DailyChart({ daily }: { daily: CommentDailyStats[] }) {
  const { dict, locale } = useI18n();
  const t = dict.dashboard;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={(date: string) => formatDayKey(date, locale)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--viz-grid)" }}
          minTickGap={12}
        />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as CommentDailyStats | undefined;
            if (!active || !row) return null;
            return (
              <ChartTooltip
                title={formatDayKey(row.date, locale)}
                rows={COMMENT_OUTCOMES.map((outcome) => ({
                  key: outcome,
                  name: t.outcomes[outcome] ?? outcome,
                  value: formatCount(row[outcome], locale),
                  color: OUTCOME_COLORS[outcome],
                }))}
                footer={`${t.daily.total} ${formatCount(row.total, locale)}`}
              />
            );
          }}
        />
        {COMMENT_OUTCOMES.map((outcome) => (
          <Bar
            key={outcome}
            dataKey={outcome}
            name={t.outcomes[outcome]}
            stackId="outcomes"
            fill={OUTCOME_COLORS[outcome]}
            stroke="var(--card)"
            strokeWidth={1}
            maxBarSize={MAX_BAR_SIZE}
            radius={outcome === LAST_OUTCOME ? BAR_RADIUS : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyOutcomeChart({ daily }: { daily: CommentDailyStats[] }) {
  const { dict } = useI18n();
  const t = dict.dashboard;
  return (
    <div className="flex flex-col gap-3">
      <ChartLegend
        items={COMMENT_OUTCOMES.map((outcome) => ({
          key: outcome,
          name: t.outcomes[outcome] ?? outcome,
          color: OUTCOME_COLORS[outcome],
        }))}
      />
      <DailyChart daily={daily} />
    </div>
  );
}
