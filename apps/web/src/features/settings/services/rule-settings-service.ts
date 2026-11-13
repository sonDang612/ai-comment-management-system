import type { RuleSettings } from "@acms/shared";

export interface RuleSettingsService {
  get(): Promise<RuleSettings>;
  update(settings: RuleSettings): Promise<RuleSettings>;
}
