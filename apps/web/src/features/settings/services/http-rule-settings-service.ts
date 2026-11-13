import { API_V1_PREFIX, type RuleSettings } from "@acms/shared";
import { apiClient } from "@/lib/api";
import type { RuleSettingsService } from "./rule-settings-service";

const RULE_SETTINGS_PATH = `${API_V1_PREFIX}/rule-settings`;

export const httpRuleSettingsService: RuleSettingsService = {
  get: () => apiClient.get<RuleSettings>(RULE_SETTINGS_PATH),
  update: (settings) => apiClient.put<RuleSettings>(RULE_SETTINGS_PATH, settings),
};
