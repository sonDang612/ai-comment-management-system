"use client";

import { RULE_SETTINGS_LIMITS, type RuleSettings } from "@acms/shared";
import { Form, InputNumber, Switch } from "antd";
import { useI18n } from "@/i18n";
import { integerRangeRules } from "../form-rules";
import { SettingsSectionForm } from "./settings-section-form";

const MIN_LENGTH_FIELD = ["validation", "min_length"];

export function ValidationSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings;

  return (
    <SettingsSectionForm
      section="validation"
      settings={settings}
      title={t.validation.title}
      description={t.validation.description}
    >
      <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        <Form.Item
          name={MIN_LENGTH_FIELD}
          label={t.validation.minLength}
          rules={integerRangeRules(dict, RULE_SETTINGS_LIMITS.minLength)}
        >
          <InputNumber
            min={RULE_SETTINGS_LIMITS.minLength.min}
            max={RULE_SETTINGS_LIMITS.minLength.max}
            precision={0}
            suffix={t.characters}
            className="!w-full"
          />
        </Form.Item>
        <Form.Item
          name={["validation", "max_length"]}
          label={t.validation.maxLength}
          dependencies={[MIN_LENGTH_FIELD]}
          rules={[
            ...integerRangeRules(dict, RULE_SETTINGS_LIMITS.maxLength),
            ({ getFieldValue }) => ({
              validator: (_, maxLength: unknown) => {
                const minLength: unknown = getFieldValue(MIN_LENGTH_FIELD);
                const isInverted =
                  typeof minLength === "number" && typeof maxLength === "number" && minLength > maxLength;
                return isInverted ? Promise.reject(new Error(t.errors.minExceedsMax)) : Promise.resolve();
              },
            }),
          ]}
        >
          <InputNumber
            min={RULE_SETTINGS_LIMITS.maxLength.min}
            max={RULE_SETTINGS_LIMITS.maxLength.max}
            precision={0}
            suffix={t.characters}
            className="!w-full"
          />
        </Form.Item>
        <Form.Item
          name={["validation", "max_repeated_chars"]}
          label={t.validation.maxRepeatedChars}
          extra={t.validation.maxRepeatedCharsHint}
          rules={integerRangeRules(dict, RULE_SETTINGS_LIMITS.maxRepeatedChars)}
        >
          <InputNumber
            min={RULE_SETTINGS_LIMITS.maxRepeatedChars.min}
            max={RULE_SETTINGS_LIMITS.maxRepeatedChars.max}
            precision={0}
            className="!w-full"
          />
        </Form.Item>
        <Form.Item
          name={["validation", "allow_empty"]}
          label={t.validation.allowEmpty}
          extra={t.validation.allowEmptyHint}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name={["validation", "allow_emoji_only"]}
          label={t.validation.allowEmojiOnly}
          extra={t.validation.allowEmojiOnlyHint}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </div>
    </SettingsSectionForm>
  );
}
