"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { LOCALE_LABELS, LOCALES, localizePath, useI18n } from "@/i18n";

/** Switches language by navigating to the same page under another locale prefix. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();

  return (
    <nav aria-label={dict.common.language} className={cn("flex items-center gap-1 text-sm", className)}>
      <Languages className="size-4 text-muted-foreground" aria-hidden />
      {LOCALES.map((target) => (
        <Link
          key={target}
          href={localizePath(pathname, target)}
          hrefLang={target}
          lang={target}
          aria-current={target === locale ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 transition-colors hover:bg-muted",
            target === locale ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {LOCALE_LABELS[target]}
        </Link>
      ))}
    </nav>
  );
}
