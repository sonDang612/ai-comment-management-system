import { COMMENT_CONTENT_MAX_LENGTH } from './comments.js';

export interface CommentValidationSettings {
  min_length: number;
  max_length: number;
  max_repeated_chars: number;
  max_repeated_words: number;
}

export interface LinkSettings {
  allow_ip_addresses: boolean;
  domain_whitelist: string[];
}

export interface RuleSettings {
  validation: CommentValidationSettings;
  keywords: string[];
  links: LinkSettings;
}

export const RULE_SETTINGS_LIMITS = {
  minLength: { min: 0, max: COMMENT_CONTENT_MAX_LENGTH },
  maxLength: { min: 1, max: COMMENT_CONTENT_MAX_LENGTH },
  maxRepeatedChars: { min: 2, max: 100 },
  maxRepeatedWords: { min: 2, max: 100 },
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

export function normalizeKeyword(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function keywordIdentity(keyword: string): string {
  return normalizeKeyword(keyword.normalize('NFKC').replace(/\p{Cf}/gu, '')).toLowerCase();
}
