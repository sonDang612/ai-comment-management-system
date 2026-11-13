"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { logger } from "@/lib/logger";

/** Route-level error boundary: catches render errors below the root layout. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const { dict } = useI18n();

  useEffect(() => {
    const message = error instanceof Error ? error.message : String(error);
    const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
    logger.error("Unhandled route error", { message, digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{dict.errorPage.title}</h1>
      <p className="text-sm text-muted-foreground">{dict.errorPage.description}</p>
      <Button onClick={() => retry()}>{dict.common.tryAgain}</Button>
    </div>
  );
}
