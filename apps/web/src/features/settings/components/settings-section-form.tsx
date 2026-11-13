"use client";

import type { RuleSettings } from "@acms/shared";
import { App, Button, Form, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useUpdateRuleSettings } from "../api";
import { SettingsSection } from "./settings-section";

type SectionKey = keyof RuleSettings;
type SectionValues<K extends SectionKey> = Pick<RuleSettings, K>;

interface SettingsSectionFormProps<K extends SectionKey> {
  section: K;
  settings: RuleSettings;
  title: string;
  description: string;
  children: ReactNode;
}

function sectionValues<K extends SectionKey>(section: K, settings: RuleSettings): SectionValues<K> {
  return { [section]: settings[section] } as SectionValues<K>;
}

export function SettingsSectionForm<K extends SectionKey>({
  section,
  settings,
  title,
  description,
  children,
}: SettingsSectionFormProps<K>) {
  const { dict } = useI18n();
  const t = dict.settings;
  const { message } = App.useApp();
  const [form] = Form.useForm<SectionValues<K>>();
  const [isDirty, setIsDirty] = useState(false);
  const updateSettings = useUpdateRuleSettings();

  const save = (values: SectionValues<K>) => {
    updateSettings.mutate(
      { ...settings, ...values },
      {
        onSuccess: (saved) => {
          form.setFieldsValue(sectionValues(section, saved));
          setIsDirty(false);
          message.success(format(t.sectionSaved, { section: title }));
        },
        onError: (saveError) => {
          message.error(format(t.saveFailed, { message: apiErrorMessage(saveError, dict) }));
        },
      },
    );
  };

  const cancel = () => {
    form.resetFields();
    setIsDirty(false);
  };

  return (
    <Form<SectionValues<K>>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={sectionValues(section, settings)}
      onValuesChange={() => setIsDirty(true)}
      onFinish={save}
      onFinishFailed={() => message.error(t.invalid)}
      scrollToFirstError={{ block: "center" }}
      disabled={updateSettings.isPending}
    >
      <SettingsSection
        title={title}
        description={description}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
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
        }
      >
        {children}
      </SettingsSection>
    </Form>
  );
}
