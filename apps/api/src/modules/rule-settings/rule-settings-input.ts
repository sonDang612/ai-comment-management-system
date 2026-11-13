import {
  isValidDomain,
  keywordIdentity,
  normalizeDomain,
  normalizeKeyword,
  RULE_SETTINGS_LIMITS,
  type RuleSettings,
} from '@acms/shared';
import { ValidationException } from '../../common/errors/app.exception.js';

interface ValidationIssue {
  field: string;
  rule: string;
  [key: string]: unknown;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class RuleSettingsParser {
  readonly issues: ValidationIssue[] = [];

  record(value: unknown, field: string): UnknownRecord {
    if (isRecord(value)) return value;
    this.issues.push({ field, rule: 'object' });
    return {};
  }

  boolean(value: unknown, field: string): boolean {
    if (typeof value === 'boolean') return value;
    this.issues.push({ field, rule: 'boolean' });
    return false;
  }

  integer(value: unknown, field: string, range: { min: number; max: number }): number {
    if (typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max) {
      return value;
    }
    this.issues.push({ field, rule: 'range', min: range.min, max: range.max });
    return range.min;
  }

  domains(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) {
      this.issues.push({ field, rule: 'array' });
      return [];
    }
    if (value.length > RULE_SETTINGS_LIMITS.maxDomainsPerList) {
      this.issues.push({ field, rule: 'max_items', max: RULE_SETTINGS_LIMITS.maxDomainsPerList });
    }
    const domains: string[] = [];
    value.forEach((item, index) => {
      const domain = typeof item === 'string' ? normalizeDomain(item) : '';
      if (!isValidDomain(domain)) this.issues.push({ field: `${field}[${index}]`, rule: 'domain' });
      else if (domains.includes(domain)) this.issues.push({ field: `${field}[${index}]`, rule: 'unique' });
      else domains.push(domain);
    });
    return domains;
  }

  keywords(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) {
      this.issues.push({ field, rule: 'array' });
      return [];
    }
    if (value.length > RULE_SETTINGS_LIMITS.maxKeywords) {
      this.issues.push({ field, rule: 'max_items', max: RULE_SETTINGS_LIMITS.maxKeywords });
    }
    const keywords: string[] = [];
    const seen = new Set<string>();
    value.forEach((item, index) => {
      const keyword = typeof item === 'string' ? normalizeKeyword(item) : '';
      if (keyword === '' || keyword.length > RULE_SETTINGS_LIMITS.keywordMaxLength) {
        this.issues.push({
          field: `${field}[${index}]`,
          rule: 'length',
          min: 1,
          max: RULE_SETTINGS_LIMITS.keywordMaxLength,
        });
      } else if (seen.has(keywordIdentity(keyword))) {
        this.issues.push({ field: `${field}[${index}]`, rule: 'unique' });
      } else {
        seen.add(keywordIdentity(keyword));
        keywords.push(keyword);
      }
    });
    return keywords;
  }
}

export function parseRuleSettings(body: unknown): RuleSettings {
  const parser = new RuleSettingsParser();
  const root = parser.record(body, 'body');
  const validation = parser.record(root['validation'], 'validation');
  const links = parser.record(root['links'], 'links');

  const settings: RuleSettings = {
    validation: {
      min_length: parser.integer(validation['min_length'], 'validation.min_length', RULE_SETTINGS_LIMITS.minLength),
      max_length: parser.integer(validation['max_length'], 'validation.max_length', RULE_SETTINGS_LIMITS.maxLength),
      allow_empty: parser.boolean(validation['allow_empty'], 'validation.allow_empty'),
      allow_emoji_only: parser.boolean(validation['allow_emoji_only'], 'validation.allow_emoji_only'),
      max_repeated_chars: parser.integer(
        validation['max_repeated_chars'],
        'validation.max_repeated_chars',
        RULE_SETTINGS_LIMITS.maxRepeatedChars,
      ),
    },
    keywords: parser.keywords(root['keywords'], 'keywords'),
    links: {
      domain_whitelist: parser.domains(links['domain_whitelist'], 'links.domain_whitelist'),
    },
  };

  if (settings.validation.min_length > settings.validation.max_length) {
    parser.issues.push({ field: 'validation.max_length', rule: 'gte', other: 'validation.min_length' });
  }

  if (parser.issues.length > 0) {
    throw new ValidationException('Rule settings are invalid', parser.issues);
  }
  return settings;
}
