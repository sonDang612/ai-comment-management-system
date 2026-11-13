"use client";

import { RULE_SETTINGS_LIMITS, type RuleSettings } from "@acms/shared";
import { Form, InputNumber, Switch } from "antd";
import { useI18n } from "@/i18n";
import { integerRangeRules } from "../form-rules";
import { SettingsSectionForm } from "./settings-section-form";

const DETECTION_ENABLED_FIELD = ["spam", "duplicate_detection_enabled"];

export function SpamSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings.spam;

  return (
    <SettingsSectionForm section="spam" settings={settings} title={t.title} description={t.description}>
      <SpamFields />
    </SettingsSectionForm>
  );
}

function SpamFields() {
  const { dict } = useI18n();
  const t = dict.settings;
  const isDetectionEnabled = Form.useWatch(DETECTION_ENABLED_FIELD) === true;

  return (
    <div className="grid gap-x-6 sm:grid-cols-2">
      <Form.Item
        name={DETECTION_ENABLED_FIELD}
        label={t.spam.duplicateDetection}
        extra={t.spam.duplicateDetectionHint}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name={["spam", "duplicate_window_minutes"]}
        label={t.spam.duplicateWindow}
        rules={integerRangeRules(dict, RULE_SETTINGS_LIMITS.duplicateWindowMinutes)}
      >
        <InputNumber
          min={RULE_SETTINGS_LIMITS.duplicateWindowMinutes.min}
          max={RULE_SETTINGS_LIMITS.duplicateWindowMinutes.max}
          precision={0}
          suffix={t.minutes}
          disabled={!isDetectionEnabled}
          className="!w-full"
        />
      </Form.Item>
    </div>
  );
}
