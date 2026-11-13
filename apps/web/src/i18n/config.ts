/**
 * Supported UI languages. Every page lives under `/[lang]/…` (e.g. `/zh-CN/comments`).
 * Simplified Chinese is the default: `src/proxy.ts` sends URLs without a locale to the
 * language saved in the `NEXT_LOCALE` cookie, or to `DEFAULT_LOCALE`.
 */
export const LOCALES = ["zh-CN", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

/** Remembers the last language the user opened (set by the proxy). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language's name in that language, for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Replaces (or adds) the locale segment of a pathname: `/en/a/b` -> `/zh-CN/a/b`. */
export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/").replace(/\/$/, "") || `/${locale}`;
}
