"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import type { ReactNode } from "react";
import { type Locale, useI18n } from "@/i18n";

const ANTD_LOCALES = {
  "zh-CN": zhCN,
  en: enUS,
} satisfies Record<Locale, typeof zhCN>;

export function AntdProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <AntdRegistry>
      <ConfigProvider locale={ANTD_LOCALES[locale]}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
