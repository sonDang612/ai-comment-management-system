"use client";

import {
  COMMENT_PAGE_SIZES,
  COMMENT_SEARCH_MAX_LENGTH,
  type CommentDto,
  DECISION_SOURCES,
  type DecisionSource,
} from "@acms/shared";
import { Alert, Button, Input, Select, Skeleton, Table, type TableColumnsType, Typography } from "antd";
import type { SortOrder } from "antd/es/table/interface";
import { Eye, PencilLine, Plus, RotateCw, Search } from "lucide-react";
import { type CSSProperties, useRef, useState } from "react";
import { format, useI18n } from "@/i18n";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import { useTableBodyHeight } from "@/lib/use-table-body-height";
import { useComments } from "../api";
import { useCommentsUiStore } from "../store";
import { CategoryPrediction, DecisionSourceTag, LabelPrediction } from "./model-output";

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_ROW_COUNT = 8;
const SORT_DIRECTIONS: SortOrder[] = ["descend", "ascend", "descend"];

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

export function CommentTable() {
  const { dict, locale } = useI18n();
  const t = dict.comments;
  const page = useCommentsUiStore((state) => state.page);
  const pageSize = useCommentsUiStore((state) => state.pageSize);
  const setPagination = useCommentsUiStore((state) => state.setPagination);
  const openCreate = useCommentsUiStore((state) => state.openCreate);
  const openDetail = useCommentsUiStore((state) => state.openDetail);
  const openReview = useCommentsUiStore((state) => state.openReview);
  const search = useCommentsUiStore((state) => state.search);
  const setSearch = useCommentsUiStore((state) => state.setSearch);
  const order = useCommentsUiStore((state) => state.order);
  const setOrder = useCommentsUiStore((state) => state.setOrder);
  const decidedBy = useCommentsUiStore((state) => state.decidedBy);
  const setDecidedBy = useCommentsUiStore((state) => state.setDecidedBy);
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedCallback((value: string) => setSearch(value.trim()), SEARCH_DEBOUNCE_MS);
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useComments({
    page,
    pageSize,
    search: search || undefined,
    order,
    decidedBy: decidedBy ?? undefined,
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
      width: 320,
      fixed: "left",
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
      key: "label",
      title: t.columns.label,
      width: 170,
      render: (_, row) => (isSkeletonRow(row) ? tagSkeleton : <LabelPrediction comment={row} />),
    },
    {
      key: "category",
      title: t.columns.category,
      width: 210,
      render: (_, row) => (isSkeletonRow(row) ? tagSkeleton : <CategoryPrediction comment={row} />),
    },
    {
      key: "decided_by",
      title: t.columns.decidedBy,
      width: 110,
      render: (_, row) => (isSkeletonRow(row) ? tagSkeleton : <DecisionSourceTag comment={row} />),
    },
    {
      key: "created_at",
      title: t.columns.createdAt,
      width: 190,
      sorter: true,
      sortOrder: order === "asc" ? "ascend" : "descend",
      sortDirections: SORT_DIRECTIONS,
      render: (_, row) => (isSkeletonRow(row) ? textSkeleton : formatDateTime(row.created_at, locale)),
    },
    {
      key: "actions",
      title: t.columns.actions,
      width: 120,
      fixed: "right",
      render: (_, row) =>
        isSkeletonRow(row) ? (
          tagSkeleton
        ) : (
          <div className="flex flex-col items-start">
            <Button
              type="link"
              size="small"
              className="!px-0"
              icon={<Eye className="size-4" aria-hidden />}
              onClick={() => openDetail(row)}
            >
              {t.details}
            </Button>
            <Button
              type="link"
              size="small"
              className="!px-0"
              icon={<PencilLine className="size-4" aria-hidden />}
              onClick={() => openReview(row)}
            >
              {t.review.action}
            </Button>
          </div>
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
          <Select<DecisionSource>
            allowClear
            value={decidedBy ?? undefined}
            onChange={(value) => setDecidedBy(value ?? null)}
            placeholder={t.decidedByPlaceholder}
            aria-label={t.columns.decidedBy}
            options={DECISION_SOURCES.map((source) => ({ value: source, label: t.decisionSources[source] ?? source }))}
            className="!w-48"
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
          scroll={{ x: 1120, y: tableBodyHeight }}
          onChange={(_, __, sorter, extra) => {
            if (extra.action !== "sort" || Array.isArray(sorter)) return;
            setOrder(sorter.order === "ascend" ? "asc" : "desc");
          }}
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
