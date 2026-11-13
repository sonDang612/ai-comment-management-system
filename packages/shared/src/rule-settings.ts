import { COMMENT_CONTENT_MAX_LENGTH, CommentStatus } from './comments.js';

export const KeywordMatchMode = {
  EXACT: 'exact',
  CONTAINS: 'contains',
} as const;
export type KeywordMatchMode = (typeof KeywordMatchMode)[keyof typeof KeywordMatchMode];

export const KeywordAction = {
  DISABLED: CommentStatus.DISABLED,
  PENDING: CommentStatus.PENDING,
} as const;
export type KeywordAction = (typeof KeywordAction)[keyof typeof KeywordAction];

export interface RestrictedKeyword {
  id: string;
  keyword: string;
  match_mode: KeywordMatchMode;
  action: KeywordAction;
  enabled: boolean;
}

export type RestrictedKeywordDraft = Omit<RestrictedKeyword, 'id'>;

export interface CommentValidationSettings {
  min_length: number;
  max_length: number;
  allow_empty: boolean;
  allow_emoji_only: boolean;
  max_repeated_chars: number;
}

export interface LinkSettings {
  allow_links: boolean;
  domain_whitelist: string[];
  domain_blacklist: string[];
}

export interface SpamDetectionSettings {
  duplicate_detection_enabled: boolean;
  duplicate_window_minutes: number;
}

export interface RuleSettings {
  validation: CommentValidationSettings;
  keywords: RestrictedKeyword[];
  links: LinkSettings;
  spam: SpamDetectionSettings;
}

export const RULE_SETTINGS_LIMITS = {
  minLength: { min: 0, max: COMMENT_CONTENT_MAX_LENGTH },
  maxLength: { min: 1, max: COMMENT_CONTENT_MAX_LENGTH },
  maxRepeatedChars: { min: 2, max: 100 },
  duplicateWindowMinutes: { min: 1, max: 10_080 },
  keywordMaxLength: 100,
  maxKeywords: 500,
  domainMaxLength: 253,
  maxDomainsPerList: 500,
} as const;

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isValidDomain(domain: string): boolean {
  return domain.length <= RULE_SETTINGS_LIMITS.domainMaxLength && DOMAIN_PATTERN.test(domain);
}

export function keywordIdentity(keyword: string): string {
  return keyword.trim().toLowerCase();
}

export const NEW_RESTRICTED_KEYWORD_DEFAULTS: RestrictedKeywordDraft = {
  keyword: '',
  match_mode: KeywordMatchMode.CONTAINS,
  action: KeywordAction.DISABLED,
  enabled: true,
};
