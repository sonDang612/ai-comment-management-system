"use client";

import { isValidDomain, normalizeDomain, RULE_SETTINGS_LIMITS } from "@acms/shared";
import { Button, Input, Space, Typography } from "antd";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { format, useI18n } from "@/i18n";

interface DomainListProps {
  id?: string;
  value?: string[];
  onChange?: (domains: string[]) => void;
  otherList: string[];
  otherListLabel: string;
}

export function DomainList({ id, value = [], onChange, otherList, otherListLabel }: DomainListProps) {
  const { dict } = useI18n();
  const t = dict.settings.links;
  const errors = dict.settings.errors;
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const findError = (domain: string): string | null => {
    if (!isValidDomain(domain)) return errors.domainInvalid;
    if (value.includes(domain)) return errors.domainDuplicate;
    if (otherList.includes(domain)) return format(errors.domainInOtherList, { list: otherListLabel });
    if (value.length >= RULE_SETTINGS_LIMITS.maxDomainsPerList) {
      return format(errors.domainLimitReached, { max: RULE_SETTINGS_LIMITS.maxDomainsPerList });
    }
    return null;
  };

  const addDomain = () => {
    const domain = normalizeDomain(input);
    if (domain === "") return;
    const domainError = findError(domain);
    setError(domainError);
    if (domainError) return;
    onChange?.([...value, domain]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Space.Compact className="w-full">
        <Input
          id={id}
          value={input}
          status={error ? "error" : undefined}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          onPressEnter={(event) => {
            event.preventDefault();
            addDomain();
          }}
          placeholder={t.domainPlaceholder}
          maxLength={RULE_SETTINGS_LIMITS.domainMaxLength}
        />
        <Button icon={<Plus className="size-4" aria-hidden />} onClick={addDomain}>
          {t.add}
        </Button>
      </Space.Compact>
      {error && (
        <Typography.Text type="danger" className="text-sm" role="alert">
          {error}
        </Typography.Text>
      )}
      {value.length === 0 ? (
        <Typography.Text type="secondary" className="block rounded-md border border-dashed px-3 py-4 text-center text-sm">
          {t.empty}
        </Typography.Text>
      ) : (
        <ul className="max-h-60 divide-y overflow-auto rounded-md border">
          {value.map((domain) => (
            <li key={domain} className="flex items-center justify-between gap-2 py-1 ps-3 pe-1">
              <span className="min-w-0 truncate font-mono text-sm" title={domain}>
                {domain}
              </span>
              <Button
                type="text"
                size="small"
                icon={<X className="size-4" aria-hidden />}
                aria-label={format(t.removeLabel, { domain })}
                title={t.remove}
                onClick={() => onChange?.(value.filter((item) => item !== domain))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
