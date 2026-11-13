import { NextResponse, type NextRequest } from "next/server";
import { HOME_ROUTE, localizedRoute } from "@/config/routes";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath } from "@/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Locale routing. Every page URL starts with a supported locale:
 * - `/zh-CN/...` or `/en/...`: served, and the locale is remembered in a cookie.
 * - anything else (e.g. `/`): redirected to the remembered locale, else Simplified Chinese.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];

  if (isLocale(segment)) {
    const isLocaleRoot = pathname.replace(/\/$/, "") === `/${segment}`;
    const response = isLocaleRoot
      ? NextResponse.redirect(new URL(localizedRoute(segment, HOME_ROUTE), request.url))
      : NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== segment) {
      response.cookies.set(LOCALE_COOKIE, segment, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
      });
    }
    return response;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  const url = request.nextUrl.clone();
  const localized = localizePath(pathname, locale);
  url.pathname = localized === `/${locale}` ? localizedRoute(locale, HOME_ROUTE) : localized;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip route handlers (`/api/*`), Next internals and files with an extension (favicon, assets).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
