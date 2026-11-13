"use client";

import { Button, Dropdown, type MenuProps } from "antd";
import { Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { useNavItems } from "./sidebar-nav";

export function NavMenuButton({ className }: { className?: string }) {
  const { dict } = useI18n();
  const { items, current } = useNavItems();

  const menuItems: MenuProps["items"] = items.map(({ href, label, icon: Icon }) => ({
    key: href,
    icon: <Icon className="size-4" aria-hidden />,
    label: <Link href={href}>{label}</Link>,
  }));

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{ items: menuItems, selectable: true, selectedKeys: current ? [current.href] : [] }}
    >
      <Button
        type="text"
        className={className}
        icon={<MenuIcon className="size-4" aria-hidden />}
        aria-label={dict.nav.open}
      />
    </Dropdown>
  );
}
