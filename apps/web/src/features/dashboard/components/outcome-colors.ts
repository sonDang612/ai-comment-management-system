import type { CommentOutcome } from "@acms/shared";

export const OUTCOME_COLORS: Record<CommentOutcome, string> = {
  valid: "var(--viz-series-1)",
  invalid: "var(--viz-series-2)",
  rule_blocked: "var(--viz-series-3)",
  no_result: "var(--viz-series-4)",
  unchecked: "var(--viz-neutral)",
};

export const CATEGORY_COLOR = "var(--viz-series-1)";
