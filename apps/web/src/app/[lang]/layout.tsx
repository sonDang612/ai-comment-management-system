import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { APPLY_COLOR_SCHEME_SCRIPT } from "@/config/theme";
import { I18nProvider, LOCALES } from "@/i18n";
import { getDictionary, getLocale } from "@/i18n/server";
import { AppProviders } from "@/providers";
import "../globals.css";

// Latin glyphs only; Chinese text falls back to the system CJK font chosen from `<html lang>`.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Required with Cache Components: prerender one shell per supported language.
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `/${locale}`])),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_COLOR_SCHEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <Suspense fallback={null}>
            <AppProviders>
              <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <MainNav />
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
              </header>
              {children}
            </AppProviders>
          </Suspense>
        </I18nProvider>
      </body>
    </html>
  );
}
