"use client";

import { Button, Dropdown, type MenuProps } from "antd";
import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_LABELS, LOCALES, localizePath, useI18n } from "@/i18n";

/** Switches language by navigating to the same page under another locale prefix. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();

  const items: MenuProps["items"] = LOCALES.map((target) => ({
    key: target,
    label: (
      <Link
        href={localizePath(pathname, target)}
        hrefLang={target}
        lang={target}
        aria-current={target === locale ? "true" : undefined}
      >
        {LOCALE_LABELS[target]}
      </Link>
    ),
  }));

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{ items, selectable: true, selectedKeys: [locale] }}
    >
      <Button
        type="text"
        className={className}
        icon={<Languages className="size-4" aria-hidden />}
        aria-label={dict.common.language}
      />
    </Dropdown>
  );
}
