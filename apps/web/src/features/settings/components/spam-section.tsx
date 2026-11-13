"use client";

import { RULE_SETTINGS_LIMITS } from "@acms/shared";
import { Form, InputNumber, Switch } from "antd";
import { useI18n } from "@/i18n";
import { integerRangeRules } from "../form-rules";
import { SettingsSection } from "./settings-section";

const DETECTION_ENABLED_FIELD = ["spam", "duplicate_detection_enabled"];

export function SpamSection() {
  const { dict } = useI18n();
  const t = dict.settings;
  const isDetectionEnabled = Form.useWatch(DETECTION_ENABLED_FIELD) === true;

  return (
    <SettingsSection title={t.spam.title} description={t.spam.description}>
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
    </SettingsSection>
  );
}
