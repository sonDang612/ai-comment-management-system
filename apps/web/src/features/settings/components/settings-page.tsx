"use client";

import { Alert, Button, Card, Skeleton } from "antd";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useRuleSettings } from "../api";
import { KeywordsSection } from "./keywords-section";
import { LinksSection } from "./links-section";
import { SpamSection } from "./spam-section";
import { ValidationSection } from "./validation-section";

const SKELETON_SECTION_COUNT = 4;

export function SettingsPage() {
  const { dict } = useI18n();
  const { data, error, isPending, isFetching, refetch } = useRuleSettings();

  if (isPending) {
    return (
      <div className="flex w-full flex-col gap-4">
        {Array.from({ length: SKELETON_SECTION_COUNT }, (_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <Alert
          type="error"
          showIcon
          title={format(dict.settings.loadFailed, { message: apiErrorMessage(error, dict) })}
          action={
            <Button size="small" onClick={() => refetch()} loading={isFetching}>
              {dict.common.tryAgain}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <ValidationSection settings={data} />
      <KeywordsSection settings={data} />
      <LinksSection settings={data} />
      <SpamSection settings={data} />
    </div>
  );
}
