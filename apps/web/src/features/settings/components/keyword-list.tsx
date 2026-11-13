"use client";

import { keywordIdentity, normalizeKeyword, RULE_SETTINGS_LIMITS } from "@acms/shared";
import { format, useI18n } from "@/i18n";
import { StringList } from "./string-list";

interface KeywordListProps {
  id?: string;
  value?: string[];
  onChange?: (keywords: string[]) => void;
}

export function KeywordList(props: KeywordListProps) {
  const { dict } = useI18n();
  const t = dict.settings.keywords;
  const errors = dict.settings.errors;

  const findError = (keyword: string, keywords: string[]): string | null => {
    if (keyword.length > RULE_SETTINGS_LIMITS.keywordMaxLength) {
      return format(errors.keywordTooLong, { max: RULE_SETTINGS_LIMITS.keywordMaxLength });
    }
    const identity = keywordIdentity(keyword);
    if (keywords.some((existing) => keywordIdentity(existing) === identity)) return errors.keywordDuplicate;
    if (keywords.length >= RULE_SETTINGS_LIMITS.maxKeywords) {
      return format(errors.keywordLimitReached, { max: RULE_SETTINGS_LIMITS.maxKeywords });
    }
    return null;
  };

  return (
    <StringList
      {...props}
      normalize={normalizeKeyword}
      findError={findError}
      placeholder={t.placeholder}
      emptyText={t.empty}
      maxLength={RULE_SETTINGS_LIMITS.keywordMaxLength}
    />
  );
}
