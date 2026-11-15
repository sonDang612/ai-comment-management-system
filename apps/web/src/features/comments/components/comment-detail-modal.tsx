"use client";

import { Descriptions, type DescriptionsProps, Modal, Typography } from "antd";
import { useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/datetime";
import { useCommentsUiStore } from "../store";
import { CategoryTag } from "./category-tag";
import { CheckResultTag } from "./check-result-tag";

const CONFIDENCE_FRACTION_DIGITS = 2;

export function CommentDetailModal() {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  const comment = useCommentsUiStore((state) => state.detailComment);
  const closeDetail = useCommentsUiStore((state) => state.closeDetail);

  const items: DescriptionsProps["items"] = comment
    ? [
        {
          key: "content",
          label: t.columns.content,
          children: (
            <Typography.Paragraph className="!mb-0 whitespace-pre-wrap break-all">
              {comment.content || "-"}
            </Typography.Paragraph>
          ),
        },
        {
          key: "is_valid",
          label: t.columns.isValid,
          children: (
            <CheckResultTag
              value={comment.is_valid}
              trueLabel={t.validity.valid}
              falseLabel={t.validity.invalid}
              trueColor="success"
              falseColor="error"
            />
          ),
        },
        {
          key: "is_question",
          label: t.columns.isQuestion,
          children: (
            <CheckResultTag
              value={comment.is_question}
              trueLabel={t.yes}
              falseLabel={t.no}
              trueColor="processing"
              falseColor="default"
            />
          ),
        },
        {
          key: "category",
          label: t.columns.category,
          children: <CategoryTag category={comment.category} />,
        },
        {
          key: "confidence",
          label: t.columns.confidence,
          children: comment.confidence?.toFixed(CONFIDENCE_FRACTION_DIGITS) ?? "-",
        },
        {
          key: "reason",
          label: t.columns.reason,
          children: <span className="whitespace-pre-wrap break-all">{comment.reason ?? "-"}</span>,
        },
        {
          key: "created_at",
          label: t.columns.createdAt,
          children: formatDateTime(comment.created_at, locale),
        },
        {
          key: "moderated_at",
          label: t.columns.checkedAt,
          children: comment.moderated_at ? formatDateTime(comment.moderated_at, locale) : "-",
        },
        {
          key: "id",
          label: t.columns.id,
          children: <Typography.Text copyable className="font-mono text-xs">{comment.id}</Typography.Text>,
        },
      ]
    : [];

  return (
    <Modal
      title={t.detailTitle}
      open={comment !== null}
      onCancel={closeDetail}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <Descriptions column={1} bordered size="small" items={items} className="pt-2" />
    </Modal>
  );
}
