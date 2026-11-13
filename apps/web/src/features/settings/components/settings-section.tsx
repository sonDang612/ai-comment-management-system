"use client";

import { Card, Typography } from "antd";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card>
      <header className="mb-5">
        <Typography.Title level={5} className="!mb-1">
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </header>
      {children}
    </Card>
  );
}
