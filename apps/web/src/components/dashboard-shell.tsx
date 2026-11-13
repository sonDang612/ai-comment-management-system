"use client";

import { Button, Grid, Layout } from "antd";
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import { LanguageSwitcher } from "./language-switcher";
import { SidebarNav, useNavItems } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 64;

export function DashboardShell({ children }: { children: ReactNode }) {
  const { dict } = useI18n();
  const { current } = useNavItems();
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg ?? true;
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const closeMobileNav = () => setIsMobileNavOpen(false);

  const isSiderVisible = isDesktop || isMobileNavOpen;
  const isCollapsed = isDesktop && !isSidebarOpen;
  const isNavExpanded = isDesktop ? isSidebarOpen : isMobileNavOpen;
  const toggleLabel = isNavExpanded ? dict.nav.close : dict.nav.open;
  const ToggleIcon = isDesktop ? (isSidebarOpen ? PanelLeftClose : PanelLeftOpen) : MenuIcon;

  return (
    <Layout hasSider className="h-dvh overflow-hidden">
      {isSiderVisible && (
        <Layout.Sider
          width={SIDER_WIDTH}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          collapsed={isCollapsed}
          trigger={null}
          theme="light"
          className={
            isDesktop
              ? "h-dvh border-e"
              : "!fixed inset-y-0 start-0 z-[60] h-dvh border-e shadow-lg"
          }
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
          <SidebarNav onNavigate={isDesktop ? undefined : closeMobileNav} />
        </Layout.Sider>
      )}
      {!isDesktop && isMobileNavOpen && (
        <button
          type="button"
          aria-label={dict.nav.close}
          className="fixed inset-0 z-[55] bg-black/40"
          onClick={closeMobileNav}
        />
      )}
      <Layout className="min-w-0">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="text"
              icon={<ToggleIcon className="size-4" aria-hidden />}
              aria-label={toggleLabel}
              aria-expanded={isNavExpanded}
              onClick={isDesktop ? toggleSidebar : () => setIsMobileNavOpen(true)}
            />
            {current && <h1 className="truncate text-base font-semibold">{current.label}</h1>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        <Layout.Content className="flex min-h-0 w-full flex-1 flex-col overflow-auto p-4 md:p-6">
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
