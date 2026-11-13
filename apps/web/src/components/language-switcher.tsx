"use client";

import { Button, Modal } from "antd";
import { Check, Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { LOCALE_LABELS, LOCALES, localizePath, useI18n } from "@/i18n";

/** Switches language by navigating to the same page under another locale prefix. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <Button
        type="text"
        className={className}
        icon={<Languages className="size-4" aria-hidden />}
        aria-label={dict.common.language}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        title={dict.common.language}
        open={isOpen}
        onCancel={close}
        footer={null}
        width={360}
        centered
      >
        <nav aria-label={dict.common.language} className="flex flex-col gap-1 pt-2">
          {LOCALES.map((target) => {
            const isCurrent = target === locale;
            return (
              <Link
                key={target}
                href={localizePath(pathname, target)}
                hrefLang={target}
                lang={target}
                aria-current={isCurrent ? "true" : undefined}
                onClick={close}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {LOCALE_LABELS[target]}
                {isCurrent && <Check className="size-4" aria-hidden />}
              </Link>
            );
          })}
        </nav>
      </Modal>
    </>
  );
}
