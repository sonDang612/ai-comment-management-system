"use client";

import { Button, Input, Space, Typography } from "antd";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { format, useI18n } from "@/i18n";

export interface StringListProps {
  id?: string;
  value?: string[];
  onChange?: (items: string[]) => void;
  normalize: (input: string) => string;
  findError: (item: string, items: string[]) => string | null;
  placeholder: string;
  emptyText: string;
  maxLength: number;
  monospace?: boolean;
}

export function StringList({
  id,
  value = [],
  onChange,
  normalize,
  findError,
  placeholder,
  emptyText,
  maxLength,
  monospace = false,
}: StringListProps) {
  const { dict } = useI18n();
  const t = dict.settings.list;
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    const item = normalize(input);
    if (item === "") return;
    const itemError = findError(item, value);
    setError(itemError);
    if (itemError) return;
    onChange?.([...value, item]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Space.Compact className="w-full">
        <Input
          id={id}
          value={input}
          status={error ? "error" : undefined}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          onPressEnter={(event) => {
            event.preventDefault();
            addItem();
          }}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        <Button icon={<Plus className="size-4" aria-hidden />} onClick={addItem}>
          {t.add}
        </Button>
      </Space.Compact>
      {error && (
        <Typography.Text type="danger" className="text-sm" role="alert">
          {error}
        </Typography.Text>
      )}
      {value.length === 0 ? (
        <Typography.Text
          type="secondary"
          className="block rounded-md border border-dashed px-3 py-4 text-center text-sm"
        >
          {emptyText}
        </Typography.Text>
      ) : (
        <ul className="max-h-60 divide-y overflow-auto rounded-md border">
          {value.map((item) => (
            <li key={item} className="flex items-center justify-between gap-2 py-1 ps-3 pe-1">
              <span className={monospace ? "min-w-0 truncate font-mono text-sm" : "min-w-0 truncate text-sm"} title={item}>
                {item}
              </span>
              <Button
                type="text"
                size="small"
                icon={<X className="size-4" aria-hidden />}
                aria-label={format(t.removeLabel, { item })}
                title={t.remove}
                onClick={() => onChange?.(value.filter((existing) => existing !== item))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
