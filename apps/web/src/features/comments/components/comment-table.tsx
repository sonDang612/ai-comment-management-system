"use client";

import { COMMENT_PAGE_SIZES, COMMENT_SEARCH_MAX_LENGTH, type CommentDto } from "@acms/shared";
import { Alert, Button, Input, Select, Skeleton, Table, type TableColumnsType, Typography } from "antd";
import { Eye, Plus, RotateCw, Search } from "lucide-react";
import { type CSSProperties, useRef, useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import { useTableBodyHeight } from "@/lib/use-table-body-height";
import { useComments } from "../api";
import { type CommentValidityFilter, useCommentsUiStore } from "../store";
import { CheckResultTag } from "./check-result-tag";

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_ROW_COUNT = 8;

interface SkeletonRow {
  id: string;
  isSkeleton: true;
}

type CommentRow = CommentDto | SkeletonRow;

const SKELETON_ROWS: SkeletonRow[] = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => ({
  id: `skeleton-${index}`,
  isSkeleton: true,
}));

function isSkeletonRow(row: CommentRow): row is SkeletonRow {
  return "isSkeleton" in row;
}

const textSkeleton = <Skeleton.Input active size="small" block />;
const tagSkeleton = <Skeleton.Button active size="small" />;

const VALIDITY_FILTERS: CommentValidityFilter[] = ["all", "valid", "invalid"];
const CONFIDENCE_FRACTION_DIGITS = 2;

export function CommentTable() {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  const page = useCommentsUiStore((state) => state.page);
  const pageSize = useCommentsUiStore((state) => state.pageSize);
  const validityFilter = useCommentsUiStore((state) => state.validityFilter);
  const setPagination = useCommentsUiStore((state) => state.setPagination);
  const setValidityFilter = useCommentsUiStore((state) => state.setValidityFilter);
  const openCreate = useCommentsUiStore((state) => state.openCreate);
  const openDetail = useCommentsUiStore((state) => state.openDetail);
  const search = useCommentsUiStore((state) => state.search);
  const setSearch = useCommentsUiStore((state) => state.setSearch);
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedCallback((value: string) => setSearch(value.trim()), SEARCH_DEBOUNCE_MS);
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useComments({
    page,
    pageSize,
    isValid: validityFilter === "all" ? undefined : validityFilter === "valid",
    search: search || undefined,
  });
  const isLoadingRows = isPending || isPlaceholderData;
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const tableBodyHeight = useTableBodyHeight(
    tableWrapperRef,
    `${data?.items.length ?? 0}/${data?.total ?? 0}/${Boolean(error)}`,
  );

  const columns: TableColumnsType<CommentRow> = [
    {
      key: "content",
      title: t.columns.content,
      render: (_, row) =>
        isSkeletonRow(row) ? (
          textSkeleton
        ) : (
          <Typography.Paragraph
            className="!mb-0 whitespace-pre-wrap break-all"
            ellipsis={{ rows: 3, expandable: "collapsible" }}
          >
            {row.content}
          </Typography.Paragraph>
        ),
    },
    {
      key: "is_valid",
      title: t.columns.isValid,
      width: 100,
      render: (_, row) =>
        isSkeletonRow(row) ? (
          tagSkeleton
        ) : (
          <CheckResultTag
            value={row.is_valid}
            trueLabel={t.validity.valid}
            falseLabel={t.validity.invalid}
            trueColor="success"
            falseColor="error"
          />
        ),
    },
    {
      key: "confidence",
      title: t.columns.confidence,
      width: 130,
      render: (_, row) =>
        isSkeletonRow(row)
          ? textSkeleton
          : (row.confidence?.toFixed(CONFIDENCE_FRACTION_DIGITS) ?? "-"),
    },
    {
      key: "created_at",
      title: t.columns.createdAt,
      width: 190,
      render: (_, row) => (isSkeletonRow(row) ? textSkeleton : formatDateTime(row.created_at, locale)),
    },
    {
      key: "actions",
      title: t.columns.actions,
      width: 100,
      fixed: "right",
      render: (_, row) =>
        isSkeletonRow(row) ? (
          tagSkeleton
        ) : (
          <Button
            type="link"
            size="small"
            className="!px-0"
            icon={<Eye className="size-4" aria-hidden />}
            onClick={() => openDetail(row)}
          >
            {t.details}
          </Button>
        ),
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
          <Select<CommentValidityFilter>
            value={validityFilter}
            onChange={setValidityFilter}
            aria-label={t.filterLabel}
            className="w-40"
            options={VALIDITY_FILTERS.map((filter) => ({
              value: filter,
              label: filter === "all" ? t.filterAll : t.validity[filter],
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
        <Table<CommentRow>
          rowKey="id"
          columns={columns}
          dataSource={isLoadingRows ? SKELETON_ROWS : (data?.items ?? [])}
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
