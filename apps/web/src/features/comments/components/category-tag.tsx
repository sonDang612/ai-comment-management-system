"use client";

import type { CommentCategory } from "@acms/shared";
import { Tag } from "antd";
import { useI18n } from "@/i18n";

const CATEGORY_COLORS: Record<CommentCategory, string> = {
  statement: "default",
  question: "processing",
  off_topic: "default",
  toxic: "error",
  sexual: "error",
  spam: "warning",
  gibberish: "warning",
  advertisement: "warning",
  scam: "error",
  privacy: "warning",
  illegal: "error",
  political: "error",
};

export function CategoryTag({ category }: { category: CommentCategory | null }) {
  const { dict } = useI18n();
  if (category === null) return "-";
  return <Tag color={CATEGORY_COLORS[category]}>{dict.comments.categories[category]}</Tag>;
}
