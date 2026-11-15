"use client";

import { Button } from "antd";
import { ArrowLeft, House } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOME_ROUTE, localizedRoute } from "@/config/routes";
import { useI18n } from "@/i18n";

// A Client Component reading the layout's I18nProvider: `not-found` receives no params.
export default function NotFound() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const t = dict.notFoundPage;

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="!m-0 font-mono text-7xl font-semibold tracking-tight text-muted-foreground/40 sm:text-8xl">
        {t.code}
      </p>
      <h1 className="!m-0 text-xl font-semibold">{t.title}</h1>
      <p className="!m-0 max-w-md text-sm text-muted-foreground">{t.description}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => router.back()}>
          {t.goBack}
        </Button>
        <Link href={localizedRoute(locale, HOME_ROUTE)}>
          <Button type="primary" icon={<House className="size-4" aria-hidden />}>
            {dict.common.backToHome}
          </Button>
        </Link>
      </div>
    </div>
  );
}
