import type { RuleSettings } from "@acms/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ruleSettingsService } from "./services";

export const ruleSettingsKeys = {
  all: ["rule-settings"] as const,
  detail: () => [...ruleSettingsKeys.all, "detail"] as const,
};

export function ruleSettingsQueryOptions() {
  return queryOptions({
    queryKey: ruleSettingsKeys.detail(),
    queryFn: () => ruleSettingsService.get(),
    refetchOnWindowFocus: false,
  });
}

export function useRuleSettings() {
  return useQuery(ruleSettingsQueryOptions());
}

export function useUpdateRuleSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: RuleSettings) => ruleSettingsService.update(settings),
    onSuccess: (saved) => queryClient.setQueryData(ruleSettingsKeys.detail(), saved),
  });
}
