"use client";

import { CommentStatus } from "@acms/shared";
import { Tag } from "antd";
import { useI18n } from "@/i18n";

const STATUS_COLORS: Record<CommentStatus, string> = {
  [CommentStatus.APPROVED]: "success",
  [CommentStatus.PENDING]: "warning",
  [CommentStatus.DISABLED]: "error",
};

export function CommentStatusTag({ status }: { status: CommentStatus }) {
  const { dict } = useI18n();
  return <Tag color={STATUS_COLORS[status]}>{dict.comments.status[status]}</Tag>;
}
