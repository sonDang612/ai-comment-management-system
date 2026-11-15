"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import type { ReactNode } from "react";
import { type Locale, useI18n } from "@/i18n";
import { useTheme } from "./theme-provider";

const ANTD_LOCALES = {
  "zh-CN": zhCN,
  en: enUS,
} satisfies Record<Locale, typeof zhCN>;

const DAYJS_LOCALES = {
  "zh-CN": "zh-cn",
  en: "en",
} satisfies Record<Locale, string>;

const SIZE_TOKENS = {
  fontSize: 13,
  controlHeight: 30,
};

export function AntdProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const scheme = useTheme((state) => state.scheme);
  dayjs.locale(DAYJS_LOCALES[locale]);
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={ANTD_LOCALES[locale]}
        theme={{
          algorithm: scheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          cssVar: { key: `acms-${scheme}` },
          token: SIZE_TOKENS,
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
