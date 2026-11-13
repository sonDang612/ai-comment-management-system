import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/zh-CN";

/**
 * Server-only i18n helpers. `next/root-params` reads `[lang]` from the URL in any Server
 * Component or server utility (it fails the build if imported by a Client Component).
 * Client Components use `useI18n()` from `@/i18n/provider` instead.
 */

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  "zh-CN": () => import("./dictionaries/zh-CN").then((m) => m.default),
  en: () => import("./dictionaries/en").then((m) => m.default),
};

export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
