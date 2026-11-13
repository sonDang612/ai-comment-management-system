"use client";

import {
  KeywordAction,
  KeywordMatchMode,
  keywordIdentity,
  RULE_SETTINGS_LIMITS,
  type RestrictedKeywordDraft,
} from "@acms/shared";
import { Form, Input, Modal, Select, Switch } from "antd";
import { format, useI18n } from "@/i18n";

const KEYWORD_FORM_ID = "restricted-keyword-form";

interface KeywordModalProps {
  open: boolean;
  isEditing: boolean;
  initialValues: RestrictedKeywordDraft;
  takenKeywords: ReadonlySet<string>;
  onSubmit: (draft: RestrictedKeywordDraft) => void;
  onCancel: () => void;
}

export function KeywordModal({
  open,
  isEditing,
  initialValues,
  takenKeywords,
  onSubmit,
  onCancel,
}: KeywordModalProps) {
  const { dict } = useI18n();
  const t = dict.settings.keywords;
  const errors = dict.settings.errors;

  return (
    <Modal
      title={isEditing ? t.editTitle : t.addTitle}
      open={open}
      onCancel={onCancel}
      okText={isEditing ? dict.settings.save : t.add}
      cancelText={dict.settings.cancel}
      okButtonProps={{ htmlType: "submit", form: KEYWORD_FORM_ID }}
      destroyOnHidden
    >
      <Form<RestrictedKeywordDraft>
        id={KEYWORD_FORM_ID}
        layout="vertical"
        requiredMark={false}
        initialValues={initialValues}
        onFinish={(values) => onSubmit({ ...values, keyword: values.keyword.trim() })}
        className="pt-2"
      >
        <Form.Item
          name="keyword"
          label={t.keyword}
          rules={[
            { required: true, whitespace: true, message: errors.keywordRequired },
            {
              max: RULE_SETTINGS_LIMITS.keywordMaxLength,
              message: format(errors.keywordTooLong, { max: RULE_SETTINGS_LIMITS.keywordMaxLength }),
            },
            {
              validator: (_, keyword: unknown) =>
                typeof keyword === "string" && takenKeywords.has(keywordIdentity(keyword))
                  ? Promise.reject(new Error(errors.keywordDuplicate))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input
            placeholder={t.keywordPlaceholder}
            maxLength={RULE_SETTINGS_LIMITS.keywordMaxLength}
            autoFocus
          />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="match_mode" label={t.matchMode}>
            <Select
              options={Object.values(KeywordMatchMode).map((mode) => ({
                value: mode,
                label: t.matchModes[mode],
              }))}
            />
          </Form.Item>
          <Form.Item name="action" label={t.action}>
            <Select
              options={Object.values(KeywordAction).map((action) => ({
                value: action,
                label: dict.comments.status[action],
              }))}
            />
          </Form.Item>
        </div>
        <Form.Item name="enabled" label={t.enabled} valuePropName="checked" className="!mb-0">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
