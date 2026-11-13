"use client";

import { isValidDomain, normalizeDomain, RULE_SETTINGS_LIMITS } from "@acms/shared";
import { format, useI18n } from "@/i18n";
import { StringList } from "./string-list";

interface DomainListProps {
  id?: string;
  value?: string[];
  onChange?: (domains: string[]) => void;
}

export function DomainList(props: DomainListProps) {
  const { dict } = useI18n();
  const t = dict.settings.links;
  const errors = dict.settings.errors;

  const findError = (domain: string, domains: string[]): string | null => {
    if (!isValidDomain(domain)) return errors.domainInvalid;
    if (domains.includes(domain)) return errors.domainDuplicate;
    if (domains.length >= RULE_SETTINGS_LIMITS.maxDomainsPerList) {
      return format(errors.domainLimitReached, { max: RULE_SETTINGS_LIMITS.maxDomainsPerList });
    }
    return null;
  };

  return (
    <StringList
      {...props}
      normalize={normalizeDomain}
      findError={findError}
      placeholder={t.domainPlaceholder}
      emptyText={t.empty}
      maxLength={RULE_SETTINGS_LIMITS.domainMaxLength}
      monospace
    />
  );
}
