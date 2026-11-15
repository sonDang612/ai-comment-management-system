"use client";

import { COMMENT_STATS_DAY_OPTIONS } from "@acms/shared";
import { Alert, Button, Card, Empty, Segmented, Skeleton } from "antd";
import { RotateCw } from "lucide-react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useCommentStats } from "../api";
import { useDashboardUiStore } from "../store";
import { CategoryChart } from "./category-chart";
import { DailyOutcomeChart } from "./daily-outcome-chart";
import { StatTiles } from "./stat-tiles";

const SKELETON_TILE_COUNT = 5;

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
          <Card key={index} size="small">
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { dict } = useI18n();
  const t = dict.dashboard;
  const days = useDashboardUiStore((state) => state.days);
  const setDays = useDashboardUiStore((state) => state.setDays);
  const { data, error, isPending, isFetching, refetch } = useCommentStats(days);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<number>
          aria-label={t.rangeLabel}
          value={days}
          onChange={setDays}
          options={COMMENT_STATS_DAY_OPTIONS.map((option) => ({
            value: option,
            label: format(t.rangeOption, { days: String(option) }),
          }))}
        />
        <Button
          icon={<RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {t.refresh}
        </Button>
      </div>

      {error && (
        <Alert type="error" showIcon message={format(t.loadFailed, { message: apiErrorMessage(error, dict) })} />
      )}

      {isPending && !error && <DashboardSkeleton />}

      {data && (
        <>
          <StatTiles stats={data} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card
              title={t.daily.title}
              extra={<span className="text-xs text-muted-foreground">{t.daily.description}</span>}
            >
              {data.total === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.empty} />
              ) : (
                <DailyOutcomeChart daily={data.daily} />
              )}
            </Card>
            <Card title={t.categories.title}>
              <p className="!mb-3 !mt-0 text-xs text-muted-foreground">{t.categories.description}</p>
              <CategoryChart categories={data.categories} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
