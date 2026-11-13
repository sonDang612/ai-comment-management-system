"use client";

import { type CommentDto, CommentStatus } from "@acms/shared";
import { Alert, Button, Card, Segmented, Table, type TableColumnsType, Typography } from "antd";
import { useMemo } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useComments } from "../api";
import { type CommentStatusFilter, useCommentsUiStore } from "../store";
import { CommentStatusTag } from "./comment-status-tag";

const STATUS_FILTERS: CommentStatusFilter[] = [
  "all",
  CommentStatus.APPROVED,
  CommentStatus.PENDING,
  CommentStatus.DISABLED,
];

export function CommentList() {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  const statusFilter = useCommentsUiStore((state) => state.statusFilter);
  const setStatusFilter = useCommentsUiStore((state) => state.setStatusFilter);
  const { data, error, isPending, isFetching, refetch } = useComments();

  const visibleComments = useMemo(
    () =>
      statusFilter === "all"
        ? (data ?? [])
        : (data ?? []).filter((comment) => comment.status === statusFilter),
    [data, statusFilter],
  );

  const columns: TableColumnsType<CommentDto> = [
    {
      title: t.columns.content,
      dataIndex: "content",
      render: (content: string) => (
        <Typography.Paragraph className="!mb-0 whitespace-pre-wrap break-all">
          {content}
        </Typography.Paragraph>
      ),
    },
    {
      title: t.columns.status,
      dataIndex: "status",
      width: 110,
      render: (status: CommentStatus) => <CommentStatusTag status={status} />,
    },
    {
      title: t.columns.reason,
      dataIndex: "reason",
      width: 240,
      render: (reason: string | null) => reason ?? "-",
    },
    {
      title: t.columns.createdAt,
      dataIndex: "created_at",
      width: 190,
      render: (createdAt: string) => formatDateTime(createdAt, locale),
    },
  ];

  return (
    <Card
      title={t.listTitle}
      extra={
        <Button onClick={() => refetch()} loading={isFetching && !isPending}>
          {t.refresh}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented<CommentStatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS.map((filter) => ({
            value: filter,
            label: filter === "all" ? t.filterAll : t.status[filter],
          }))}
        />
        {error && (
          <Alert
            type="error"
            showIcon
            title={format(t.loadFailed, { message: apiErrorMessage(error, dict) })}
          />
        )}
        <Table<CommentDto>
          rowKey="id"
          columns={columns}
          dataSource={visibleComments}
          loading={isPending}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: t.empty }}
          scroll={{ x: 720 }}
        />
      </div>
    </Card>
  );
}
