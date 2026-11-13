import type { KeywordAction, RestrictedKeyword, RuleSettings } from '@acms/shared';
import type {
  RestrictedKeyword as RestrictedKeywordRow,
  RuleSettings as RuleSettingsRow,
} from '../../generated/prisma/client.js';
import { DEFAULT_RULE_SETTINGS } from './rule-settings.defaults.js';

export type RuleSettingsData = Omit<RuleSettingsRow, 'id' | 'createdAt' | 'updatedAt'>;

export function toRestrictedKeywordDto(row: RestrictedKeywordRow): RestrictedKeyword {
  return {
    id: row.id,
    keyword: row.keyword,
    match_mode: row.matchMode,
    action: row.action as KeywordAction,
    enabled: row.enabled,
  };
}

export function toRuleSettingsDto(row: RuleSettingsRow | null, keywords: RestrictedKeywordRow[]): RuleSettings {
  const keywordDtos = keywords.map(toRestrictedKeywordDto);
  if (row === null) return { ...structuredClone(DEFAULT_RULE_SETTINGS), keywords: keywordDtos };
  return {
    validation: {
      min_length: row.minLength,
      max_length: row.maxLength,
      allow_empty: row.allowEmpty,
      allow_emoji_only: row.allowEmojiOnly,
      max_repeated_chars: row.maxRepeatedChars,
    },
    keywords: keywordDtos,
    links: {
      domain_whitelist: row.domainWhitelist,
    },
    spam: {
      duplicate_detection_enabled: row.duplicateDetectionEnabled,
      duplicate_window_minutes: row.duplicateWindowMinutes,
    },
  };
}

export function toRuleSettingsData(settings: RuleSettings): RuleSettingsData {
  return {
    minLength: settings.validation.min_length,
    maxLength: settings.validation.max_length,
    allowEmpty: settings.validation.allow_empty,
    allowEmojiOnly: settings.validation.allow_emoji_only,
    maxRepeatedChars: settings.validation.max_repeated_chars,
    domainWhitelist: settings.links.domain_whitelist,
    duplicateDetectionEnabled: settings.spam.duplicate_detection_enabled,
    duplicateWindowMinutes: settings.spam.duplicate_window_minutes,
  };
}
