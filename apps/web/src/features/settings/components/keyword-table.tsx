"use client";

import {
  KeywordAction,
  keywordIdentity,
  NEW_RESTRICTED_KEYWORD_DEFAULTS,
  RULE_SETTINGS_LIMITS,
  type RestrictedKeyword,
  type RestrictedKeywordDraft,
} from "@acms/shared";
import { Button, Popconfirm, Switch, Table, type TableColumnsType, Tag, Tooltip } from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { format, useI18n } from "@/i18n";
import { useSettingsUiStore } from "../store";
import { KeywordModal } from "./keyword-modal";

const KEYWORD_PAGE_SIZE = 10;

const KEYWORD_ACTION_COLORS: Record<KeywordAction, string> = {
  [KeywordAction.DISABLED]: "error",
  [KeywordAction.PENDING]: "warning",
};

function createKeywordId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `keyword-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface KeywordTableProps {
  value?: RestrictedKeyword[];
  onChange?: (keywords: RestrictedKeyword[]) => void;
}

export function KeywordTable({ value = [], onChange }: KeywordTableProps) {
  const { dict } = useI18n();
  const t = dict.settings.keywords;
  const editor = useSettingsUiStore((state) => state.keywordEditor);
  const openKeywordCreate = useSettingsUiStore((state) => state.openKeywordCreate);
  const openKeywordEdit = useSettingsUiStore((state) => state.openKeywordEdit);
  const closeKeywordEditor = useSettingsUiStore((state) => state.closeKeywordEditor);

  const editingKeyword =
    editor?.mode === "edit" ? value.find((keyword) => keyword.id === editor.keywordId) : undefined;
  const isLimitReached = value.length >= RULE_SETTINGS_LIMITS.maxKeywords;
  const takenKeywords = new Set(
    value.filter((keyword) => keyword.id !== editingKeyword?.id).map((keyword) => keywordIdentity(keyword.keyword)),
  );

  const updateKeyword = (id: string, patch: Partial<RestrictedKeywordDraft>) =>
    onChange?.(value.map((keyword) => (keyword.id === id ? { ...keyword, ...patch } : keyword)));

  const removeKeyword = (id: string) => onChange?.(value.filter((keyword) => keyword.id !== id));

  const submitKeyword = (draft: RestrictedKeywordDraft) => {
    if (editingKeyword) updateKeyword(editingKeyword.id, draft);
    else onChange?.([...value, { id: createKeywordId(), ...draft }]);
    closeKeywordEditor();
  };

  const columns: TableColumnsType<RestrictedKeyword> = [
    {
      key: "keyword",
      title: t.keyword,
      render: (_, keyword) => <span className="break-all">{keyword.keyword}</span>,
    },
    {
      key: "match_mode",
      title: t.matchMode,
      width: 130,
      render: (_, keyword) => t.matchModes[keyword.match_mode],
    },
    {
      key: "action",
      title: t.action,
      width: 110,
      render: (_, keyword) => (
        <Tag color={KEYWORD_ACTION_COLORS[keyword.action]}>{t.actions[keyword.action]}</Tag>
      ),
    },
    {
      key: "enabled",
      title: t.enabled,
      width: 90,
      render: (_, keyword) => (
        <Switch
          size="small"
          checked={keyword.enabled}
          onChange={(enabled) => updateKeyword(keyword.id, { enabled })}
          aria-label={format(t.toggleLabel, { keyword: keyword.keyword })}
        />
      ),
    },
    {
      key: "operations",
      title: t.operations,
      width: 110,
      render: (_, keyword) => (
        <div className="flex items-center gap-1">
          <Tooltip title={t.edit}>
            <Button
              type="text"
              size="small"
              icon={<Pencil className="size-4" aria-hidden />}
              aria-label={t.edit}
              onClick={() => openKeywordEdit(keyword.id)}
            />
          </Tooltip>
          <Popconfirm
            title={format(t.deleteConfirm, { keyword: keyword.keyword })}
            okText={t.delete}
            cancelText={dict.settings.cancel}
            okButtonProps={{ danger: true }}
            onConfirm={() => removeKeyword(keyword.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 className="size-4" aria-hidden />}
              aria-label={t.delete}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Tooltip title={isLimitReached ? format(t.limitReached, { max: RULE_SETTINGS_LIMITS.maxKeywords }) : undefined}>
          <Button
            icon={<Plus className="size-4" aria-hidden />}
            onClick={openKeywordCreate}
            disabled={isLimitReached}
          >
            {t.add}
          </Button>
        </Tooltip>
      </div>
      <Table<RestrictedKeyword>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={value}
        locale={{ emptyText: t.empty }}
        scroll={{ x: 640 }}
        pagination={{
          pageSize: KEYWORD_PAGE_SIZE,
          hideOnSinglePage: true,
          showSizeChanger: false,
          showTotal: (total) => format(t.total, { total }),
        }}
      />
      <KeywordModal
        open={editor !== null && (editor.mode === "create" || editingKeyword !== undefined)}
        isEditing={editingKeyword !== undefined}
        initialValues={editingKeyword ?? NEW_RESTRICTED_KEYWORD_DEFAULTS}
        takenKeywords={takenKeywords}
        onSubmit={submitKeyword}
        onCancel={closeKeywordEditor}
      />
    </div>
  );
}
