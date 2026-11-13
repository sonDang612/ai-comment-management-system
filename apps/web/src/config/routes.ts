import type { Locale } from "@/i18n/config";

export const ROUTES = {
  comments: "/comments",
  settings: "/settings",
  status: "/status",
} as const;

export const HOME_ROUTE = ROUTES.comments;

export function localizedRoute(locale: Locale, route: string): string {
  return `/${locale}${route}`;
}
