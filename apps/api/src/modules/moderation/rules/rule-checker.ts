import { Injectable } from '@nestjs/common';
import type { CommentValidationSettings, LinkSettings, RuleSettings } from '@acms/shared';
import {
  containsIpAddress,
  containsKeyword,
  contentLength,
  domainMatches,
  extractDomains,
  longestRepeatedCharRun,
  longestRepeatedWordRun,
  normalizeText,
} from './text-checks.js';

export const RuleViolationCode = {
  EMPTY_CONTENT: 'empty_content',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
  REPEATED_CHARS: 'repeated_chars',
  REPEATED_WORDS: 'repeated_words',
  RESTRICTED_KEYWORD: 'restricted_keyword',
  IP_ADDRESS: 'ip_address',
  LINK_NOT_ALLOWED: 'link_not_allowed',
} as const;
export type RuleViolationCode = (typeof RuleViolationCode)[keyof typeof RuleViolationCode];

export interface RuleViolation {
  code: RuleViolationCode;
  reason: string;
}

@Injectable()
export class RuleChecker {
  check(content: string, settings: RuleSettings): RuleViolation[] {
    const normalized = normalizeText(content);
    if (normalized.trim() === '') return [{ code: RuleViolationCode.EMPTY_CONTENT, reason: '评论内容为空' }];
    return [
      ...this.checkContent(content, normalized, settings.validation),
      ...this.checkKeywords(normalized, settings.keywords),
      ...this.checkLinks(normalized, settings.links),
    ];
  }

  private checkContent(content: string, normalized: string, rules: CommentValidationSettings): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const length = contentLength(content);
    if (length < rules.min_length) {
      violations.push({
        code: RuleViolationCode.TOO_SHORT,
        reason: `评论长度 ${length} 少于最短长度 ${rules.min_length}`,
      });
    }
    if (length > rules.max_length) {
      violations.push({
        code: RuleViolationCode.TOO_LONG,
        reason: `评论长度 ${length} 超过最长长度 ${rules.max_length}`,
      });
    }
    const repeatedChar = longestRepeatedCharRun(normalized);
    if (repeatedChar.run > rules.max_repeated_chars) {
      violations.push({
        code: RuleViolationCode.REPEATED_CHARS,
        reason: `字符“${repeatedChar.value}”连续重复 ${repeatedChar.run} 次，超过上限 ${rules.max_repeated_chars}`,
      });
    }
    const repeatedWord = longestRepeatedWordRun(normalized);
    if (repeatedWord.run > rules.max_repeated_words) {
      violations.push({
        code: RuleViolationCode.REPEATED_WORDS,
        reason: `词语“${repeatedWord.value}”连续重复 ${repeatedWord.run} 次，超过上限 ${rules.max_repeated_words}`,
      });
    }
    return violations;
  }

  private checkKeywords(normalized: string, keywords: string[]): RuleViolation[] {
    return keywords
      .filter((keyword) => containsKeyword(normalized, keyword))
      .map((keyword) => ({
        code: RuleViolationCode.RESTRICTED_KEYWORD,
        reason: `命中限制关键词“${keyword}”`,
      }));
  }

  private checkLinks(normalized: string, rules: LinkSettings): RuleViolation[] {
    const violations: RuleViolation[] = [];
    if (!rules.allow_ip_addresses && containsIpAddress(normalized)) {
      violations.push({ code: RuleViolationCode.IP_ADDRESS, reason: '评论包含 IP 地址' });
    }
    for (const domain of extractDomains(normalized)) {
      if (!domainMatches(domain, rules.domain_whitelist)) {
        violations.push({ code: RuleViolationCode.LINK_NOT_ALLOWED, reason: `包含白名单以外的链接 ${domain}` });
      }
    }
    return violations;
  }
}
