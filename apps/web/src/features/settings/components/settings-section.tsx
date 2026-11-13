"use client";

import { Card, Typography } from "antd";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsSection({ title, description, children, footer }: SettingsSectionProps) {
  return (
    <Card>
      <header className="mb-5">
        <Typography.Title level={5} className="!mb-1">
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </header>
      {children}
      {footer && <footer className="-mx-6 -mb-6 mt-2 border-t px-6 py-3">{footer}</footer>}
    </Card>
  );
}
