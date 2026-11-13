"use client";

import { COMMENT_CONTENT_MAX_LENGTH } from "@acms/shared";
import { App, Button, Card, Form, Input } from "antd";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useCreateComment } from "../api";
import { useCommentsUiStore } from "../store";

export function CommentForm() {
  const { dict } = useI18n();
  const t = dict.comments;
  const { message } = App.useApp();
  const draft = useCommentsUiStore((state) => state.draft);
  const setDraft = useCommentsUiStore((state) => state.setDraft);
  const clearDraft = useCommentsUiStore((state) => state.clearDraft);
  const createComment = useCreateComment();
  const content = draft.trim();

  const submit = () => {
    if (!content) return;
    createComment.mutate(
      { content },
      {
        onSuccess: (comment) => {
          clearDraft();
          message.success(format(t.submitted, { status: t.status[comment.status] }));
        },
        onError: (error) => {
          message.error(apiErrorMessage(error, dict));
        },
      },
    );
  };

  return (
    <Card title={t.formTitle}>
      <Form layout="vertical" onFinish={submit}>
        <Form.Item label={t.contentLabel}>
          <Input.TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.contentPlaceholder}
            maxLength={COMMENT_CONTENT_MAX_LENGTH}
            autoSize={{ minRows: 3, maxRows: 8 }}
            showCount
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={createComment.isPending}
          disabled={!content}
        >
          {t.submit}
        </Button>
      </Form>
    </Card>
  );
}
