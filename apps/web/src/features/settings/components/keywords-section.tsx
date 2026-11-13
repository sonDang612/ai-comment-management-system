"use client";

import { Form } from "antd";
import { useI18n } from "@/i18n";
import { KeywordTable } from "./keyword-table";
import { SettingsSection } from "./settings-section";

export function KeywordsSection() {
  const { dict } = useI18n();
  const t = dict.settings.keywords;

  return (
    <SettingsSection title={t.title} description={t.description}>
      <Form.Item name="keywords" noStyle>
        <KeywordTable />
      </Form.Item>
    </SettingsSection>
  );
}
