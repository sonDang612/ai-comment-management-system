"use client";

import { MonitorSmartphone } from "lucide-react";
import { useI18n } from "@/i18n";

export function SmallScreenNotice() {
  const { dict } = useI18n();
  const t = dict.smallScreen;

  return (
    <div className="small-screen-notice flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <MonitorSmartphone className="size-12 text-muted-foreground/60" aria-hidden />
      <h1 className="!m-0 text-lg font-semibold">{t.title}</h1>
      <p className="!m-0 max-w-sm text-sm text-muted-foreground">{t.description}</p>
    </div>
  );
}
