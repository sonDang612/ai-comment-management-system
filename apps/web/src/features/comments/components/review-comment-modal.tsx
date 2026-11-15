"use client";

import {
  COMMENT_CATEGORIES,
  type CommentCategory,
  type CommentDto,
  categoryMatchesLabel,
  MODERATION_LABELS,
  type ModerationLabel,
} from "@acms/shared";
import { App, Modal, Radio, Select, Typography } from "antd";
import { useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useReviewComment } from "../api";
import { useCommentsUiStore } from "../store";
import { CategoryPrediction, LabelPrediction, modelClassName } from "./model-output";

const DEFAULT_LABEL: ModerationLabel = "valid";

function isModerationLabel(name: string | undefined): name is ModerationLabel {
  return (MODERATION_LABELS as readonly string[]).includes(name ?? "");
}

function isCommentCategory(name: string | undefined): name is CommentCategory {
  return (COMMENT_CATEGORIES as readonly string[]).includes(name ?? "");
}

function initialLabel(comment: CommentDto): ModerationLabel {
  if (comment.review) return comment.review.label;
  const predicted = comment.model_output?.label_probabilities[0]?.name;
  if (isModerationLabel(predicted)) return predicted;
  return comment.decided_by === "rule_filter" ? "invalid" : DEFAULT_LABEL;
}

function initialCategory(comment: CommentDto, label: ModerationLabel): CommentCategory | null {
  if (comment.review) return comment.review.category;
  const predicted = comment.model_output?.category_probabilities[0]?.name;
  return isCommentCategory(predicted) && categoryMatchesLabel(predicted, label) ? predicted : null;
}

function ReviewForm({ comment, onDone }: { comment: CommentDto; onDone: () => void }) {
  const { dict, locale } = useI18n();
  const t = dict.comments.review;
  const names = dict.comments.modelClasses;
  const { message } = App.useApp();
  const reviewComment = useReviewComment();
  const [label, setLabel] = useState<ModerationLabel>(() => initialLabel(comment));
  const [category, setCategory] = useState<CommentCategory | null>(() => initialCategory(comment, label));
  const categoryOptions = COMMENT_CATEGORIES.filter((item) => categoryMatchesLabel(item, label)).map((item) => ({
    value: item,
    label: modelClassName(names, "category", item),
  }));

  const changeLabel = (next: ModerationLabel) => {
    setLabel(next);
    if (category && !categoryMatchesLabel(category, next)) setCategory(null);
  };

  const submit = () => {
    if (!category) return;
    reviewComment.mutate(
      { id: comment.id, label, category },
      {
        onSuccess: () => {
          message.success(t.saved);
          onDone();
        },
        onError: (error) => {
          message.error(apiErrorMessage(error, dict));
        },
      },
    );
  };

  return (
    <Modal
      title={t.title}
      open
      onCancel={onDone}
      onOk={submit}
      okText={t.submit}
      cancelText={t.cancel}
      okButtonProps={{ disabled: !category, loading: reviewComment.isPending }}
      destroyOnHidden
    >
      <div className="grid gap-4">
        <p className="!m-0 text-[13px] text-muted-foreground">{t.description}</p>
        <Typography.Paragraph
          className="!mb-0 whitespace-pre-wrap break-all rounded-lg border border-border bg-muted/40 px-3 py-2"
          ellipsis={{ rows: 4, expandable: "collapsible" }}
        >
          {comment.content}
        </Typography.Paragraph>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted-foreground">{t.modelPrediction}</span>
          <LabelPrediction comment={comment} showReview={false} />
          <CategoryPrediction comment={comment} showReview={false} />
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t.label}</span>
          <Radio.Group
            value={label}
            onChange={(event) => changeLabel(event.target.value as ModerationLabel)}
            optionType="button"
            buttonStyle="solid"
            options={MODERATION_LABELS.map((item) => ({ value: item, label: modelClassName(names, "label", item) }))}
          />
        </div>
        <label className="grid gap-2" htmlFor="review-category">
          <span className="text-sm font-medium">{t.category}</span>
          <Select<CommentCategory>
            id="review-category"
            value={category ?? undefined}
            onChange={setCategory}
            placeholder={t.categoryPlaceholder}
            options={categoryOptions}
            status={category ? undefined : "warning"}
          />
        </label>
        {comment.review && (
          <span className="text-xs text-muted-foreground">
            {format(t.reviewedAt, { time: formatDateTime(comment.review.reviewed_at, locale) })}
          </span>
        )}
      </div>
    </Modal>
  );
}

export function ReviewCommentModal() {
  const comment = useCommentsUiStore((state) => state.reviewComment);
  const closeReview = useCommentsUiStore((state) => state.closeReview);
  if (!comment) return null;
  return <ReviewForm key={comment.id} comment={comment} onDone={closeReview} />;
}
