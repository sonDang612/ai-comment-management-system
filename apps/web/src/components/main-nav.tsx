"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useI18n } from "@/i18n";

export function MainNav({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const links = [
    { href: `/${locale}`, label: dict.nav.comments },
    { href: `/${locale}/status`, label: dict.nav.status },
  ];

  return (
    <nav aria-label={dict.nav.label} className={cn("flex items-center gap-1 text-sm", className)}>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1 transition-colors hover:bg-muted",
              isActive ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
