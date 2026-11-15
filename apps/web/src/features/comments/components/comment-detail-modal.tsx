"use client";

import type { CommentModelOutput, ModelOutputScore } from "@acms/shared";
import {
  Descriptions,
  type DescriptionsProps,
  Modal,
  Table,
  type TableColumnsType,
  Tabs,
  type TabsProps,
  Typography,
} from "antd";
import { useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/datetime";
import { useCommentsUiStore } from "../store";
import { CategoryPrediction, formatModelValue, headProbability, LabelPrediction, TopLogit } from "./model-output";

const JSON_INDENT = 2;

function RawScores({ output }: { output: CommentModelOutput }) {
  const { dict } = useI18n();
  const t = dict.comments;
  const columns: TableColumnsType<ModelOutputScore> = [
    {
      key: "label",
      title: t.columns.outputLabel,
      render: (_, score) => <code className="text-xs">{score.label}</code>,
    },
    {
      key: "score",
      title: t.columns.logit,
      width: 120,
      align: "right",
      render: (_, score) => <span className="font-mono">{formatModelValue(score.score)}</span>,
    },
    {
      key: "probability",
      title: t.columns.headProbability,
      width: 170,
      align: "right",
      render: (_, score) => {
        const probability = headProbability(output, score.label);
        return <span className="font-mono">{probability === null ? "-" : formatModelValue(probability)}</span>;
      },
    },
  ];

  const tabs: TabsProps["items"] = [
    {
      key: "scores",
      label: t.rawOutput,
      children: (
        <Table<ModelOutputScore>
          rowKey="label"
          size="small"
          bordered
          pagination={false}
          columns={columns}
          dataSource={output.scores}
        />
      ),
    },
    {
      key: "json",
      label: t.rawJson,
      children: (
        <Typography.Paragraph
          copyable={{ text: JSON.stringify(output.scores) }}
          className="!mb-0 flex items-start justify-between gap-2 rounded bg-black/5 p-3 dark:bg-white/10"
        >
          <pre className="!m-0 !bg-transparent !p-0 font-mono text-xs">
            {JSON.stringify(output.scores, null, JSON_INDENT)}
          </pre>
        </Typography.Paragraph>
      ),
    },
  ];

  return <Tabs size="small" items={tabs} />;
}

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
          key: "top_logit",
          label: t.columns.topLogit,
          children: <TopLogit output={comment.model_output} />,
        },
        {
          key: "label_softmax",
          label: t.columns.labelSoftmax,
          children: <LabelPrediction output={comment.model_output} />,
        },
        {
          key: "category_softmax",
          label: t.columns.categorySoftmax,
          children: <CategoryPrediction output={comment.model_output} />,
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
      width={760}
      classNames={{ container: "!flex max-h-[80vh] flex-col", body: "min-h-0 flex-1 overflow-y-auto" }}
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-2">
        <Descriptions column={1} bordered size="small" items={items} />
        {comment?.model_output ? (
          <RawScores output={comment.model_output} />
        ) : (
          <Typography.Text type="secondary">{t.modelNotCalled}</Typography.Text>
        )}
      </div>
    </Modal>
  );
}
