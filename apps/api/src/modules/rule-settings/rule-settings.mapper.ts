import type { RuleSettings } from '@acms/shared';
import type { RuleSettings as RuleSettingsRow } from '../../generated/prisma/client.js';
import { DEFAULT_RULE_SETTINGS } from './rule-settings.defaults.js';

export type RuleSettingsData = Omit<RuleSettingsRow, 'id' | 'createdAt' | 'updatedAt'>;

export function toRuleSettingsDto(row: RuleSettingsRow | null): RuleSettings {
  if (row === null) return structuredClone(DEFAULT_RULE_SETTINGS);
  return {
    validation: {
      min_length: row.minLength,
      max_length: row.maxLength,
      max_repeated_chars: row.maxRepeatedChars,
      max_repeated_words: row.maxRepeatedWords,
    },
    keywords: row.restrictedKeywords,
    links: {
      allow_ip_addresses: row.allowIpAddresses,
      domain_whitelist: row.domainWhitelist,
    },
  };
}

export function toRuleSettingsData(settings: RuleSettings): RuleSettingsData {
  return {
    minLength: settings.validation.min_length,
    maxLength: settings.validation.max_length,
    maxRepeatedChars: settings.validation.max_repeated_chars,
    maxRepeatedWords: settings.validation.max_repeated_words,
    restrictedKeywords: settings.keywords,
    allowIpAddresses: settings.links.allow_ip_addresses,
    domainWhitelist: settings.links.domain_whitelist,
  };
}
