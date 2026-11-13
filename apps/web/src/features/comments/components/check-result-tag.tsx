"use client";

import { Tag } from "antd";

interface CheckResultTagProps {
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  trueColor: string;
  falseColor: string;
}

export function CheckResultTag({ value, trueLabel, falseLabel, trueColor, falseColor }: CheckResultTagProps) {
  if (value === null) return "-";
  return <Tag color={value ? trueColor : falseColor}>{value ? trueLabel : falseLabel}</Tag>;
}
