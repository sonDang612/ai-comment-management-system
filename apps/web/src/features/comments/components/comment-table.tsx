"use client";

import {
  COMMENT_PAGE_SIZES,
  COMMENT_SEARCH_MAX_LENGTH,
  type CommentDto,
  CommentStatus,
} from "@acms/shared";
import { Alert, Button, Input, Select, Table, type TableColumnsType, Typography } from "antd";
import { Plus, RotateCw, Search } from "lucide-react";
import { type CSSProperties, useRef, useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import { useTableBodyHeight } from "@/lib/use-table-body-height";
import { useComments } from "../api";
import { type CommentStatusFilter, useCommentsUiStore } from "../store";
import { CommentStatusTag } from "./comment-status-tag";

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_FILTERS: CommentStatusFilter[] = [
  "all",
  CommentStatus.APPROVED,
  CommentStatus.PENDING,
  CommentStatus.DISABLED,
];

export function CommentTable() {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  const page = useCommentsUiStore((state) => state.page);
  const pageSize = useCommentsUiStore((state) => state.pageSize);
  const statusFilter = useCommentsUiStore((state) => state.statusFilter);
  const setPagination = useCommentsUiStore((state) => state.setPagination);
  const setStatusFilter = useCommentsUiStore((state) => state.setStatusFilter);
  const openCreate = useCommentsUiStore((state) => state.openCreate);
  const search = useCommentsUiStore((state) => state.search);
  const setSearch = useCommentsUiStore((state) => state.setSearch);
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedCallback((value: string) => setSearch(value.trim()), SEARCH_DEBOUNCE_MS);
  const { data, error, isPending, isFetching, refetch } = useComments({
    page,
    pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const tableBodyHeight = useTableBodyHeight(
    tableWrapperRef,
    `${data?.items.length ?? 0}/${data?.total ?? 0}/${Boolean(error)}`,
  );

  const columns: TableColumnsType<CommentDto> = [
    {
      title: t.columns.content,
      dataIndex: "content",
      render: (content: string) => (
        <Typography.Paragraph
          className="!mb-0 whitespace-pre-wrap break-all"
          ellipsis={{ rows: 3, expandable: "collapsible" }}
        >
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
      width: 260,
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            allowClear
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              if (value === "") debouncedSearch.flush(value);
              else debouncedSearch.schedule(value);
            }}
            onPressEnter={() => debouncedSearch.flush(searchInput)}
            prefix={<Search className="size-4 text-muted-foreground" aria-hidden />}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            maxLength={COMMENT_SEARCH_MAX_LENGTH}
            className="!w-64"
          />
          <Select<CommentStatusFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            aria-label={t.filterLabel}
            className="w-40"
            options={STATUS_FILTERS.map((filter) => ({
              value: filter,
              label: filter === "all" ? t.filterAll : t.status[filter],
            }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={<RotateCw className="size-4" aria-hidden />}
            onClick={() => refetch()}
            loading={isFetching && !isPending}
          >
            {t.refresh}
          </Button>
          <Button type="primary" icon={<Plus className="size-4" aria-hidden />} onClick={openCreate}>
            {t.create}
          </Button>
        </div>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          title={format(t.loadFailed, { message: apiErrorMessage(error, dict) })}
        />
      )}
      <div
        ref={tableWrapperRef}
        className="min-h-80 flex-1 overflow-hidden [&_.ant-table-body]:h-[var(--table-body-height)] [&_.ant-table-placeholder>td]:h-[calc(var(--table-body-height)-1px)]"
        style={
          tableBodyHeight === undefined
            ? undefined
            : ({ "--table-body-height": `${tableBodyHeight}px` } as CSSProperties)
        }
      >
        <Table<CommentDto>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          locale={{ emptyText: t.empty }}
          scroll={{ x: 800, y: tableBodyHeight }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            pageSizeOptions: COMMENT_PAGE_SIZES.map(String),
            showSizeChanger: true,
            showTotal: (total) => format(t.total, { total: String(total) }),
            onChange: setPagination,
          }}
        />
      </div>
    </div>
  );
}
