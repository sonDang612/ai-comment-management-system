export const COLOR_SCHEMES = ["light", "dark"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DEFAULT_COLOR_SCHEME: ColorScheme = "light";
export const COLOR_SCHEME_COOKIE = "ACMS_THEME";
export const DARK_CLASS = "dark";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function parseColorScheme(value: unknown): ColorScheme {
  return value === "dark" ? "dark" : DEFAULT_COLOR_SCHEME;
}

export function colorSchemeCookie(scheme: ColorScheme): string {
  return `${COLOR_SCHEME_COOKIE}=${scheme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export const APPLY_COLOR_SCHEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${COLOR_SCHEME_COOKIE}=(dark|light)/);document.documentElement.classList.toggle("${DARK_CLASS}",!!m&&m[1]==="dark");}catch(e){}})();`;
