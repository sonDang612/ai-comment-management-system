"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

// A Client Component reading the layout's I18nProvider: `not-found` receives no params.
export default function NotFound() {
  const { locale, dict } = useI18n();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{dict.notFoundPage.title}</h1>
      <Link href={`/${locale}`} className="text-sm underline underline-offset-4">
        {dict.common.backToHome}
      </Link>
    </main>
  );
}
