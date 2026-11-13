"use client";

import type { RuleSettings } from "@acms/shared";
import { Alert, App, Button, Card, Form, Skeleton, Typography } from "antd";
import { useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useRuleSettings, useUpdateRuleSettings } from "../api";
import { useSettingsUiStore } from "../store";
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
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
      <div className="mx-auto w-full max-w-5xl">
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

  return <RuleSettingsForm settings={data} />;
}

function RuleSettingsForm({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings;
  const { message } = App.useApp();
  const [form] = Form.useForm<RuleSettings>();
  const [isDirty, setIsDirty] = useState(false);
  const updateSettings = useUpdateRuleSettings();
  const closeKeywordEditor = useSettingsUiStore((state) => state.closeKeywordEditor);

  const save = (values: RuleSettings) => {
    updateSettings.mutate(values, {
      onSuccess: (saved) => {
        form.setFieldsValue(saved);
        setIsDirty(false);
        message.success(t.saved);
      },
      onError: (saveError) => {
        message.error(format(t.saveFailed, { message: apiErrorMessage(saveError, dict) }));
      },
    });
  };

  const cancel = () => {
    form.resetFields();
    closeKeywordEditor();
    setIsDirty(false);
  };

  return (
    <Form<RuleSettings>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={settings}
      onValuesChange={() => setIsDirty(true)}
      onFinish={save}
      onFinishFailed={() => message.error(t.invalid)}
      scrollToFirstError={{ block: "center" }}
      disabled={updateSettings.isPending}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4"
    >
      <ValidationSection />
      <KeywordsSection />
      <LinksSection />
      <SpamSection />
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-lg border bg-background/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {isDirty && (
          <Typography.Text type="warning" className="me-auto text-sm">
            {t.unsavedChanges}
          </Typography.Text>
        )}
        <div className="flex gap-2">
          <Button htmlType="button" onClick={cancel} disabled={!isDirty || updateSettings.isPending}>
            {t.cancel}
          </Button>
          <Button type="primary" htmlType="submit" disabled={!isDirty} loading={updateSettings.isPending}>
            {t.save}
          </Button>
        </div>
      </div>
    </Form>
  );
}
