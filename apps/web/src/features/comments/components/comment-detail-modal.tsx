"use client";

import type { CommentDto, CommentModelOutput } from "@acms/shared";
import { Modal, Typography } from "antd";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { format, useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/datetime";
import { useCommentsUiStore } from "../store";
import { ModelHeadCard } from "./model-head-card";
import {
  CategoryPrediction,
  checkSource,
  DecisionSourceTag,
  formatPercent,
  isInvalidLabel,
  LabelPrediction,
  labelCategoryDisagree,
  modelClassName,
  modelHeads,
} from "./model-output";

const SECONDS_FRACTION_DIGITS = 2;
const MILLISECONDS_PER_SECOND = 1000;

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[160px_1fr]">
      <dt className="px-4 py-3 text-muted-foreground sm:bg-muted/40">{label}</dt>
      <dd className="!m-0 min-w-0 px-4 py-3">{children}</dd>
    </div>
  );
}

function PredictionChip({
  name,
  code,
  probability,
  tone,
}: {
  name: string;
  code: string;
  probability: number;
  tone: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] ${tone}`} title={code}>
      <b className="font-semibold">{name}</b>
      <span className="font-mono opacity-70">{formatPercent(probability)}</span>
    </span>
  );
}

function RulePrediction({ comment }: { comment: CommentDto }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LabelPrediction comment={comment} showReview={false} />
      <CategoryPrediction comment={comment} showReview={false} />
    </div>
  );
}

function Prediction({ comment }: { comment: CommentDto }) {
  const { dict } = useI18n();
  const output = comment.model_output;
  const source = checkSource(comment);
  if (source === "rule") return <RulePrediction comment={comment} />;
  if (source === "unchecked") return <span className="text-muted-foreground">{dict.comments.unchecked}</span>;
  const names = dict.comments.modelClasses;
  const label = output?.label_probabilities[0];
  const category = output?.category_probabilities[0];
  if (!output || (!label && !category)) return "-";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <PredictionChip
          name={modelClassName(names, "label", label.name)}
          code={label.name}
          probability={label.probability}
          tone={
            isInvalidLabel(label.name)
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }
        />
      )}
      {label && category && <span className="text-muted-foreground">·</span>}
      {category && (
        <PredictionChip
          name={modelClassName(names, "category", category.name)}
          code={category.name}
          probability={category.probability}
          tone="bg-muted text-foreground"
        />
      )}
      {labelCategoryDisagree(output) && (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
          <TriangleAlert className="size-3.5" aria-hidden />
          {dict.comments.modelOutput.disagree}
        </span>
      )}
    </div>
  );
}

function CheckedAt({ comment }: { comment: CommentDto }) {
  const { dict, locale } = useI18n();
  if (!comment.moderated_at) return dict.comments.unchecked;
  const seconds =
    (new Date(comment.moderated_at).getTime() - new Date(comment.created_at).getTime()) / MILLISECONDS_PER_SECOND;
  return (
    <>
      {formatDateTime(comment.moderated_at, locale)}
      <span className="ml-1 text-[12.5px] text-muted-foreground">
        {format(dict.comments.afterSubmit, { seconds: seconds.toFixed(SECONDS_FRACTION_DIGITS) })}
      </span>
    </>
  );
}

function ModelOutputSection({ output }: { output: CommentModelOutput }) {
  const { dict } = useI18n();
  return (
    <section className="mt-6">
      <h3 className="!mb-3 text-sm font-semibold">{dict.comments.modelOutput.tab}</h3>
      <div className="grid gap-3">
        {modelHeads(output).map((head) => (
          <ModelHeadCard key={head.head} head={head} />
        ))}
      </div>
    </section>
  );
}

function CommentDetail({ comment }: { comment: CommentDto }) {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  return (
    <>
      <dl className="!m-0 divide-y divide-border overflow-hidden rounded-lg border border-border">
        <SummaryRow label={t.columns.content}>
          <span className="whitespace-pre-wrap break-all text-[15px]">{comment.content || "-"}</span>
        </SummaryRow>
        <SummaryRow label={t.columns.prediction}>
          <Prediction comment={comment} />
        </SummaryRow>
        <SummaryRow label={t.columns.decidedBy}>
          <DecisionSourceTag comment={comment} />
        </SummaryRow>
        {comment.review && (
          <SummaryRow label={t.columns.review}>
            <div className="flex flex-wrap items-center gap-2">
              <LabelPrediction comment={comment} />
              <CategoryPrediction comment={comment} />
              <span className="text-xs text-muted-foreground">
                {format(t.review.reviewedAt, { time: formatDateTime(comment.review.reviewed_at, locale) })}
              </span>
            </div>
          </SummaryRow>
        )}
        <SummaryRow label={t.columns.reason}>
          <span className="whitespace-pre-wrap break-all">{comment.reason ?? "-"}</span>
        </SummaryRow>
        <SummaryRow label={t.columns.checkedAt}>
          <CheckedAt comment={comment} />
        </SummaryRow>
        <SummaryRow label={t.columns.id}>
          <Typography.Text copyable className="font-mono text-[13px]">
            {comment.id}
          </Typography.Text>
        </SummaryRow>
      </dl>
      {comment.model_output ? (
        <ModelOutputSection output={comment.model_output} />
      ) : (
        <Typography.Paragraph type="secondary" className="!mb-0 !mt-6">
          {t.modelNotCalled}
        </Typography.Paragraph>
      )}
    </>
  );
}

export function CommentDetailModal() {
  const { dict } = useI18n();
  const comment = useCommentsUiStore((state) => state.detailComment);
  const closeDetail = useCommentsUiStore((state) => state.closeDetail);

  return (
    <Modal
      title={dict.comments.detailTitle}
      open={comment !== null}
      onCancel={closeDetail}
      footer={null}
      width={768}
      classNames={{ container: "!flex max-h-[80vh] flex-col", body: "min-h-0 flex-1 overflow-y-auto pt-3" }}
      destroyOnHidden
    >
      {comment && <CommentDetail comment={comment} />}
    </Modal>
  );
}
