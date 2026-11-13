// Client-safe exports. Server Components import `getDictionary` / `getLocale` from `@/i18n/server`.
export * from "./config";
export { format } from "./format";
export { I18nProvider, useI18n } from "./provider";
export type { Dictionary } from "./dictionaries/zh-CN";
