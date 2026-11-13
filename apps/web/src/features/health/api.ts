import { API_V1_PREFIX, type HealthResponse } from "@acms/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const healthKeys = {
  all: ["health"] as const,
};

export const healthQueryOptions = queryOptions({
  queryKey: healthKeys.all,
  // A 503 still carries a valid HealthResponse describing which dependency is down.
  queryFn: () =>
    apiClient.get<HealthResponse>(`${API_V1_PREFIX}/health`, { acceptStatuses: [503] }),
  refetchInterval: 15_000,
});

export function useHealth() {
  return useQuery(healthQueryOptions);
}
