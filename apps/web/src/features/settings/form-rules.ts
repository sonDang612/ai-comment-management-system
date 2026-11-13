import type { FormRule } from "antd";
import { type Dictionary, format } from "@/i18n";

export function integerRangeRules(dict: Dictionary, range: { min: number; max: number }): FormRule[] {
  const errors = dict.settings.errors;
  return [
    { required: true, message: errors.required },
    { type: "integer", min: range.min, max: range.max, message: format(errors.integerRange, range) },
  ];
}
