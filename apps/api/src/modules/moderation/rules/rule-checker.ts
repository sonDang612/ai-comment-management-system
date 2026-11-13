import { Injectable } from '@nestjs/common';
import {
  type CommentValidationSettings,
  KeywordMatchMode,
  type LinkSettings,
  type RestrictedKeyword,
  type RuleSettings,
} from '@acms/shared';
import {
  contentLength,
  domainMatches,
  extractDomains,
  isEmojiOnly,
  longestRepeatedRun,
  matchesKeyword,
  normalizeText,
} from './text-checks.js';

export const RuleViolationCode = {
  EMPTY_CONTENT: 'empty_content',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
  EMOJI_ONLY: 'emoji_only',
  REPEATED_CHARS: 'repeated_chars',
  RESTRICTED_KEYWORD: 'restricted_keyword',
  LINK_NOT_ALLOWED: 'link_not_allowed',
  DUPLICATE_CONTENT: 'duplicate_content',
} as const;
export type RuleViolationCode = (typeof RuleViolationCode)[keyof typeof RuleViolationCode];

export interface RuleViolation {
  code: RuleViolationCode;
  reason: string;
}

@Injectable()
export class RuleChecker {
  check(content: string, settings: RuleSettings): RuleViolation[] {
    if (content.trim() === '') return this.checkEmpty(settings.validation);
    return [
      ...this.checkContent(content, settings.validation),
      ...this.checkKeywords(content, settings.keywords),
      ...this.checkLinks(content, settings.links),
    ];
  }

  private checkEmpty(rules: CommentValidationSettings): RuleViolation[] {
    if (rules.allow_empty) return [];
    return [{ code: RuleViolationCode.EMPTY_CONTENT, reason: '评论内容为空' }];
  }

  private checkContent(content: string, rules: CommentValidationSettings): RuleViolation[] {
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
    if (!rules.allow_emoji_only && isEmojiOnly(content)) {
      violations.push({ code: RuleViolationCode.EMOJI_ONLY, reason: '评论只包含表情符号' });
    }
    const { char, run } = longestRepeatedRun(content);
    if (run > rules.max_repeated_chars) {
      violations.push({
        code: RuleViolationCode.REPEATED_CHARS,
        reason: `字符“${char}”连续重复 ${run} 次，超过上限 ${rules.max_repeated_chars}`,
      });
    }
    return violations;
  }

  private checkKeywords(content: string, keywords: RestrictedKeyword[]): RuleViolation[] {
    const normalizedContent = normalizeText(content);
    return keywords
      .filter(
        (keyword) =>
          keyword.enabled &&
          matchesKeyword(normalizedContent, keyword.keyword, keyword.match_mode === KeywordMatchMode.EXACT),
      )
      .map((keyword) => ({
        code: RuleViolationCode.RESTRICTED_KEYWORD,
        reason: `命中限制关键词“${keyword.keyword}”`,
      }));
  }

  private checkLinks(content: string, rules: LinkSettings): RuleViolation[] {
    return extractDomains(content)
      .filter((domain) => !domainMatches(domain, rules.domain_whitelist))
      .map((domain) => ({
        code: RuleViolationCode.LINK_NOT_ALLOWED,
        reason: `包含白名单以外的链接 ${domain}`,
      }));
  }
}
