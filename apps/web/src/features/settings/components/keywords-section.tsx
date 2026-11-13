"use client";

import type { RuleSettings } from "@acms/shared";
import { Form } from "antd";
import { useI18n } from "@/i18n";
import { KeywordList } from "./keyword-list";
import { SettingsSectionForm } from "./settings-section-form";

export function KeywordsSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings.keywords;

  return (
    <SettingsSectionForm section="keywords" settings={settings} title={t.title} description={t.description}>
      <Form.Item name="keywords" label={t.list} extra={t.hint} className="md:max-w-xl">
        <KeywordList />
      </Form.Item>
    </SettingsSectionForm>
  );
}
