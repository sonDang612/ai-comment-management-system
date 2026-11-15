import type { Locale } from "@/i18n/config";

export const ROUTES = {
  dashboard: "/dashboard",
  comments: "/comments",
  settings: "/settings",
  status: "/status",
} as const;

export const HOME_ROUTE = ROUTES.dashboard;

export function localizedRoute(locale: Locale, route: string): string {
  return `/${locale}${route}`;
}
