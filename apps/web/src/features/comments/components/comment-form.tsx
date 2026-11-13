"use client";

import { COMMENT_CONTENT_MAX_LENGTH } from "@acms/shared";
import { App, Input, Modal } from "antd";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { useCreateComment } from "../api";
import { useCommentsUiStore } from "../store";

export function CreateCommentModal() {
  const { dict } = useI18n();
  const t = dict.comments;
  const { message } = App.useApp();
  const isOpen = useCommentsUiStore((state) => state.isCreateOpen);
  const closeCreate = useCommentsUiStore((state) => state.closeCreate);
  const draft = useCommentsUiStore((state) => state.draft);
  const setDraft = useCommentsUiStore((state) => state.setDraft);
  const clearDraft = useCommentsUiStore((state) => state.clearDraft);
  const showFirstPage = useCommentsUiStore((state) => state.showFirstPage);
  const createComment = useCreateComment();
  const content = draft.trim();

  const submit = () => {
    if (!content) return;
    createComment.mutate(
      { content },
      {
        onSuccess: (comment) => {
          clearDraft();
          closeCreate();
          showFirstPage();
          const result =
            comment.is_valid === null ? t.validity.unchecked : comment.is_valid ? t.validity.valid : t.validity.invalid;
          message.success(format(t.submitted, { result }));
        },
        onError: (error) => {
          message.error(apiErrorMessage(error, dict));
        },
      },
    );
  };

  return (
    <Modal
      title={t.formTitle}
      open={isOpen}
      onCancel={closeCreate}
      onOk={submit}
      okText={t.submit}
      cancelText={t.cancel}
      okButtonProps={{ disabled: !content, loading: createComment.isPending }}
      destroyOnHidden
    >
      <label className="mb-2 block text-sm" htmlFor="comment-content">
        {t.contentLabel}
      </label>
      <Input.TextArea
        id="comment-content"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t.contentPlaceholder}
        maxLength={COMMENT_CONTENT_MAX_LENGTH}
        autoSize={{ minRows: 4, maxRows: 10 }}
        showCount
        autoFocus
        className="!mb-8"
      />
    </Modal>
  );
}
