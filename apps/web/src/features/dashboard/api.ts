import { API_V1_PREFIX, type CommentStatsResponse } from "@acms/shared";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const COMMENT_STATS_PATH = `${API_V1_PREFIX}/comments/stats`;
const STATS_REFETCH_INTERVAL_MS = 60_000;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (days: number) => [...dashboardKeys.all, "stats", days] as const,
};

export function commentStatsQueryOptions(days: number) {
  return queryOptions({
    queryKey: dashboardKeys.stats(days),
    queryFn: () => apiClient.get<CommentStatsResponse>(COMMENT_STATS_PATH, { query: { days } }),
    placeholderData: keepPreviousData,
    refetchInterval: STATS_REFETCH_INTERVAL_MS,
  });
}

export function useCommentStats(days: number) {
  return useQuery(commentStatsQueryOptions(days));
}
