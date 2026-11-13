"use client";

import { Menu, type MenuProps } from "antd";
import { Activity, type LucideIcon, MessageSquareText, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizedRoute, ROUTES } from "@/config/routes";
import { useI18n } from "@/i18n";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function useNavItems(): { items: NavItem[]; current: NavItem | undefined } {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: localizedRoute(locale, ROUTES.comments), label: dict.nav.comments, icon: MessageSquareText },
    { href: localizedRoute(locale, ROUTES.settings), label: dict.nav.settings, icon: SlidersHorizontal },
    { href: localizedRoute(locale, ROUTES.status), label: dict.nav.status, icon: Activity },
  ];
  return { items, current: items.find((item) => pathname.startsWith(item.href)) };
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { dict } = useI18n();
  const { items, current } = useNavItems();

  const menuItems: MenuProps["items"] = items.map(({ href, label, icon: Icon }) => ({
    key: href,
    icon: <Icon className="size-4" aria-hidden />,
    label: (
      <Link href={href} onClick={onNavigate}>
        {label}
      </Link>
    ),
  }));

  return (
    <nav aria-label={dict.nav.label}>
      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={current ? [current.href] : []}
        className="!border-e-0"
      />
    </nav>
  );
}
