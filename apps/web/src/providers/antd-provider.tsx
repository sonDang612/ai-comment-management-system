"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import type { ReactNode } from "react";
import { type Locale, useI18n } from "@/i18n";
import { useTheme } from "./theme-provider";

const ANTD_LOCALES = {
  "zh-CN": zhCN,
  en: enUS,
} satisfies Record<Locale, typeof zhCN>;

export function AntdProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const scheme = useTheme((state) => state.scheme);
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={ANTD_LOCALES[locale]}
        theme={{
          algorithm: scheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          cssVar: { key: `acms-${scheme}` },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
