"use client";

import { Button, Layout } from "antd";
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import { LanguageSwitcher } from "./language-switcher";
import { NavMenuButton } from "./nav-menu-button";
import { SidebarNav, useNavItems } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 64;

export function DashboardShell({ children }: { children: ReactNode }) {
  const { dict } = useI18n();
  const { current } = useNavItems();
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const isCollapsed = !isSidebarOpen;
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <Layout hasSider className="h-dvh overflow-hidden">
      <Layout.Sider
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        collapsed={isCollapsed}
        trigger={null}
        theme="light"
        className="h-dvh border-e max-lg:!hidden"
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2 font-semibold",
            isCollapsed ? "justify-center" : "px-6",
          )}
          title={dict.common.appName}
        >
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          {!isCollapsed && <span>{dict.common.appShortName}</span>}
        </div>
        <SidebarNav />
      </Layout.Sider>
      <Layout className="min-w-0">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="text"
              className="max-lg:!hidden"
              icon={<ToggleIcon className="size-4" aria-hidden />}
              aria-label={isSidebarOpen ? dict.nav.close : dict.nav.open}
              aria-expanded={isSidebarOpen}
              onClick={toggleSidebar}
            />
            <ShieldCheck className="size-5 shrink-0 text-primary lg:hidden" aria-label={dict.common.appName} />
            {current && <h1 className="truncate text-base font-semibold">{current.label}</h1>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <NavMenuButton className="lg:!hidden" />
          </div>
        </header>
        <Layout.Content className="flex min-h-0 w-full flex-1 flex-col overflow-auto p-4 md:p-6">
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
