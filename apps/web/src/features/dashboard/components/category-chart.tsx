"use client";

import type { CommentCategoryCount } from "@acms/shared";
import { Empty } from "antd";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { modelClassName } from "@/features/comments/components/model-output";
import { useI18n } from "@/i18n";
import { ChartTooltip } from "./chart-tooltip";
import { formatCount, formatShare } from "./format";
import { CATEGORY_COLOR } from "./outcome-colors";

const ROW_HEIGHT = 30;
const CHART_PADDING = 24;
const BAR_SIZE = 14;
const BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];
const LABEL_WIDTH = 96;
const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" };

interface CategoryRow extends CommentCategoryCount {
  name: string;
  share: string;
}

export function CategoryChart({ categories }: { categories: CommentCategoryCount[] }) {
  const { dict, locale } = useI18n();
  const t = dict.dashboard;
  if (categories.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.categories.empty} />;

  const total = categories.reduce((sum, item) => sum + item.count, 0);
  const rows: CategoryRow[] = categories.map((item) => ({
    ...item,
    name: modelClassName(dict.comments.modelClasses, "category", item.category),
    share: formatShare(item.count, total, locale) ?? t.noData,
  }));

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + CHART_PADDING}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={LABEL_WIDTH}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--viz-grid)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as CategoryRow | undefined;
            if (!active || !row) return null;
            return (
              <ChartTooltip
                title={row.name}
                rows={[
                  {
                    key: "count",
                    name: t.categories.count,
                    value: formatCount(row.count, locale),
                    color: CATEGORY_COLOR,
                  },
                ]}
                footer={`${t.categories.share} ${row.share}`}
              />
            );
          }}
        />
        <Bar dataKey="count" fill={CATEGORY_COLOR} barSize={BAR_SIZE} radius={BAR_RADIUS} isAnimationActive={false}>
          <LabelList dataKey="share" position="right" style={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
