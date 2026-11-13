import { httpRuleSettingsService } from "./http-rule-settings-service";
import type { RuleSettingsService } from "./rule-settings-service";

export type { RuleSettingsService } from "./rule-settings-service";

export const ruleSettingsService: RuleSettingsService = httpRuleSettingsService;
