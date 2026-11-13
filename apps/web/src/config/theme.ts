export const COLOR_SCHEMES = ["light", "dark"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DEFAULT_COLOR_SCHEME: ColorScheme = "dark";
export const COLOR_SCHEME_COOKIE = "ACMS_THEME";
export const DARK_CLASS = "dark";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function parseColorScheme(value: unknown): ColorScheme {
  return value === "light" || value === "dark" ? value : DEFAULT_COLOR_SCHEME;
}

export function colorSchemeCookie(scheme: ColorScheme): string {
  return `${COLOR_SCHEME_COOKIE}=${scheme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export const APPLY_COLOR_SCHEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${COLOR_SCHEME_COOKIE}=(dark|light)/);var s=m?m[1]:"${DEFAULT_COLOR_SCHEME}";var e=document.documentElement;e.classList.toggle("${DARK_CLASS}",s==="dark");e.style.colorScheme=s;}catch(e){}})();`;
