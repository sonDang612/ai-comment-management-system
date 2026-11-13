"use client";

import type { RuleSettings } from "@acms/shared";
import { Form } from "antd";
import { useI18n } from "@/i18n";
import { useSettingsUiStore } from "../store";
import { KeywordTable } from "./keyword-table";
import { SettingsSectionForm } from "./settings-section-form";

export function KeywordsSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings.keywords;
  const closeKeywordEditor = useSettingsUiStore((state) => state.closeKeywordEditor);

  return (
    <SettingsSectionForm
      section="keywords"
      settings={settings}
      title={t.title}
      description={t.description}
      onReset={closeKeywordEditor}
    >
      <Form.Item name="keywords" noStyle>
        <KeywordTable />
      </Form.Item>
    </SettingsSectionForm>
  );
}
