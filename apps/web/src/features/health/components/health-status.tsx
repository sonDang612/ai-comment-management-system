"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/config/env";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useHealth } from "../api";

export function HealthStatus() {
  const { locale, dict } = useI18n();
  const t = dict.health;
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useHealth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription className="break-all">{env.apiUrl}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <p className="text-sm text-muted-foreground">{t.checking}</p>}

        {error && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">
              {format(t.unreachable, { message: apiErrorMessage(error, dict) })}
            </span>
            <Badge variant="destructive">{t.status.down}</Badge>
          </div>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">
                {data.service} v{data.version} ({data.environment})
              </span>
              <Badge variant={data.status === "ok" ? "default" : "destructive"}>
                {t.status[data.status]}
              </Badge>
            </div>
            <ul className="flex flex-col gap-2">
              {Object.entries(data.checks).map(([name, check]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span>{t.checks[name] ?? name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {check.latency_ms !== null && `${check.latency_ms} ms`}
                    <Badge variant={check.status === "ok" ? "secondary" : "destructive"}>
                      {t.status[check.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {format(t.lastChecked, { time: formatDateTime(dataUpdatedAt, locale) })}
            </p>
          </>
        )}

        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? t.refreshing : t.refresh}
        </Button>
      </CardContent>
    </Card>
  );
}
